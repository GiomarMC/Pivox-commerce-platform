import { Component, OnInit, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { InvitationService } from '../../invitation.service';
import { Roles } from '../../../../core/auth/auth.models';
import { EditorialPageHeaderComponent } from '../../../../shared/components/editorial-page-header/editorial-page-header.component';
import { CopyLinkButtonComponent } from '../../../../shared/components/copy-link-button/copy-link-button.component';

@Component({
  selector: 'app-invitation-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    EditorialPageHeaderComponent,
    CopyLinkButtonComponent,
  ],
  styles: [`
    :host { display: block; }
    .if-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }
    @media (min-width: 1024px) {
      .if-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 4rem; }
    }
    .if-form-col { max-width: 38rem; animation: ed-fade-up 640ms cubic-bezier(0.16, 1, 0.3, 1) both; }
    .if-form { display: flex; flex-direction: column; gap: 1.5rem; }

    .if-success-block {
      background: var(--color-surface);
      border: 1px solid var(--color-success);
      padding: 1.5rem;
    }
    .if-success-eyebrow {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-success);
      margin: 0 0 0.625rem;
    }
    .if-success-title {
      font-family: var(--font-display);
      font-style: normal;
      font-size: 1.625rem;
      color: var(--color-ink);
      margin: 0 0 1.5rem;
      font-weight: 500;
    }

    .if-actions {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-rule-bold);
    }

    .if-aside {
      padding-top: 0.5rem;
    }
    @media (min-width: 1024px) {
      .if-aside {
        position: sticky;
        top: 2rem;
        align-self: start;
        border-left: 1px solid var(--color-rule);
        padding-left: 2.5rem;
      }
    }
    .if-aside-block { padding: 0 0 2rem; }
    .if-aside-block + .if-aside-block { padding-top: 2rem; border-top: 1px solid var(--color-rule); }
    .if-aside-title {
      font-family: var(--font-display);
      font-style: normal;
      font-weight: 500;
      font-size: 1.5rem;
      line-height: 1.15;
      color: var(--color-ink);
      margin: 0.875rem 0;
      letter-spacing: -0.015em;
      
    }
    .if-aside-text {
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--color-ink-2);
      line-height: 1.55;
      margin: 0;
    }
    .if-role-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .if-role-list li {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--color-ink-2);
    }
    .if-role-tag {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-ink);
      letter-spacing: 0.05em;
      flex-shrink: 0;
      min-width: 6ch;
    }
  `],
  template: `
    <div class="page-content">

      <button class="btn-back anim-fade-up" (click)="location.back()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver
      </button>

      <app-editorial-page-header
        eyebrow="Equipo · Invitaciones"
        tick="01 / Nueva"
        title="Invitar a un miembro"
        subtitle="Crea un enlace de acceso para que un nuevo usuario active su cuenta.">
      </app-editorial-page-header>

      <div class="if-grid">

        <!-- Form column -->
        <div class="if-form-col">
          @if (svc.state().status === 'success' && svc.state().invitationLink) {
            <div class="if-success-block anim-fade-up">
              <p class="if-success-eyebrow">Invitación creada</p>
              <h2 class="if-success-title">Comparte este enlace con tu invitado.</h2>

              <app-copy-link-button
                [link]="svc.state().invitationLink ?? ''"
                label="Enlace de invitación">
              </app-copy-link-button>
            </div>

            <div class="if-actions" style="margin-top: 2rem;">
              <button type="button" class="btn-secondary" (click)="nuevaInvitacion()">
                Crear otra invitación
              </button>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="if-form">

              <div class="field-group">
                <label class="field-label">Correo electrónico</label>
                <input type="email" formControlName="email" placeholder="usuario@ejemplo.com" class="field-input" />
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <p class="field-error">Ingresa un correo válido.</p>
                }
              </div>

              <div class="field-group">
                <label class="field-label">Rol</label>
                <select formControlName="rol" class="field-select">
                  <option value="">Selecciona un rol…</option>
                  @for (r of svc.state().roles; track r.valor) {
                    <option [value]="r.valor">{{ r.etiqueta }}</option>
                  }
                </select>
                @if (form.get('rol')?.invalid && form.get('rol')?.touched) {
                  <p class="field-error">Selecciona un rol.</p>
                }
              </div>

              @if (requiereTienda()) {
                <div class="field-group">
                  <label class="field-label">Tienda</label>
                  <select formControlName="tiendaId" class="field-select">
                    <option [ngValue]="null">Selecciona una tienda…</option>
                    @for (t of svc.state().tiendas; track t.id) {
                      <option [ngValue]="t.id">{{ t.nombre }}</option>
                    }
                  </select>
                </div>

                <div class="field-group">
                  <label class="field-label">Salario mensual <span style="text-transform: none; font-style: normal; color: var(--color-ink-3);">opcional</span></label>
                  <input type="number" formControlName="salario" step="0.01" min="0" placeholder="0.00"
                    class="field-input" style="font-family: var(--font-mono);" />
                </div>
              }

              @if (svc.state().errorMessage) {
                <div class="error-banner">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square">
                    <line x1="12" y1="8" x2="12" y2="14"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>{{ svc.state().errorMessage }}</span>
                </div>
              }

              <div class="if-actions">
                <button type="button" class="btn-ghost" (click)="location.back()">
                  Cancelar
                </button>
                <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary">
                  @if (svc.state().isLoading) {
                    <span class="loading-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff; width: 12px; height: 12px;"></span>
                    Generando…
                  } @else {
                    Generar invitación
                  }
                </button>
              </div>
            </form>
          }
        </div>

        <!-- Aside -->
        <aside class="if-aside">
          <div class="if-aside-block">
            <span class="text-eyebrow eyebrow-mark">Cómo funciona</span>
            <h3 class="if-aside-title">Un enlace, una sola vez.</h3>
            <p class="if-aside-text">
              El enlace generado caduca al ser usado. Si el invitado no lo activa, puedes reenviar uno nuevo desde el listado de usuarios.
            </p>
          </div>

          <div class="if-aside-block">
            <span class="text-eyebrow eyebrow-mark">Roles disponibles</span>
            <h3 class="if-aside-title">¿Qué permisos asignar?</h3>
            <ul class="if-role-list">
              <li><span class="if-role-tag">DUENO</span> <span>Acceso completo, incluye gastos y configuración.</span></li>
              <li><span class="if-role-tag">ADMIN</span> <span>Gestión de usuarios, asistencia y operativa diaria.</span></li>
              <li><span class="if-role-tag">TRAB.</span> <span>Operativa diaria: ventas, servicios, inventario.</span></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class InvitationFormComponent implements OnInit {
  readonly svc = inject(InvitationService);
  readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);

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
    const esDueno = rol === Roles.dueno;
    await this.svc.crearInvitacion(
      email!,
      rol!,
      esDueno ? undefined : (tiendaId ?? undefined),
      esDueno ? undefined : (salario ?? undefined),
    );
  }

  nuevaInvitacion(): void {
    this.svc.reset();
    this.form.reset();
  }
}
