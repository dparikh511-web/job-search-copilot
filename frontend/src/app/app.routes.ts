import { Routes } from '@angular/router';
import { JobListComponent } from './pages/job-list/job-list.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: JobListComponent, canActivate: [authGuard] },
  { path: 'job/:id', component: JobDetailComponent, canActivate: [authGuard] },
];
