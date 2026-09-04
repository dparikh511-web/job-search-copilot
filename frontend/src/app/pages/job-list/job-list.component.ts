import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Job, Profile } from '../../models/types';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.scss',
})
export class JobListComponent implements OnInit {
  jobs = signal<Job[]>([]);
  profiles = signal<Profile[]>([]);
  loading = signal(true);
  statusFilter = '';
  dateFilter = '';

  runProfileLabel = '';
  runKeywords = 'Software Engineer';
  runLocation = 'New York, United States';
  runLimit = 5;
  running = signal(false);
  runResultMessage = signal('');

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.statusFilter = params.get('status') ?? '';
      this.dateFilter = params.get('date') ?? '';
      this.loadJobs();
    });
    this.api.getProfiles().subscribe((profiles) => {
      this.profiles.set(profiles);
      if (profiles.length > 0) this.runProfileLabel = profiles[0].profile_label;
    });
  }

  loadJobs(): void {
    this.loading.set(true);
    this.api.getJobs(this.statusFilter || undefined, this.dateFilter || undefined).subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFilterChange(): void {
    // Filters live in the URL's query params (not just component state) so they
    // survive navigating to a job's detail page and back.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: this.statusFilter || null, date: this.dateFilter || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.dateFilter = '';
    this.onFilterChange();
  }

  scorePercent(score: number | null): string {
    return score === null ? '-' : `${Math.round(score * 100)}%`;
  }

  runDigestNow(): void {
    this.running.set(true);
    this.runResultMessage.set('');
    this.api.runDigest(this.runProfileLabel, this.runKeywords, this.runLocation, this.runLimit).subscribe({
      next: (summary) => {
        this.running.set(false);
        this.runResultMessage.set(
          `Scraped ${summary.scraped}, matched ${summary.matched}, rejected ${summary.rejected}, already done ${summary.alreadyProcessed}, failed ${summary.failed}`
        );
        this.loadJobs();
      },
      error: (err) => {
        this.running.set(false);
        this.runResultMessage.set(`Error: ${err?.error?.error ?? err.message}`);
      },
    });
  }
}
