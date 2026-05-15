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
    .ia-wrap { min-height:100dvh; display:flex; align-items:center; justify-content:center; background:#F2F4FA; padding:1rem; }
    .ia-box { width:100%; max-width:420px; }
    .ia-brand { display:flex; align-items:center; justify-content:center; margin-bottom:1.75rem; }
    .ia-brand-icon { width:44px; height:44px; background:#1F2A7C; border-radius:12px; display:flex; align-items:center; justify-content:center; }
    .ia-success-box { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:14px; padding:1.5rem; text-align:center; }
    .ia-req-row { display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; padding:0.2rem 0; }
    .ia-req-icon { flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .ia-fields-row { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    @media (max-width:400px) { .ia-fields-row { grid-template-columns:1fr; } }
  `],
  template: `
    <div class="ia-wrap">
      <div class="ia-box">
        <div class="ia-brand">
          <div class="ia-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v4M10 14h4"/>
            </svg>
          </div>
        </div>

        <div style="text-align:center;margin-bottom:1.5rem">
          <h1 style="font-size:1.3rem;font-weight:800;color:#111827;margin:0 0 0.25rem;letter-spacing:-0.02em">Crear cuenta</h1>
          <p style="font-size:0.8rem;color:#9CA3AF;margin:0">Completa tus datos para activar tu cuenta</p>
        </div>

        @if (!token()) {
          <div class="error-banner">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Enlace de invitación inválido o expirado. Solicita uno nuevo.
          </div>
        } @else if (svc.state().status === 'success') {
          <div class="ia-success-box">
            <div style="width:52px;height:52px;background:#16A34A;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 0.875rem">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style="font-weight:700;color:#166534;margin:0 0 0.25rem">{{ svc.state().successMessage }}</p>
            <p style="font-size:0.78rem;color:#16A34A;margin:0 0 1rem">Tu cuenta ha sido activada correctamente.</p>
            <button type="button" (click)="irAlLogin()" class="btn-primary w-full" style="background:#166534">
              Ir al inicio de sesión
            </button>
          </div>
        } @else {
          <div class="card" style="padding:1.5rem">
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:0.875rem">

              <div class="ia-fields-row">
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
              </div>

              <div class="field-group">
                <label class="field-label">Contraseña</label>
                <input type="password" formControlName="password" placeholder="••••••••" class="field-input" />
                <div style="display:flex;flex-direction:column;gap:0.2rem;margin-top:0.5rem">
                  @for (req of passwordReqs(); track req.label) {
                    <div class="ia-req-row">
                      <span class="ia-req-icon">
                        @if (req.ok) {
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5">
                            <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                          </svg>
                        } @else {
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                        }
                      </span>
                      <span [style.color]="req.ok ? '#16A34A' : '#9CA3AF'">{{ req.label }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="field-group">
                <label class="field-label">Confirmar contraseña</label>
                <input type="password" formControlName="confirmPassword" placeholder="••••••••" class="field-input" />
                @if (form.hasError('passwordsMismatch') && form.get('confirmPassword')?.touched) {
                  <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">Las contraseñas no coinciden</p>
                }
              </div>

              @if (svc.state().errorMessage) {
                <div class="error-banner">{{ svc.state().errorMessage }}</div>
              }

              <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary w-full">
                {{ svc.state().isLoading ? 'Creando cuenta...' : 'Crear cuenta' }}
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
