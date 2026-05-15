import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanzasService } from '../../finanzas.service';
import { CajaResumenModel } from '../../models/caja-resumen.model';

@Component({
  selector: 'app-caja-resumen',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-content max-w-2xl">
      <div class="page-header">
        <div>
          <h1 class="page-title">Resumen de Caja</h1>
        </div>
        <button type="button" (click)="cargar()" class="btn-secondary" style="font-size:0.78rem;padding:0.35rem 0.875rem">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      @if (svc.state().isLoading) {
        <div class="empty-state">
          <div class="loading-spinner" style="margin-bottom:0.5rem"></div>
          Cargando...
        </div>
      } @else if (svc.state().errorMessage) {
        <div class="error-banner" style="margin-bottom:1rem">
          {{ svc.state().errorMessage }}
          <button type="button" (click)="cargar()" style="margin-left:0.75rem;font-weight:700;text-decoration:underline;background:none;border:none;cursor:pointer;color:inherit">Reintentar</button>
        </div>
      } @else if (svc.state().cajaResumen; as r) {
        <p style="font-size:0.75rem;color:#9CA3AF;margin-bottom:0.875rem">Fecha: {{ r.fecha }}</p>

        <!-- Hero totales -->
        <div style="background:#1F2A7C;color:#fff;border-radius:14px;padding:1.25rem;margin-bottom:0.875rem">
          <p style="font-size:0.72rem;opacity:0.75;margin:0 0 0.25rem">Total general del día</p>
          <p style="font-size:1.75rem;font-weight:800;margin:0;letter-spacing:-0.02em">S/ {{ r.totalGeneral }}</p>
          <div style="display:flex;gap:1.25rem;margin-top:0.625rem;font-size:0.75rem;opacity:0.85">
            <span>Contado: S/ {{ r.totalContado }}</span>
            <span>Crédito: S/ {{ r.totalCredito }}</span>
          </div>
        </div>

        <!-- Métodos de pago -->
        <div class="card" style="margin-bottom:0.875rem">
          <p class="section-title" style="margin-bottom:0.75rem">Por método de pago</p>
          <div style="display:flex;flex-direction:column;gap:0">
            @for (item of metodosItems(r); track item.label) {
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #F2F4FA;font-size:0.875rem">
                <span style="color:#6B7280">{{ item.label }}</span>
                <span style="font-weight:600;color:#111827">S/ {{ item.valor }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Ventas / Servicios -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.625rem;margin-bottom:1rem">
          @if (r.resumenVentas) {
            <div class="card" style="padding:0.875rem">
              <p style="font-size:0.72rem;color:#9CA3AF;margin:0 0 0.25rem">Ventas</p>
              <p style="font-size:1.05rem;font-weight:800;color:#1F2A7C;margin:0">S/ {{ r.resumenVentas.totalGeneral }}</p>
            </div>
          }
          @if (r.resumenServicios) {
            <div class="card" style="padding:0.875rem">
              <p style="font-size:0.72rem;color:#9CA3AF;margin:0 0 0.25rem">Servicios</p>
              <p style="font-size:1.05rem;font-weight:800;color:#1F2A7C;margin:0">S/ {{ r.resumenServicios.totalGeneral }}</p>
            </div>
          }
        </div>

        <a routerLink="/finanzas/caja/cierre" class="btn-primary w-full" style="display:block;text-align:center;text-decoration:none">
          Cerrar caja
        </a>
      } @else {
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>
            </svg>
          </div>
          <p class="empty-title">Sin datos de caja</p>
          <p class="empty-desc">No hay datos de caja para hoy</p>
        </div>
      }
    </div>
  `,
})
export class CajaResumenComponent implements OnInit {
  readonly svc = inject(FinanzasService);

  ngOnInit(): void { this.cargar(); }

  cargar(): void { void this.svc.cargarCajaResumen(); }

  metodosItems(r: CajaResumenModel) {
    return [
      { label: 'Efectivo', valor: r.totalEfectivo },
      { label: 'Yape', valor: r.totalYape },
      { label: 'Plin', valor: r.totalPlin },
      { label: 'Transferencia', valor: r.totalTransferencia },
      { label: 'Tarjeta', valor: r.totalTarjeta },
    ].filter(i => parseFloat(i.valor) > 0);
  }
}
