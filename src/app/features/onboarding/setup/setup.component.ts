import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingService } from '../onboarding.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    :host { display: block; }
    .su-bg {
      min-height: 100dvh;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
    }
    .su-wrap {
      width: 100%;
      max-width: 38rem;
      animation: ed-fade-up 640ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Steps indicator (editorial) */
    .su-steps {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 2.5rem;
      border-top: 1px solid var(--color-rule-bold);
      border-bottom: 1px solid var(--color-rule);
    }
    .su-step {
      padding: 1rem 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.875rem;
      transition: background 200ms;
    }
    .su-step:first-child { border-right: 1px solid var(--color-rule); }
    .su-step.is-active { background: var(--color-surface-2); }
    .su-step.is-done { background: transparent; }

    .su-step-num {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-ink-3);
      letter-spacing: 0.05em;
      flex-shrink: 0;
      width: 2.25rem;
    }
    .su-step.is-active .su-step-num,
    .su-step.is-done .su-step-num { color: var(--color-ink); }

    .su-step-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ink-3);
    }
    .su-step.is-active .su-step-label,
    .su-step.is-done .su-step-label { color: var(--color-ink); }

    .su-step-name {
      font-family: var(--font-display);
      font-style: normal;
      font-weight: 500;
      font-size: 1rem;
      letter-spacing: -0.01em;
      color: var(--color-ink-3);
      line-height: 1.2;
      
    }
    .su-step.is-active .su-step-name,
    .su-step.is-done .su-step-name { color: var(--color-ink); }

    .su-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 1rem;
    }
    .su-tick {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-3);
      letter-spacing: 0.05em;
    }
    .su-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ink);
    }
    .su-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(1.875rem, 3.5vw, 2.5rem);
      line-height: 1.05;
      letter-spacing: -0.022em;
      color: var(--color-ink);
      margin: 0 0 0.5rem;
      
    }
    .su-title em { font-style: normal; }
    .su-sub {
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--color-ink-2);
      margin: 0 0 2rem;
      max-width: 42ch;
    }

    .su-card {
      background: var(--color-surface);
      border: 1px solid var(--color-rule-bold);
      padding: 2rem;
    }
    .su-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .su-series-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.875rem;
    }
    @media (max-width: 480px) {
      .su-series-row { grid-template-columns: 1fr; }
    }
    .su-section-eyebrow {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ink-2);
      padding-bottom: 0.625rem;
      border-bottom: 1px solid var(--color-rule);
      margin: 0.5rem 0 -0.25rem;
    }
    .su-submit {
      width: 100%;
      justify-content: center;
      padding: 0.875rem 1.25rem;
      margin-top: 0.5rem;
    }
  `],
  template: `
    <div class="su-bg">
      <div class="su-wrap">

        <!-- Steps indicator -->
        <div class="su-steps">
          <div class="su-step"
            [class.is-active]="svc.state().setupStep === 'empresa'"
            [class.is-done]="svc.state().setupStep !== 'empresa'">
            <span class="su-step-num">
              @if (svc.state().setupStep !== 'empresa') {
                ✓
              } @else {
                01
              }
            </span>
            <div>
              <p class="su-step-label">Paso uno</p>
              <p class="su-step-name">Empresa</p>
            </div>
          </div>
          <div class="su-step"
            [class.is-active]="svc.state().setupStep === 'tienda'">
            <span class="su-step-num">02</span>
            <div>
              <p class="su-step-label">Paso dos</p>
              <p class="su-step-name">Sede principal</p>
            </div>
          </div>
        </div>

        <div class="su-eyebrow">
          <span class="su-tick">Configuración inicial</span>
          <span class="su-label">Pivox</span>
        </div>

        @if (svc.state().setupStep === 'empresa') {
          <h1 class="su-title">Comencemos por la <em>empresa</em>.</h1>
          <p class="su-sub">Estos datos aparecerán en tus comprobantes electrónicos SUNAT.</p>

          <div class="su-card">
            <form [formGroup]="formEmpresa" (ngSubmit)="submitEmpresa()" class="su-form">
              <div class="field-group">
                <label class="field-label">Razón social</label>
                <input type="text" formControlName="nombre" placeholder="Mi Empresa S.A.C." class="field-input" />
                @if (formEmpresa.get('nombre')?.invalid && formEmpresa.get('nombre')?.touched) {
                  <p class="field-error">Requerido.</p>
                }
              </div>

              <div class="field-group">
                <label class="field-label">RUC</label>
                <input type="text" formControlName="ruc" placeholder="20123456789" maxlength="11"
                  class="field-input" style="font-family: var(--font-mono); letter-spacing: 0.05em;" />
                @if (formEmpresa.get('ruc')?.invalid && formEmpresa.get('ruc')?.touched) {
                  <p class="field-error">RUC de 11 dígitos requerido.</p>
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

              <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary su-submit">
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
        }

        @if (svc.state().setupStep === 'tienda') {
          <h1 class="su-title">Ahora la <em>sede principal</em>.</h1>
          <p class="su-sub">Tu primera sucursal con series de comprobante listas para emitir.</p>

          <div class="su-card">
            <form [formGroup]="formTienda" (ngSubmit)="submitTienda()" class="su-form">
              <div class="field-group">
                <label class="field-label">Nombre de la sede</label>
                <input type="text" formControlName="nombre" placeholder="Sede Central" class="field-input" />
              </div>

              <div class="field-group">
                <label class="field-label">Dirección</label>
                <input type="text" formControlName="direccion" placeholder="Av. Principal 123" class="field-input" />
              </div>

              <div class="field-group">
                <label class="field-label">Ubigeo</label>
                <input type="text" formControlName="ubigeo" placeholder="150101" maxlength="6"
                  class="field-input" style="font-family: var(--font-mono); letter-spacing: 0.05em;" />
                <p class="field-hint">Código INEI de 6 dígitos.</p>
              </div>

              <p class="su-section-eyebrow">Series de comprobantes</p>

              <div class="su-series-row">
                <div class="field-group">
                  <label class="field-label">Factura</label>
                  <input type="text" formControlName="serieFactura" class="field-input"
                    style="font-family: var(--font-mono);" maxlength="4" />
                </div>
                <div class="field-group">
                  <label class="field-label">Boleta</label>
                  <input type="text" formControlName="serieBoleta" class="field-input"
                    style="font-family: var(--font-mono);" maxlength="4" />
                </div>
                <div class="field-group">
                  <label class="field-label">Ticket</label>
                  <input type="text" formControlName="serieTicket" class="field-input"
                    style="font-family: var(--font-mono);" maxlength="4" />
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

              <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary su-submit">
                @if (svc.state().isLoading) {
                  <span class="loading-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff; width: 12px; height: 12px;"></span>
                  Creando sede…
                } @else {
                  Finalizar configuración
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
                    <polyline points="20 6 9 17 4 12"/>
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
export class SetupComponent implements OnInit {
  readonly svc = inject(OnboardingService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  formEmpresa = this.fb.group({
    nombre: ['', Validators.required],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
  });

  formTienda = this.fb.group({
    nombre: ['', Validators.required],
    direccion: ['', Validators.required],
    ubigeo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    serieFactura: ['F001', Validators.required],
    serieBoleta: ['B001', Validators.required],
    serieTicket: ['T001', Validators.required],
  });

  ngOnInit(): void {
    this.svc.clearMessages();
  }

  async submitEmpresa(): Promise<void> {
    this.formEmpresa.markAllAsTouched();
    if (this.formEmpresa.invalid) return;
    this.svc.clearMessages();
    await this.svc.crearEmpresa(
      this.formEmpresa.value['nombre']!,
      this.formEmpresa.value['ruc']!,
    );
  }

  async submitTienda(): Promise<void> {
    this.formTienda.markAllAsTouched();
    if (this.formTienda.invalid) return;
    this.svc.clearMessages();

    const ok = await this.svc.crearTienda(
      this.formTienda.value['nombre']!,
      this.formTienda.value['direccion']!,
      this.formTienda.value['ubigeo']!,
      this.formTienda.value['serieFactura']!,
      this.formTienda.value['serieBoleta']!,
      this.formTienda.value['serieTicket']!,
    );

    if (ok) {
      void this.router.navigate(['/home']);
    }
  }
}
