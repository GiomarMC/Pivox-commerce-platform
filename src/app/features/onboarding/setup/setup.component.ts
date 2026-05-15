import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingService } from '../onboarding.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    .su-wrap { min-height:100dvh; display:flex; align-items:center; justify-content:center; background:#F2F4FA; padding:1rem; }
    .su-box { width:100%; max-width:480px; }
    .su-steps { display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-bottom:1.5rem; }
    .su-step { display:flex; align-items:center; gap:0.5rem; }
    .su-step-bubble { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0; }
    .su-step-bubble.active { background:#1F2A7C; color:#fff; }
    .su-step-bubble.done { background:#16A34A; color:#fff; }
    .su-step-bubble.pending { background:#E2E6F0; color:#9CA3AF; }
    .su-step-label { font-size:0.78rem; color:#6B7280; }
    .su-step-sep { width:2rem; height:1px; background:#E2E6F0; flex-shrink:0; }
    .su-series-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem; }
    @media (max-width:380px) { .su-series-row { grid-template-columns:1fr; } }
  `],
  template: `
    <div class="su-wrap">
      <div class="su-box">

        <div style="text-align:center;margin-bottom:1rem">
          <div style="width:44px;height:44px;background:#1F2A7C;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style="font-size:1.3rem;font-weight:800;color:#111827;margin:0;letter-spacing:-0.02em">Configura tu negocio</h1>
        </div>

        <!-- Step indicator -->
        <div class="su-steps">
          <div class="su-step">
            <div [class]="svc.state().setupStep === 'empresa' ? 'su-step-bubble active' : 'su-step-bubble done'">
              @if (svc.state().setupStep === 'empresa') {
                1
              } @else {
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            </div>
            <span class="su-step-label">Empresa</span>
          </div>
          <div class="su-step-sep"></div>
          <div class="su-step">
            <div [class]="svc.state().setupStep === 'tienda' ? 'su-step-bubble active' : 'su-step-bubble pending'">2</div>
            <span class="su-step-label">Sede</span>
          </div>
        </div>

        <div class="card" style="padding:1.5rem">

          <!-- PASO 1: Empresa -->
          @if (svc.state().setupStep === 'empresa') {
            <form [formGroup]="formEmpresa" (ngSubmit)="submitEmpresa()" style="display:flex;flex-direction:column;gap:0.875rem">
              <p style="font-size:0.875rem;font-weight:700;color:#111827;margin:0">Datos de la empresa</p>

              <div class="field-group">
                <label class="field-label">Razón social / Nombre</label>
                <input type="text" formControlName="nombre" placeholder="Mi Empresa S.A.C." class="field-input" />
                @if (formEmpresa.get('nombre')?.invalid && formEmpresa.get('nombre')?.touched) {
                  <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">Requerido</p>
                }
              </div>

              <div class="field-group">
                <label class="field-label">RUC</label>
                <input type="text" formControlName="ruc" placeholder="20123456789" maxlength="11" class="field-input" />
                @if (formEmpresa.get('ruc')?.invalid && formEmpresa.get('ruc')?.touched) {
                  <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">RUC de 11 dígitos requerido</p>
                }
              </div>

              @if (svc.state().errorMessage) {
                <div class="error-banner">{{ svc.state().errorMessage }}</div>
              }

              <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary w-full">
                {{ svc.state().isLoading ? 'Guardando...' : 'Continuar' }}
              </button>
            </form>
          }

          <!-- PASO 2: Tienda/Sede -->
          @if (svc.state().setupStep === 'tienda') {
            <form [formGroup]="formTienda" (ngSubmit)="submitTienda()" style="display:flex;flex-direction:column;gap:0.875rem">
              <p style="font-size:0.875rem;font-weight:700;color:#111827;margin:0">Datos de la sede principal</p>

              <div class="field-group">
                <label class="field-label">Nombre de la sede</label>
                <input type="text" formControlName="nombre" placeholder="Sede Central" class="field-input" />
                @if (formTienda.get('nombre')?.invalid && formTienda.get('nombre')?.touched) {
                  <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">Requerido</p>
                }
              </div>

              <div class="field-group">
                <label class="field-label">Dirección</label>
                <input type="text" formControlName="direccion" placeholder="Av. Principal 123" class="field-input" />
                @if (formTienda.get('direccion')?.invalid && formTienda.get('direccion')?.touched) {
                  <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">Requerido</p>
                }
              </div>

              <div class="field-group">
                <label class="field-label">Ubigeo</label>
                <input type="text" formControlName="ubigeo" placeholder="150101" maxlength="6" class="field-input" />
                @if (formTienda.get('ubigeo')?.invalid && formTienda.get('ubigeo')?.touched) {
                  <p style="font-size:0.72rem;color:#DC2626;margin:0.2rem 0 0">Ubigeo de 6 dígitos requerido</p>
                }
              </div>

              <div>
                <p style="font-size:0.78rem;font-weight:600;color:#6B7280;margin:0 0 0.5rem">Series de comprobantes</p>
                <div class="su-series-row">
                  <div class="field-group">
                    <label class="field-label">Factura</label>
                    <input type="text" formControlName="serieFactura" placeholder="F001" class="field-input" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Boleta</label>
                    <input type="text" formControlName="serieBoleta" placeholder="B001" class="field-input" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Ticket</label>
                    <input type="text" formControlName="serieTicket" placeholder="T001" class="field-input" />
                  </div>
                </div>
              </div>

              @if (svc.state().errorMessage) {
                <div class="error-banner">{{ svc.state().errorMessage }}</div>
              }

              <button type="submit" [disabled]="svc.state().isLoading" class="btn-primary w-full">
                {{ svc.state().isLoading ? 'Creando sede...' : 'Finalizar configuración' }}
              </button>
            </form>
          }

        </div>
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
      void this.router.navigate(['/tienda']);
    }
  }
}
