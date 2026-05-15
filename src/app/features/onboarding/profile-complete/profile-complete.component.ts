import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingService } from '../onboarding.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-profile-complete',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    .pc-wrap { min-height:100dvh; display:flex; align-items:center; justify-content:center; background:#F2F4FA; padding:1rem; }
    .pc-box { width:100%; max-width:400px; }
  `],
  template: `
    <div class="pc-wrap">
      <div class="pc-box">
        <div style="text-align:center;margin-bottom:1.75rem">
          <div style="width:44px;height:44px;background:#1F2A7C;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style="font-size:1.3rem;font-weight:800;color:#111827;margin:0 0 0.25rem;letter-spacing:-0.02em">Completa tu perfil</h1>
          <p style="font-size:0.8rem;color:#9CA3AF;margin:0">Ingresa tu nombre para continuar</p>
        </div>

        <div class="card" style="padding:1.5rem">
          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:0.875rem">
            <div class="field-group">
              <label class="field-label">Nombre</label>
              <input type="text" formControlName="firstName" placeholder="Juan" class="field-input" />
              @if (form.get('firstName')?.invalid && form.get('firstName')?.touched) {
                <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">Requerido</p>
              }
            </div>

            <div class="field-group">
              <label class="field-label">Apellido</label>
              <input type="text" formControlName="lastName" placeholder="Pérez" class="field-input" />
              @if (form.get('lastName')?.invalid && form.get('lastName')?.touched) {
                <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">Requerido</p>
              }
            </div>

            @if (svc.state().errorMessage) {
              <div class="error-banner">{{ svc.state().errorMessage }}</div>
            }

            <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary w-full">
              {{ svc.state().isLoading ? 'Guardando...' : 'Continuar' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
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
        void this.router.navigate(['/tienda']);
      }
    }
  }
}
