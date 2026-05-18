import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvitationService } from '../../invitation.service';

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  const ok =
    v.length >= 8 &&
    /[A-Z]/.test(v) &&
    /[a-z]/.test(v) &&
    /[0-9]/.test(v) &&
    /[^A-Za-z0-9]/.test(v);
  return ok ? null : { passwordStrength: true };
}

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-invitation-accept',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    :host { display: block; }
    .ia-bg {
      min-height: 100dvh;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
    }
    .ia-wrap {
      width: 100%;
      max-width: 30rem;
      animation: ed-fade-up 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .ia-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 1.25rem;
    }
    .ia-tick {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-3);
      letter-spacing: 0.05em;
    }
    .ia-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ink);
    }
    .ia-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(2rem, 4.5vw, 2.75rem);
      line-height: 1.02;
      letter-spacing: -0.025em;
      color: var(--color-ink);
      margin: 0 0 0.625rem;
      
    }
    .ia-title em { font-style: normal; }
    .ia-sub {
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--color-ink-2);
      margin: 0 0 2rem;
      max-width: 36ch;
    }

    .ia-card {
      background: var(--color-surface);
      border: 1px solid var(--color-rule-bold);
      padding: 2rem;
    }
    .ia-form { display: flex; flex-direction: column; gap: 1.25rem; }

    .ia-fields-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 480px) {
      .ia-fields-row { grid-template-columns: 1fr; }
    }

    /* Requisitos password */
    .ia-req-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.875rem 0 0;
      margin: 0;
      list-style: none;
    }
    .ia-req {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--color-ink-3);
      transition: color 200ms;
    }
    .ia-req.is-ok { color: var(--color-success); }
    .ia-req-mark {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0;
      width: 1rem;
      text-align: center;
    }

    .ia-submit {
      width: 100%;
      justify-content: center;
      padding: 0.875rem 1.25rem;
      margin-top: 0.5rem;
    }

    /* Success state */
    .ia-success-card {
      background: var(--color-surface);
      border: 1px solid var(--color-success);
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .ia-success-icon {
      width: 56px;
      height: 56px;
      border: 1.5px solid var(--color-success);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
      color: var(--color-success);
    }
    .ia-success-title {
      font-family: var(--font-display);
      font-style: normal;
      font-weight: 500;
      font-size: 1.75rem;
      color: var(--color-ink);
      margin: 0 0 0.875rem;
      letter-spacing: -0.015em;
    }
    .ia-success-text {
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--color-ink-2);
      margin: 0 0 2rem;
      max-width: 30ch;
      margin-left: auto;
      margin-right: auto;
    }

    /* Error state — no token */
    .ia-error-card {
      background: var(--color-surface);
      border: 1px solid var(--color-error);
      padding: 1.5rem;
      text-align: center;
    }
    .ia-error-icon {
      width: 44px;
      height: 44px;
      border: 1.5px solid var(--color-error);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      color: var(--color-error);
    }
    .ia-error-text {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--color-ink);
      margin: 0;
    }
  `],
  template: `
    <div class="ia-bg">
      <div class="ia-wrap">

        <div class="ia-eyebrow">
          <span class="ia-tick">01 / Invitación</span>
          <span class="ia-label">Pivox</span>
        </div>

        @if (!token()) {
          <h1 class="ia-title">Enlace <em>inválido</em>.</h1>
          <p class="ia-sub">Este enlace de invitación ha expirado o no es válido.</p>

          <div class="ia-error-card">
            <div class="ia-error-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square">
                <line x1="12" y1="8" x2="12" y2="14"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p class="ia-error-text">Pide al administrador de tu empresa que te genere un nuevo enlace.</p>
          </div>
        } @else if (svc.state().status === 'success') {
          <h1 class="ia-title"><em>¡Listo!</em></h1>
          <p class="ia-sub">Tu cuenta ha sido activada correctamente.</p>

          <div class="ia-success-card">
            <div class="ia-success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 class="ia-success-title">{{ svc.state().successMessage }}</h2>
            <p class="ia-success-text">Ya puedes iniciar sesión con tu usuario y contraseña.</p>
            <button type="button" (click)="irAlLogin()" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.875rem 1.25rem;">
              Ir al inicio de sesión
            </button>
          </div>
        } @else {
          <h1 class="ia-title">Crea tu <em>cuenta</em>.</h1>
          <p class="ia-sub">Completa tus datos para activar tu acceso al sistema.</p>

          <div class="ia-card">
            <form [formGroup]="form" (ngSubmit)="submit()" class="ia-form">

              <div class="ia-fields-row">
                <div class="field-group">
                  <label class="field-label">Nombre</label>
                  <input type="text" formControlName="firstName" placeholder="Juan" class="field-input" />
                  @if (form.get('firstName')?.invalid && form.get('firstName')?.touched) {
                    <p class="field-error">Requerido.</p>
                  }
                </div>
                <div class="field-group">
                  <label class="field-label">Apellido</label>
                  <input type="text" formControlName="lastName" placeholder="Pérez" class="field-input" />
                  @if (form.get('lastName')?.invalid && form.get('lastName')?.touched) {
                    <p class="field-error">Requerido.</p>
                  }
                </div>
              </div>

              <div class="field-group">
                <label class="field-label">Contraseña</label>
                <input type="password" formControlName="password" placeholder="••••••••" class="field-input" />

                <ul class="ia-req-list">
                  @for (req of passwordReqs(); track req.label) {
                    <li class="ia-req" [class.is-ok]="req.ok">
                      <span class="ia-req-mark">{{ req.ok ? '✓' : '·' }}</span>
                      <span>{{ req.label }}</span>
                    </li>
                  }
                </ul>
              </div>

              <div class="field-group">
                <label class="field-label">Confirmar contraseña</label>
                <input type="password" formControlName="confirmPassword" placeholder="••••••••" class="field-input" />
                @if (form.hasError('passwordsMismatch') && form.get('confirmPassword')?.touched) {
                  <p class="field-error">Las contraseñas no coinciden.</p>
                }
              </div>

              @if (svc.state().errorMessage) {
                <div class="error-banner">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square">
                    <line x1="12" y1="8" x2="12" y2="14"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>{{ svc.state().errorMessage }}</span>
                </div>
              }

              <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary ia-submit">
                @if (svc.state().isLoading) {
                  <span class="loading-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff; width: 12px; height: 12px;"></span>
                  Creando cuenta…
                } @else {
                  Crear cuenta
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="13 6 19 12 13 18"/>
                  </svg>
                }
              </button>
            </form>
          </div>
        }

      </div>
    </div>
  `,
})
export class InvitationAcceptComponent implements OnInit {
  readonly svc = inject(InvitationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly token = signal<string | null>(null);

  form = this.fb.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  readonly passwordReqs = computed(() => {
    const v: string = this.form.get('password')?.value ?? '';
    return [
      { label: 'Mínimo 8 caracteres', ok: v.length >= 8 },
      { label: 'Una letra mayúscula', ok: /[A-Z]/.test(v) },
      { label: 'Una letra minúscula', ok: /[a-z]/.test(v) },
      { label: 'Un número', ok: /[0-9]/.test(v) },
      { label: 'Un carácter especial', ok: /[^A-Za-z0-9]/.test(v) },
    ];
  });

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    this.token.set(t);
    this.svc.reset();
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token()) return;

    await this.svc.aceptarInvitacion(
      this.token()!,
      this.form.value['firstName']!,
      this.form.value['lastName']!,
      this.form.value['password']!,
    );
  }

  irAlLogin(): void {
    void this.router.navigate(['/login']);
  }
}
