import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'jobcopilot_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  getAuthHeader(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  isLoggedIn(): boolean {
    return this.getAuthHeader() !== null;
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  login(username: string, password: string): Observable<boolean> {
    const header = 'Basic ' + btoa(`${username}:${password}`);
    return this.http
      .get(`${environment.apiBaseUrl}/profile`, { headers: { Authorization: header } })
      .pipe(
        tap(() => sessionStorage.setItem(STORAGE_KEY, header)),
        map(() => true),
        catchError(() => of(false))
      );
  }
}
