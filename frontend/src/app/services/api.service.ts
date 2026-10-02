import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Job, Application, Profile, DigestRunSummary, ApplicationAnswers } from '../models/types';
import { environment } from '../../environments/environment';

const BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${BASE_URL}/profile`);
  }

  getProfile(id: number): Observable<Profile> {
    return this.http.get<Profile>(`${BASE_URL}/profile/${id}`);
  }

  updateApplicationAnswers(profileId: number, answers: ApplicationAnswers): Observable<Profile> {
    return this.http.patch<Profile>(`${BASE_URL}/profile/${profileId}/application-answers`, answers);
  }

  getJobs(status?: string, dateFrom?: string, dateTo?: string): Observable<Job[]> {
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (dateFrom) params.push(`dateFrom=${dateFrom}`);
    if (dateTo) params.push(`dateTo=${dateTo}`);
    const url = params.length > 0 ? `${BASE_URL}/jobs?${params.join('&')}` : `${BASE_URL}/jobs`;
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

  getCoverLetterPdfUrl(applicationId: number): string {
    return `${BASE_URL}/applications/${applicationId}/coverletter/pdf`;
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
