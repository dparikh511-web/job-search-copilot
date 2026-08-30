import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Job, Application } from '../../models/types';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.scss',
})
export class JobDetailComponent implements OnInit {
  job = signal<Job | null>(null);
  application = signal<Application | null>(null);
  loading = signal(true);

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getJob(id).subscribe((job) => this.job.set(job));
    this.api.getApplicationsForJob(id).subscribe((apps) => {
      this.application.set(apps[0] ?? null);
      this.loading.set(false);
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

  markApplied(): void {
    const job = this.job();
    if (!job) return;
    this.api.updateJobStatus(job.id, 'applied').subscribe((updated) => this.job.set(updated));
  }
}
