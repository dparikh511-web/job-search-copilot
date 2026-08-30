import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  username = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    if (!this.username || !this.password) {
      this.error.set('Enter both a username and password');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.username, this.password).subscribe((success) => {
      this.loading.set(false);
      if (success) {
        this.router.navigateByUrl('/');
      } else {
        this.error.set('Incorrect username or password');
      }
    });
  }
}
