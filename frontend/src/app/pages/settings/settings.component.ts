import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ApplicationAnswers, Profile } from '../../models/types';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  profiles = signal<Profile[]>([]);
  selectedProfileId: number | null = null;
  answers: ApplicationAnswers = {};
  loading = signal(true);
  saving = signal(false);
  saveMessage = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getProfiles().subscribe((profiles) => {
      this.profiles.set(profiles);
      if (profiles.length > 0) this.selectProfile(profiles[0].id);
      this.loading.set(false);
    });
  }

  selectProfile(profileId: number): void {
    this.selectedProfileId = profileId;
    const profile = this.profiles().find((p) => p.id === profileId);
    this.answers = { ...(profile?.application_answers ?? {}) };
    this.saveMessage.set('');
  }

  save(): void {
    if (this.selectedProfileId === null) return;
    this.saving.set(true);
    this.saveMessage.set('');
    this.api.updateApplicationAnswers(this.selectedProfileId, this.answers).subscribe({
      next: (updated) => {
        this.profiles.update((profiles) => profiles.map((p) => (p.id === updated.id ? updated : p)));
        this.saving.set(false);
        this.saveMessage.set('Saved.');
      },
      error: (err) => {
        this.saving.set(false);
        this.saveMessage.set(`Error: ${err?.error?.error ?? err.message}`);
      },
    });
  }
}
