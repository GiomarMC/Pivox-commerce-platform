import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanzasService } from '../../finanzas.service';

@Component({
  selector: 'app-caja-cierre',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    .cc-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #E2E6F0; padding:1rem; z-index:20; }
  `],
  template: `
    <div class="page-content max-w-2xl pb-32" style="display:flex;flex-direction:column;gap:0.875rem">
      <div class="page-header">
        <h1 class="page-title">Cierre de Caja</h1>
      </div>

      @if (svc.state().cajaResumen; as r) {
        <div style="background:#F2F4FA;border-radius:12px;padding:0.875rem">
          <p style="font-size:0.72rem;color:#9CA3AF;margin:0 0 0.2rem">Total esperado del sistema</p>
          <p style="font-size:1.25rem;font-weight:800;color:#1F2A7C;margin:0">S/ {{ r.totalGeneral }}</p>
        </div>
      }

      @if (exitoso) {
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:1rem;display:flex;align-items:center;gap:0.75rem">
          <div style="width:32px;height:32px;background:#16A34A;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p style="font-size:0.875rem;font-weight:600;color:#166534;margin:0">Caja cerrada correctamente</p>
        </div>
      }

      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:0.875rem">
        <div class="card">
          <div class="field-group">
            <label class="field-label">Monto real en caja (S/) <span style="color:#DC2626">*</span></label>
            <input type="number" formControlName="montoReal" step="0.01" min="0" placeholder="0.00" class="field-input" />
            @if (form.get('montoReal')?.invalid && form.get('montoReal')?.touched) {
              <p style="font-size:0.72rem;color:#DC2626;margin:0.25rem 0 0">Ingresa el monto real</p>
            }
          </div>
        </div>

        <div class="card">
          <div class="field-group">
            <label class="field-label">Observaciones <span style="font-weight:400;color:#9CA3AF">(opcional)</span></label>
            <textarea formControlName="observaciones" rows="3" placeholder="Notas del cierre..." class="field-textarea"></textarea>
          </div>
        </div>

        @if (svc.state().errorMessage) {
          <div class="error-banner">{{ svc.state().errorMessage }}</div>
        }
      </form>
    </div>

    <div class="cc-footer">
      <button type="button" (click)="cerrar()" [disabled]="svc.state().isSaving" class="btn-primary w-full">
        {{ svc.state().isSaving ? 'Cerrando...' : 'Confirmar cierre' }}
      </button>
    </div>
  `,
})
export class CajaCierreComponent implements OnInit {
  readonly svc = inject(FinanzasService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  exitoso = false;

  form = this.fb.group({
    montoReal: [null as number | null, [Validators.required, Validators.min(0)]],
    observaciones: [''],
  });

  ngOnInit(): void {
    if (!this.svc.state().cajaResumen) {
      void this.svc.cargarCajaResumen();
    }
  }

  async cerrar(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.svc.clearMessages();

    const montoReal = String(this.form.value['montoReal'] ?? '0');
    const observaciones = this.form.value['observaciones'] ?? '';

    const ok = await this.svc.cerrarCaja(montoReal, observaciones);
    if (ok) {
      this.exitoso = true;
      setTimeout(() => void this.router.navigate(['/finanzas/caja/resumen']), 2000);
    }
  }
}
