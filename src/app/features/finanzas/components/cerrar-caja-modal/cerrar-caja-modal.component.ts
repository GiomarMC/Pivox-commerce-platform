import { Component, inject, output, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { FinanzasService } from '../../finanzas.service';

@Component({
  selector: 'app-cerrar-caja-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  styles: [`
    :host { position: fixed; inset: 0; z-index: 60; }
    .cc-backdrop {
      position: absolute; inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: cc-fade 200ms cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    .cc-sheet {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      max-width: 520px;
      max-height: 92dvh;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-radius: var(--radius-xl);
      box-shadow: 0 24px 56px rgba(15, 23, 42, 0.18), 0 8px 16px rgba(15, 23, 42, 0.08);
      animation: cc-pop 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @media (max-width: 640px) {
      .cc-sheet {
        top: auto; left: 0; right: 0; bottom: 0;
        transform: none;
        max-width: 100%;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        animation: cc-slide-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }
    }
    .cc-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.125rem 1.5rem 0.875rem;
      border-bottom: 1px solid var(--color-rule);
    }
    .cc-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.125rem;
      color: var(--color-ink-strong);
      margin: 0;
      letter-spacing: -0.015em;
    }
    .cc-close {
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent; border: 1px solid var(--color-rule);
      border-radius: 12px; cursor: pointer; color: var(--color-ink-2);
      transition: background 160ms, border-color 160ms;
    }
    .cc-close:hover { background: var(--color-surface-2); border-color: var(--color-ink); }
    .cc-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

    .cc-resumen {
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      color: #FFFFFF;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-lg);
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.22);
    }
    .cc-resumen-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.78);
      margin: 0 0 0.3rem;
    }
    .cc-resumen-value {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.75rem;
      letter-spacing: -0.025em;
      color: #FFFFFF;
      margin: 0;
      font-feature-settings: 'tnum';
    }
    .cc-resumen-pre {
      font-family: var(--font-mono);
      font-size: 0.55em;
      font-weight: 500;
      opacity: 0.65;
      margin-right: 0.2em;
      vertical-align: 0.5em;
    }

    .cc-discrepancia {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .cc-discrepancia-ok { background: var(--color-success-tint); color: var(--color-success); }
    .cc-discrepancia-warn { background: var(--color-warning-tint); color: var(--color-warning); }
    .cc-discrepancia-monto {
      font-family: var(--font-mono);
      font-feature-settings: 'tnum';
    }

    .cc-exito {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: var(--color-success-tint);
      border: 1px solid var(--color-success);
      border-radius: var(--radius-lg);
      animation: cc-fade 240ms cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    .cc-exito-icon {
      width: 30px; height: 30px;
      background: var(--color-success);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .cc-exito-text {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-success);
      margin: 0;
    }

    .cc-foot {
      padding: 0.875rem 1.5rem 1.25rem;
      display: flex;
      gap: 0.625rem;
      border-top: 1px solid var(--color-rule);
    }
    .cc-foot button { flex: 1; }

    @keyframes cc-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes cc-pop {
      from { opacity: 0; transform: translate(-50%, -45%) scale(0.96); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes cc-slide-up {
      from { opacity: 0; transform: translateY(8%); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
  template: `
    <div class="cc-backdrop" (click)="onClose()"></div>

    <div class="cc-sheet" role="dialog" aria-modal="true" aria-labelledby="cc-title">
      <header class="cc-head">
        <h2 id="cc-title" class="cc-title">Cerrar caja del día</h2>
        <button class="cc-close" (click)="onClose()" aria-label="Cerrar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6"  x2="6"  y2="18"/>
            <line x1="6"  y1="6"  x2="18" y2="18"/>
          </svg>
        </button>
      </header>

      <div class="cc-body">

        @if (exitoso()) {
          <div class="cc-exito">
            <div class="cc-exito-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p class="cc-exito-text">Caja cerrada correctamente</p>
          </div>
        }

        @if (svc.state().cajaResumen; as r) {
          <div class="cc-resumen">
            <p class="cc-resumen-label">Total esperado del sistema</p>
            <p class="cc-resumen-value"><span class="cc-resumen-pre">S/</span>{{ +r.totalGeneral | number:'1.2-2' }}</p>
          </div>
        }

        @if (discrepancia() !== null) {
          <div [class]="discrepancia()! === 0 ? 'cc-discrepancia cc-discrepancia-ok' : 'cc-discrepancia cc-discrepancia-warn'">
            <span>
              @if (discrepancia()! === 0) { Sin discrepancia }
              @else if (discrepancia()! > 0) { Sobrante en caja }
              @else { Faltante en caja }
            </span>
            <span class="cc-discrepancia-monto">S/ {{ absDiscrepancia() | number:'1.2-2' }}</span>
          </div>
        }

        <form [formGroup]="form" style="display:flex;flex-direction:column;gap:0.75rem">
          <div class="field-group">
            <label class="field-label">Monto real en caja (S/) <span style="color:var(--color-error)">*</span></label>
            <input type="number" formControlName="montoReal" step="0.01" min="0" placeholder="0.00" class="field-input" />
            @if (form.get('montoReal')?.invalid && form.get('montoReal')?.touched) {
              <p class="field-error">Ingresa el monto real</p>
            }
          </div>

          <div class="field-group">
            <label class="field-label">Observaciones <span style="font-weight:400;color:var(--color-ink-3)">(opcional)</span></label>
            <textarea formControlName="observaciones" rows="3" placeholder="Notas del cierre..." class="field-textarea"></textarea>
          </div>

          @if (svc.state().errorMessage) {
            <div class="error-banner">{{ svc.state().errorMessage }}</div>
          }
        </form>
      </div>

      <footer class="cc-foot">
        <button type="button" class="btn-secondary" (click)="onClose()">Cancelar</button>
        <button type="button" class="btn-primary" (click)="cerrar()" [disabled]="svc.state().isSaving || exitoso()">
          @if (svc.state().isSaving) {
            <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
            Cerrando...
          } @else {
            Confirmar cierre
          }
        </button>
      </footer>
    </div>
  `,
})
export class CerrarCajaModalComponent {
  readonly svc = inject(FinanzasService);
  private readonly fb = inject(FormBuilder);

  readonly closeRequested = output<void>();
  readonly cerrado = output<void>();

  readonly exitoso = signal(false);

  form = this.fb.group({
    montoReal: [null as number | null, [Validators.required, Validators.min(0)]],
    observaciones: [''],
  });

  private readonly _montoReal = signal<number | null>(null);

  readonly discrepancia = computed(() => {
    const esperado = parseFloat(this.svc.state().cajaResumen?.totalGeneral ?? '0');
    const real = this._montoReal();
    if (real === null || isNaN(real)) return null;
    return real - esperado;
  });

  readonly absDiscrepancia = computed(() => Math.abs(this.discrepancia() ?? 0));

  constructor() {
    if (!this.svc.state().cajaResumen) {
      void this.svc.cargarCajaResumen();
    }
    this.form.get('montoReal')?.valueChanges.subscribe(v => {
      this._montoReal.set(typeof v === 'number' ? v : (v != null ? Number(v) : null));
    });
  }

  onClose(): void {
    this.svc.clearMessages();
    this.closeRequested.emit();
  }

  async cerrar(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.svc.clearMessages();

    const montoReal = String(this.form.value['montoReal'] ?? '0');
    const observaciones = this.form.value['observaciones'] ?? '';

    const ok = await this.svc.cerrarCaja(montoReal, observaciones);
    if (ok) {
      this.exitoso.set(true);
      this.cerrado.emit();
      setTimeout(() => this.closeRequested.emit(), 1800);
    }
  }
}
