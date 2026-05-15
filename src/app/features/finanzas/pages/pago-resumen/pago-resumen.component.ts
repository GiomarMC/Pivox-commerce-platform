import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinanzasService } from '../../finanzas.service';
import { ESTADOS_DEUDA_VALUES, getEstadoDeudaLabel } from '../../constants/estados-deuda';

@Component({
  selector: 'app-pago-resumen',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-content max-w-2xl">
      <div class="page-header">
        <h1 class="page-title">Historial de Pagos</h1>
        <button type="button" (click)="cargar()" class="btn-secondary" style="font-size:0.78rem;padding:0.35rem 0.875rem">Actualizar</button>
      </div>

      <!-- Filtro chip -->
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.875rem">
        <button type="button" (click)="setEstadoFiltro('')" [class]="estadoFiltro === '' ? 'chip chip-active' : 'chip'">Todos</button>
        @for (e of estadosDeuda; track e) {
          <button type="button" (click)="setEstadoFiltro(e)" [class]="estadoFiltro === e ? 'chip chip-active' : 'chip'">
            {{ getEstadoDeudaLabel(e) }}
          </button>
        }
      </div>

      @if (svc.state().isLoading) {
        <div style="display:flex;flex-direction:column;gap:0.625rem">
          @for (i of [1,2,3]; track i) {
            <div class="card" style="animation:pulse 1.5s infinite">
              <div style="display:flex;gap:0.75rem;align-items:center">
                <div style="width:40px;height:40px;border-radius:12px;background:#E5E7EB;flex-shrink:0"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:0.5rem">
                  <div style="height:13px;background:#E5E7EB;border-radius:5px;width:50%"></div>
                  <div style="height:11px;background:#F3F4F6;border-radius:5px;width:35%"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (svc.state().errorMessage) {
        <div class="error-banner" style="margin-bottom:0.875rem">{{ svc.state().errorMessage }}</div>
      } @else if (svc.state().pagos.length === 0) {
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <p class="empty-title">Sin pagos registrados</p>
          <p class="empty-desc">Los pagos de deudas aparecerán aquí</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:0.625rem">
          @for (pago of svc.state().pagos; track pago.id) {
            <div class="card" style="padding:0.875rem">
              <div style="display:flex;gap:0.75rem;align-items:center">
                <div style="width:40px;height:40px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center"
                  [style.background]="pago.tipoOrigen === 'VENTA' ? '#EFF6FF' : '#F0FDF4'">
                  @if (pago.tipoOrigen === 'VENTA') {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  } @else {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                  }
                </div>
                <div style="flex:1;min-width:0">
                  @if (pago.numeroComprobante) {
                    <p style="font-size:0.875rem;font-weight:600;color:#111827;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {{ pago.numeroComprobante }}
                    </p>
                  }
                  <p style="font-size:0.75rem;color:#9CA3AF;margin:0">
                    {{ pago.tipoOrigen === 'VENTA' ? 'Venta' : 'Servicio' }} · {{ formatFecha(pago.fecha) }}
                  </p>
                </div>
                <p style="font-size:0.875rem;font-weight:700;color:#1F2A7C;flex-shrink:0;margin:0">S/ {{ pago.monto }}</p>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PagoResumenComponent implements OnInit {
  readonly svc = inject(FinanzasService);

  readonly estadosDeuda = ESTADOS_DEUDA_VALUES;
  readonly getEstadoDeudaLabel = getEstadoDeudaLabel;
  estadoFiltro = '';

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    void this.svc.cargarPagos(
      this.estadoFiltro ? { deudaEstado: this.estadoFiltro } : {},
    );
  }

  setEstadoFiltro(estado: string): void {
    this.estadoFiltro = estado;
    this.cargar();
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    try {
      return new Date(fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return fecha;
    }
  }
}
