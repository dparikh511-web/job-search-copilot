import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Job, Application, Profile, DigestRunSummary } from '../models/types';
import { environment } from '../../environments/environment';

const BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${BASE_URL}/profile`);
  }

  getJobs(status?: string): Observable<Job[]> {
    const url = status ? `${BASE_URL}/jobs?status=${status}` : `${BASE_URL}/jobs`;
    return this.http.get<Job[]>(url);
  }

  getJob(id: number): Observable<Job> {
    return this.http.get<Job>(`${BASE_URL}/jobs/${id}`);
  }

  getApplicationsForJob(jobId: number): Observable<Application[]> {
    return this.http.get<Application[]>(`${BASE_URL}/applications?jobId=${jobId}`);
  }

  getPdfUrl(applicationId: number): string {
    return `${BASE_URL}/applications/${applicationId}/pdf`;
  }

  getDocxUrl(applicationId: number): string {
    return `${BASE_URL}/applications/${applicationId}/docx`;
  }

  runDigest(profileLabel: string, keywords: string, location: string, limit = 5): Observable<DigestRunSummary> {
    return this.http.post<DigestRunSummary>(`${BASE_URL}/digest/run`, {
      profileLabel,
      keywords,
      location,
      limit,
    });
  }

  updateJobStatus(jobId: number, status: string): Observable<Job> {
    return this.http.patch<Job>(`${BASE_URL}/jobs/${jobId}/status`, { status });
  }
}
