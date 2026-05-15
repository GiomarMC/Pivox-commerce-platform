import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CarritoService } from '../../carrito.service';
import { ResumenVentaService } from '../../resumen-venta.service';
import { VentaService } from '../../venta.service';

@Component({
  selector: 'app-tipo-venta',
  standalone: true,
  styles: [`
    .tv-wrap { min-height: 100dvh; background: #F4F6FB; display: flex; flex-direction: column; }
    .tv-header { background: #fff; border-bottom: 1px solid #E2E6F0; padding: 1rem; }
    .tv-body { flex: 1; padding: 1rem; max-width: 480px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
    .tv-card { width: 100%; text-align: left; padding: 1rem; border-radius: 14px; border: 2px solid #E2E6F0; background: #fff; cursor: pointer; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s; display: flex; align-items: flex-start; gap: 0.875rem; }
    .tv-card:hover { border-color: #1F2A7C; box-shadow: 0 2px 8px rgba(31,42,124,0.1); }
    .tv-card-active { border-color: #1F2A7C; box-shadow: 0 2px 8px rgba(31,42,124,0.12); }
    .tv-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .tv-card-label { font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0 0 0.2rem; line-height: 1.2; }
    .tv-card-desc { font-size: 0.78rem; color: #6B7280; margin: 0; line-height: 1.4; }
    .tv-in-progress { background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: 0.875rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .tv-in-progress-title { font-size: 0.82rem; font-weight: 700; color: #3730A3; margin: 0; }
    .tv-in-progress-subtitle { font-size: 0.75rem; color: #4338CA; margin: 0; }
    .tv-in-progress-actions { display: flex; gap: 0.5rem; }
    .tv-cards { display: flex; flex-direction: column; gap: 0.75rem; }

    @media (min-width: 768px) {
      .tv-body { max-width: 860px; }
      .tv-cards { flex-direction: row; align-items: stretch; }
      .tv-cards .tv-card { flex: 1; min-width: 220px; flex-direction: column; gap: 0.625rem; }
      .tv-cards .tv-card svg[stroke="#1F2A7C"] { align-self: flex-end; }
    }
  `],
  template: `
    <div class="tv-wrap">
      <div class="tv-header">
        <h1 style="font-size:1.1rem;font-weight:800;color:#111827;margin:0">Nueva venta</h1>
        <p style="font-size:0.8rem;color:#9CA3AF;margin:0.15rem 0 0">Selecciona el tipo de venta para continuar</p>
      </div>

      <div class="tv-body">

        @if (carritoSvc.count() > 0) {
          <div class="tv-in-progress">
            <p class="tv-in-progress-title">Tienes una venta en curso</p>
            <p class="tv-in-progress-subtitle">{{ carritoSvc.count() }} producto(s) en el carrito</p>
            <div class="tv-in-progress-actions">
              <button type="button" (click)="continuarVenta()" class="btn-primary" style="flex:1;font-size:0.8rem">
                Continuar venta
              </button>
              <button type="button" (click)="descartarVenta()" class="btn-secondary" style="flex:1;font-size:0.8rem">
                Descartar
              </button>
            </div>
          </div>
        }

        <p style="font-size:0.72rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;margin:0.25rem 0 0">Tipo de venta</p>

        <div class="tv-cards">

        <!-- Venta Normal -->
        <button type="button" (click)="seleccionar('NORMAL')" [class]="'tv-card' + (tipoActual() === 'NORMAL' ? ' tv-card-active' : '')">
          <div class="tv-icon" style="background:#DCFCE7;color:#15803D">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="1"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0">
            <p class="tv-card-label">Venta Normal</p>
            <p class="tv-card-desc">Sin comprobante SUNAT. Efectivo, tarjeta u otros métodos.</p>
          </div>
          @if (tipoActual() === 'NORMAL') {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2A7C" stroke-width="2.5" style="flex-shrink:0;margin-top:2px">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
        </button>

        <!-- Venta a Crédito -->
        <button type="button" (click)="seleccionar('CREDITO')" [class]="'tv-card' + (tipoActual() === 'CREDITO' ? ' tv-card-active' : '')">
          <div class="tv-icon" style="background:#E0F2FE;color:#0284C7">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0">
            <p class="tv-card-label">Venta a Crédito</p>
            <p class="tv-card-desc">El cliente paga después. Requiere registrar un cliente.</p>
          </div>
          @if (tipoActual() === 'CREDITO') {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2A7C" stroke-width="2.5" style="flex-shrink:0;margin-top:2px">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
        </button>

        <!-- Venta SUNAT -->
        <button type="button" (click)="seleccionar('SUNAT')" [class]="'tv-card' + (tipoActual() === 'SUNAT' ? ' tv-card-active' : '')">
          <div class="tv-icon" style="background:#FEE2E2;color:#DC2626">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0">
            <p class="tv-card-label">Venta con SUNAT</p>
            <p class="tv-card-desc">Emite Boleta o Factura electrónica. Requiere stock con factura de compra.</p>
          </div>
          @if (tipoActual() === 'SUNAT') {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2A7C" stroke-width="2.5" style="flex-shrink:0;margin-top:2px">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
        </button>

        </div><!-- /tv-cards -->

      </div>
    </div>
  `,
})
export class TipoVentaComponent {
  readonly carritoSvc = inject(CarritoService);
  private readonly resumenSvc = inject(ResumenVentaService);
  private readonly ventaSvc = inject(VentaService);
  private readonly router = inject(Router);

  readonly tipoActual = computed(() => this.resumenSvc.state().tipoVenta);

  seleccionar(value: string): void {
    this.resumenSvc.actualizar({ tipoVenta: value });
    void this.router.navigate(['/ventas/catalogo']);
  }

  continuarVenta(): void {
    void this.router.navigate(['/ventas/pedido']);
  }

  descartarVenta(): void {
    this.ventaSvc.limpiarFlujo();
  }
}
