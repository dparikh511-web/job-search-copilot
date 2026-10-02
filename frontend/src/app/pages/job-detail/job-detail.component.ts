import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Job, Application, ApplicationAnswers } from '../../models/types';

interface QuickFillEntry {
  label: string;
  value: string;
}

const ANSWER_LABELS: Record<keyof ApplicationAnswers, string> = {
  phone: 'Phone',
  linkedinUrl: 'LinkedIn URL',
  portfolioUrl: 'Portfolio / GitHub URL',
  workAuthorization: 'Work authorization',
  yearsOfExperience: 'Years of experience',
  willingToRelocate: 'Willing to relocate',
  desiredSalary: 'Desired salary',
  earliestStartDate: 'Earliest start date',
  noticePeriod: 'Notice period',
};

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.scss',
})
export class JobDetailComponent implements OnInit {
  job = signal<Job | null>(null);
  application = signal<Application | null>(null);
  quickFillEntries = signal<QuickFillEntry[]>([]);
  copiedField = signal<string | null>(null);
  loading = signal(true);

  constructor(private route: ActivatedRoute, private api: ApiService, private location: Location) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getJob(id).subscribe((job) => this.job.set(job));
    this.api.getApplicationsForJob(id).subscribe((apps) => {
      const app = apps[0] ?? null;
      this.application.set(app);
      this.loading.set(false);

      if (app) {
        this.api.getProfile(app.profile_id).subscribe((profile) => {
          const answers = profile.application_answers ?? {};
          const entries = (Object.keys(ANSWER_LABELS) as (keyof ApplicationAnswers)[])
            .filter((key) => answers[key])
            .map((key) => ({ label: ANSWER_LABELS[key], value: answers[key] as string }));
          this.quickFillEntries.set(entries);
        });
      }
    });
  }

  copyToClipboard(entry: QuickFillEntry): void {
    const showCopied = () => {
      this.copiedField.set(entry.label);
      setTimeout(() => {
        if (this.copiedField() === entry.label) this.copiedField.set(null);
      }, 1500);
    };

    navigator.clipboard.writeText(entry.value).then(showCopied, () => {
      // Clipboard API can be denied (older Safari, some embedded/automation contexts,
      // non-secure origins) -- fall back to the classic hidden-textarea copy trick.
      const textarea = document.createElement('textarea');
      textarea.value = entry.value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showCopied();
      } catch {
        this.copiedField.set(null);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  pdfUrl(): string {
    const app = this.application();
    return app ? this.api.getPdfUrl(app.id) : '';
  }

  docxUrl(): string {
    const app = this.application();
    return app ? this.api.getDocxUrl(app.id) : '';
  }

  coverLetterPdfUrl(): string {
    const app = this.application();
    return app ? this.api.getCoverLetterPdfUrl(app.id) : '';
  }

  markApplied(): void {
    const job = this.job();
    if (!job) return;
    this.api.updateJobStatus(job.id, 'applied').subscribe((updated) => this.job.set(updated));
  }

  markNotAvailable(): void {
    const job = this.job();
    if (!job) return;
    // "Not available" removes it from the default (digested) list view rather than
    // deleting the row outright, so it's reversible via the status filter if needed.
    this.api.updateJobStatus(job.id, 'not_available').subscribe(() => this.goBack());
  }

  goBack(): void {
    // Uses browser history instead of routerLink="/" so whatever filters were
    // applied on the job list (stored in its URL query params) are preserved.
    this.location.back();
  }
}
