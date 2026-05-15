import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { InvitationService } from '../../invitation.service';
import { Roles } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-invitation-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-content max-w-lg pb-8" style="display:flex;flex-direction:column;gap:0.875rem">
      <div class="page-header">
        <button type="button" (click)="location.back()" class="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver
        </button>
        <h1 class="page-title">Nueva invitación</h1>
      </div>

      @if (svc.state().status === 'success' && svc.state().invitationLink) {
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:1.25rem">
          <p style="font-size:0.9rem;font-weight:700;color:#166534;margin:0 0 0.5rem">Invitación creada</p>
          <p style="font-size:0.75rem;color:#16A34A;margin:0 0 0.75rem">Comparte este enlace con el usuario:</p>
          <div style="background:#fff;border:1px solid #BBF7D0;border-radius:10px;padding:0.625rem;word-break:break-all;margin-bottom:0.875rem">
            <p style="font-size:0.72rem;font-family:monospace;color:#166534;margin:0">{{ svc.state().invitationLink }}</p>
          </div>
          <button type="button" (click)="copiarLink()" class="btn-primary w-full" style="background:#166534">
            @if (copiado()) {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copiado
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copiar enlace
            }
          </button>
        </div>

        <button type="button" (click)="nuevaInvitacion()" class="btn-secondary w-full">
          Crear otra invitación
        </button>
      } @else {
        <div class="card">
          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:0.875rem">
            <div class="field-group">
              <label class="field-label">Correo electrónico</label>
              <input type="email" formControlName="email" placeholder="usuario@ejemplo.com" class="field-input" />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <p style="font-size:0.72rem;color:#DC2626;margin:0.25rem 0 0">Ingresa un correo válido</p>
              }
            </div>

            <div class="field-group">
              <label class="field-label">Rol</label>
              <select formControlName="rol" class="field-select">
                <option value="">Selecciona un rol...</option>
                @for (r of svc.state().roles; track r.valor) {
                  <option [value]="r.valor">{{ r.etiqueta }}</option>
                }
              </select>
              @if (form.get('rol')?.invalid && form.get('rol')?.touched) {
                <p style="font-size:0.72rem;color:#DC2626;margin:0.25rem 0 0">Selecciona un rol</p>
              }
            </div>

            @if (requiereTienda()) {
              <div class="field-group">
                <label class="field-label">Tienda</label>
                <select formControlName="tiendaId" class="field-select">
                  <option [value]="null">Selecciona una tienda...</option>
                  @for (t of svc.state().tiendas; track t.id) {
                    <option [value]="t.id">{{ t.nombre }}</option>
                  }
                </select>
              </div>
            }

            <div class="field-group">
              <label class="field-label">Salario mensual (S/) <span style="font-weight:400;color:#9CA3AF">(opcional)</span></label>
              <input type="number" formControlName="salario" step="0.01" min="0" placeholder="0.00" class="field-input" />
            </div>

            @if (svc.state().errorMessage) {
              <div class="error-banner">{{ svc.state().errorMessage }}</div>
            }

            <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary w-full">
              {{ svc.state().isLoading ? 'Generando...' : 'Generar invitación' }}
            </button>
          </form>
        </div>
      }
    </div>
  `,
})
export class InvitationFormComponent implements OnInit {
  readonly svc = inject(InvitationService);
  readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);

  readonly copiado = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    rol: ['', Validators.required],
    tiendaId: [null as number | null],
    salario: [null as number | null],
  });

  readonly requiereTienda = computed(() => {
    const rol = this.form.get('rol')?.value;
    return rol && rol !== Roles.dueno;
  });

  ngOnInit(): void {
    this.svc.clearMessages();
    void this.svc.cargarRolesYTiendas();
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.svc.clearMessages();

    const { email, rol, tiendaId, salario } = this.form.value;
    await this.svc.crearInvitacion(
      email!,
      rol!,
      tiendaId ?? undefined,
      salario ?? undefined,
    );
  }

  async copiarLink(): Promise<void> {
    const link = this.svc.state().invitationLink;
    if (!link) return;
    await navigator.clipboard.writeText(link);
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  nuevaInvitacion(): void {
    this.svc.reset();
    this.form.reset();
  }
}
