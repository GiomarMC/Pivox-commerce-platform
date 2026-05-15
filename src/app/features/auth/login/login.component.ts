import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly state = this.auth.state;

  username = '';
  password = '';

  async onSubmit(): Promise<void> {
    if (!this.username.trim() || !this.password.trim()) return;
    await this.auth.login(this.username.trim(), this.password.trim());
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }
}
