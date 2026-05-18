import { Component, computed, input, output } from '@angular/core';
import { DeudaModel } from '../../models/deuda.model';
import { getEstadoDeudaLabel } from '../../constants/estados-deuda';

@Component({
  selector: 'app-deuda-card',
  standalone: true,
  styles: [`
    .dc-card { background:#fff; border:1px solid #EEF1F6; border-radius: 16px; padding:1rem; }
    .dc-mono-row { display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; padding:0.2rem 0; }
    .dc-progress { width:100%; background:#EEF1F6; border-radius:99px; height:5px; margin-top:0.5rem; overflow:hidden; }
    .dc-bar { height:5px; border-radius:99px; transition:width 0.3s; }
  `],
  template: `
    <div class="dc-card">
      <div style="display:flex;gap:0.75rem;align-items:flex-start">
        <!-- Icon -->
        <div style="width:44px;height:44px;border-radius: 16px;flex-shrink:0;display:flex;align-items:center;justify-content:center"
          [style.background]="deuda().tipoOrigen === 'venta' ? '#EEF2FF' : '#ECFDF5'">
          @if (deuda().tipoOrigen === 'venta') {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          }
        </div>

        <!-- Info -->
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.25rem">
            <div style="min-width:0">
              @if (deuda().numeroComprobante) {
                <p style="font-size:0.875rem;font-weight:600;color:#334155;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  {{ deuda().numeroComprobante }}
                </p>
              }
              <p style="font-size:0.75rem;color:#94A3B8;margin:0">
                {{ deuda().tipoOrigen === 'venta' ? 'Venta' : 'Servicio' }} a crédito
              </p>
            </div>
            <span [class]="deuda().estado === 'ACTIVA' ? 'badge badge-warning' : 'badge badge-success'">
              {{ getEstadoDeudaLabel(deuda().estado) }}
            </span>
          </div>

          <!-- Montos -->
          <div style="margin-top:0.5rem">
            <div class="dc-mono-row">
              <span style="color:#94A3B8">Total</span>
              <span style="font-weight:500;color:#334155">S/ {{ deuda().montoTotal }}</span>
            </div>
            <div class="dc-mono-row">
              <span style="color:#94A3B8">Pagado</span>
              <span style="font-weight:500;color:#10B981">S/ {{ montoPagado() }}</span>
            </div>
            <div class="dc-mono-row" style="font-weight:700">
              <span style="color:#334155">Saldo pendiente</span>
              <span style="color:#EF4444">S/ {{ deuda().saldo }}</span>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="dc-progress">
            <div class="dc-bar" [style.width.%]="porcentajePagado()"
              [style.background]="deuda().estado === 'PAGADA' ? '#10B981' : '#334155'"></div>
          </div>
        </div>
      </div>

      <!-- Pagos anteriores -->
      @if (deuda().pagos.length > 0) {
        <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #FAFBFC">
          <p style="font-size:0.72rem;color:#94A3B8;margin:0 0 0.5rem">Pagos anteriores</p>
          @for (p of deuda().pagos; track p.fecha) {
            <div class="dc-mono-row">
              <span style="color:#94A3B8">{{ p.fecha }}</span>
              <span style="font-weight:500;color:#334155">S/ {{ p.monto }}</span>
            </div>
          }
        </div>
      }

      @if (deuda().estado === 'ACTIVA') {
        <button type="button" (click)="pagar.emit(deuda())" class="btn-primary w-full" style="margin-top:0.75rem">
          Registrar pago
        </button>
      }
    </div>
  `,
})
export class DeudaCardComponent {
  readonly deuda = input.required<DeudaModel>();
  readonly pagar = output<DeudaModel>();

  readonly getEstadoDeudaLabel = getEstadoDeudaLabel;

  readonly montoPagado = computed(() =>
    (parseFloat(this.deuda().montoTotal) - parseFloat(this.deuda().saldo)).toFixed(2),
  );

  readonly porcentajePagado = computed(() => {
    const total = parseFloat(this.deuda().montoTotal);
    if (total <= 0) return 0;
    return Math.min(100, ((total - parseFloat(this.deuda().saldo)) / total) * 100);
  });
}
