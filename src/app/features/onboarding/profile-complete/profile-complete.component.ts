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
    :host { display: block; }
    .pc-bg {
      min-height: 100dvh;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
    }
    .pc-wrap {
      width: 100%;
      max-width: 30rem;
      animation: ed-fade-up 640ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .pc-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 1.25rem;
    }
    .pc-tick {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-3);
      letter-spacing: 0.05em;
    }
    .pc-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ink);
    }
    .pc-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(2rem, 4.5vw, 2.75rem);
      line-height: 1.02;
      letter-spacing: -0.025em;
      color: var(--color-ink);
      margin: 0 0 0.875rem;
      
    }
    .pc-title em { font-style: normal; }
    .pc-subtitle {
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--color-ink-2);
      margin: 0 0 2.5rem;
      max-width: 36ch;
    }
    .pc-card {
      background: var(--color-surface);
      border: 1px solid var(--color-rule-bold);
      padding: 2rem;
    }
    .pc-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .pc-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 480px) {
      .pc-row { grid-template-columns: 1fr; }
    }
    .pc-submit {
      width: 100%;
      justify-content: center;
      padding: 0.875rem 1.25rem;
      margin-top: 0.5rem;
    }
  `],
  template: `
    <div class="pc-bg">
      <div class="pc-wrap">

        <div class="pc-eyebrow">
          <span class="pc-tick">01 / Bienvenida</span>
          <span class="pc-label">Perfil</span>
        </div>

        <h1 class="pc-title">¿Cómo te <em>llamas</em>?</h1>
        <p class="pc-subtitle">Solo necesitamos tu nombre y apellido para personalizar tu experiencia. Toma un momento.</p>

        <div class="pc-card">
          <form [formGroup]="form" (ngSubmit)="submit()" class="pc-form">

            <div class="pc-row">
              <div class="field-group">
                <label class="field-label">Nombre</label>
                <input type="text" formControlName="firstName" placeholder="Juan" class="field-input" autocomplete="given-name" />
                @if (form.get('firstName')?.invalid && form.get('firstName')?.touched) {
                  <p class="field-error">Requerido.</p>
                }
              </div>

              <div class="field-group">
                <label class="field-label">Apellido</label>
                <input type="text" formControlName="lastName" placeholder="Pérez" class="field-input" autocomplete="family-name" />
                @if (form.get('lastName')?.invalid && form.get('lastName')?.touched) {
                  <p class="field-error">Requerido.</p>
                }
              </div>
            </div>

            @if (svc.state().errorMessage) {
              <div class="error-banner">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square">
                  <line x1="12" y1="8" x2="12" y2="14"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>{{ svc.state().errorMessage }}</span>
              </div>
            }

            <button type="submit"
              [disabled]="svc.state().isLoading"
              class="btn-primary pc-submit">
              @if (svc.state().isLoading) {
                <span class="loading-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff; width: 12px; height: 12px;"></span>
                Guardando…
              } @else {
                Continuar
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="13 6 19 12 13 18"/>
                </svg>
              }
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
        void this.router.navigate(['/home']);
      }
    }
  }
}
