import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingService } from '../onboarding.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-profile-complete',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-complete.component.html',
  styleUrl: './profile-complete.component.css',
})
export class ProfileCompleteComponent implements OnInit {
  readonly svc = inject(OnboardingService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
  });

  ngOnInit(): void {
    const user = this.auth.userMe();
    if (user) {
      this.form.patchValue({ firstName: user.firstName, lastName: user.lastName });
    }
    this.svc.clearMessages();
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const ok = await this.svc.completarPerfil(
      this.form.value['firstName']!,
      this.form.value['lastName']!,
    );

    if (ok) {
      if (this.auth.isDueno()) {
        void this.router.navigate(['/setup']);
      } else {
        void this.router.navigate(['/home']);
      }
    }
  }
}
