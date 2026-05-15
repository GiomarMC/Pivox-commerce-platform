import { Component, inject, OnInit, OnDestroy, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OperacionesService } from '../operaciones.service';
import { OperacionModel } from '../models/operacion.model';
import { getTipoVentaLabel } from '../../venta/constants/tipo-venta';
import { getMetodoPagoLabel } from '../../venta/constants/metodo-pago';
import { getEstadoSunatLabel, getEstadoSunatColor } from '../../venta/constants/estado-sunat';
import { getUnidadMedidaLabel } from '../../inventario/constants/unidad-medida';
import { TiendaService } from '../../tienda/tienda.service';
import { PrintPreviewComponent } from '../../impresora/print-preview/print-preview.component';
import { TicketData } from '../../impresora/ticket.converter';

type TipoFiltro = 'TODOS' | 'VENTA' | 'SERVICIO';
type DateChip = 'HOY' | 'AYER' | 'SEMANA' | 'MES' | 'PERSONALIZADO' | null;

interface NCItemState {
  loteProductoId: number;
  nombre: string;
  cantidadOrig: string;
  precioOrig: string;
  seleccionado: boolean;
  cantidad: string;
  precioNuevo: string;
}

const NC_VENTA_TIPOS = [
  { codigo: '01', label: 'Anulación total', desc: 'Cancela toda la venta y revierte el stock' },
  { codigo: '06', label: 'Devolución total', desc: 'El cliente devuelve todos los productos' },
  { codigo: '07', label: 'Devolución por ítem', desc: 'Devolución parcial por producto específico' },
  { codigo: '09', label: 'Ajuste de precio', desc: 'Se acordó un precio menor por producto' },
];

@Component({
  selector: 'app-operaciones-historial',
  standalone: true,
  imports: [RouterLink, FormsModule, PrintPreviewComponent],
  styles: [`
    .oh-page { background:#F2F4FA; padding-bottom:2rem; }
    .oh-header { position:sticky; top:0; z-index:10; background:#fff; border-bottom:1px solid #E2E6F0; padding:0.75rem 1rem; }
    .oh-header-row { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem; }
    .oh-back-btn { display:flex; align-items:center; gap:0.25rem; font-size:0.875rem; color:#9CA3AF; background:none; border:none; cursor:pointer; padding:0; font-family:inherit; }
    .oh-title { font-size:1rem; font-weight:700; color:#111827; flex:1; margin:0; }
    .oh-search-wrap { position:relative; margin-bottom:0.75rem; }
    .oh-search-icon { position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); pointer-events:none; }
    .oh-search-input { width:100%; padding:0.5rem 0.75rem 0.5rem 2.25rem; font-size:0.875rem; border:1px solid #E2E6F0; border-radius:12px; background:#F9FAFB; outline:none; font-family:inherit; box-sizing:border-box; }
    .oh-search-input:focus { border-color:#1F2A7C; background:#fff; }
    .oh-chips-row { display:flex; gap:0.5rem; overflow-x:auto; padding-bottom:0.25rem; margin-bottom:0.5rem; scrollbar-width:none; }
    .oh-chips-row::-webkit-scrollbar { display:none; }
    .oh-date-range { display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center; }
    .oh-date-input { flex:1; padding:0.375rem 0.5rem; font-size:0.75rem; border:1px solid #E2E6F0; border-radius:8px; outline:none; font-family:inherit; }
    .oh-type-chips { display:flex; gap:0.5rem; }
    .oh-content { padding:1rem; }
    .oh-list { display:flex; flex-direction:column; gap:0.75rem; }
    .oh-op-card { background:#fff; border-radius:14px; border:1px solid #E2E6F0; padding:1rem; text-align:left; width:100%; cursor:pointer; transition:box-shadow 0.18s; display:block; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
    .oh-op-card:hover { box-shadow:0 6px 18px rgba(31,42,124,0.1); }
    .oh-op-card:active { background:#F9FAFB; }
    .oh-op-row { display:flex; gap:0.75rem; align-items:flex-start; }
    .oh-icon-wrap { width:44px; height:44px; border-radius:12px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .oh-op-info { flex:1; min-width:0; }
    .oh-op-top { display:flex; align-items:flex-start; justify-content:space-between; gap:0.5rem; margin-bottom:0.2rem; }
    .oh-op-num { font-size:0.875rem; font-weight:600; color:#111827; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0; }
    .oh-op-total { font-size:1rem; font-weight:800; color:#1F2A7C; flex-shrink:0; margin:0; letter-spacing:-0.02em; }
    .oh-op-sub { font-size:0.75rem; color:#9CA3AF; margin:0 0 0.2rem; }
    .oh-op-client { font-size:0.75rem; color:#374151; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0; }
    .oh-op-date { font-size:0.72rem; color:#9CA3AF; margin:0.2rem 0 0; }
    .oh-nc-badge { font-size:0.72rem; font-weight:700; padding:0.1rem 0.35rem; border-radius:4px; background:#DBEAFE; color:#1D4ED8; flex-shrink:0; }
    .oh-cancelled { margin-top:0.5rem; font-size:0.72rem; color:#EF4444; font-weight:600; }
    .oh-loading-more { text-align:center; padding:1rem; font-size:0.75rem; color:#9CA3AF; }
    /* Skeleton */
    .oh-skel-card { background:#fff; border-radius:14px; border:1px solid #E2E6F0; padding:1rem; animation:oh-pulse 1.5s ease-in-out infinite; }
    .oh-skel-row { display:flex; gap:0.75rem; }
    .oh-skel-icon { width:44px; height:44px; border-radius:12px; background:#F3F4F6; flex-shrink:0; }
    .oh-skel-lines { flex:1; display:flex; flex-direction:column; gap:0.5rem; }
    .oh-skel-line { background:#F3F4F6; border-radius:6px; height:10px; }
    @keyframes oh-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    /* Text color helpers */
    .oh-t-success { color:#15803D; }
    .oh-t-error { color:#DC2626; }
    .oh-t-info { color:#0284C7; }
    .oh-t-warning { color:#D97706; }
    .oh-t-neutral { color:#9CA3AF; }
    /* Bottom sheet modal */
    .oh-sheet-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:40; display:flex; align-items:flex-end; justify-content:center; }
    .oh-sheet { background:#fff; width:100%; max-width:32rem; border-radius:1rem 1rem 0 0; max-height:90vh; overflow-y:auto; }
    .oh-sheet-header { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; border-bottom:1px solid #E2E6F0; position:sticky; top:0; background:#fff; }
    .oh-sheet-title { font-size:0.875rem; font-weight:600; color:#111827; margin:0; }
    .oh-sheet-sub { font-size:0.72rem; color:#9CA3AF; margin:0; }
    .oh-close-btn { width:28px; height:28px; border-radius:8px; background:#F4F6FB; border:none; display:flex; align-items:center; justify-content:center; color:#6B7280; cursor:pointer; flex-shrink:0; }
    .oh-sheet-body { padding:1rem; display:flex; flex-direction:column; gap:1rem; }
    /* Info sections */
    .oh-section { background:#F9FAFB; border-radius:12px; padding:0.75rem; }
    .oh-section-title { font-size:0.72rem; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 0.5rem; }
    .oh-info-row { display:flex; justify-content:space-between; font-size:0.75rem; padding:0.2rem 0; }
    .oh-info-label { color:#9CA3AF; }
    .oh-info-total { display:flex; justify-content:space-between; font-size:0.875rem; font-weight:700; padding:0.2rem 0; }
    /* Product items */
    .oh-product { display:flex; gap:0.75rem; background:#F9FAFB; border-radius:12px; padding:0.75rem; border:1px solid #E2E6F0; }
    .oh-product.averiado { border-color:#FDE68A; background:#FFFBEB; }
    .oh-product-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .oh-product-info { flex:1; min-width:0; }
    .oh-product-name { font-size:0.75rem; font-weight:600; color:#111827; margin:0; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .oh-product-code { font-size:0.72rem; color:#9CA3AF; font-family:monospace; margin:0.15rem 0 0; }
    .oh-product-price { font-size:0.875rem; font-weight:700; color:#1F2A7C; flex-shrink:0; margin:0; }
    .oh-product-qty { font-size:0.75rem; color:#9CA3AF; }
    .oh-badge-averiado { font-size:0.72rem; font-weight:600; background:#FEF3C7; color:#D97706; padding:0.1rem 0.375rem; border-radius:99px; }
    /* NC banner */
    .oh-nc-banner { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:0.75rem; }
    .oh-nc-title { font-size:0.75rem; font-weight:700; color:#1E40AF; margin:0 0 0.25rem; }
    .oh-nc-num { font-size:0.75rem; color:#1D4ED8; font-weight:600; margin:0; }
    .oh-nc-detail { font-size:0.72rem; color:#3B82F6; margin:0.15rem 0 0; }
    /* Reject banner */
    .oh-reject-banner { background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:0.75rem; font-size:0.75rem; color:#DC2626; }
    /* Action buttons */
    .oh-action-ghost { width:100%; padding:0.625rem; font-size:0.875rem; color:#374151; border:1px solid #E2E6F0; border-radius:12px; background:transparent; cursor:pointer; font-family:inherit; transition:background 0.15s; }
    .oh-action-ghost:hover { background:#F9FAFB; }
    .oh-action-ghost:disabled { opacity:0.5; cursor:not-allowed; }
    .oh-action-danger { width:100%; padding:0.625rem; font-size:0.875rem; color:#DC2626; border:1px solid #FECACA; border-radius:12px; background:transparent; cursor:pointer; font-family:inherit; transition:background 0.15s; }
    .oh-action-danger:hover { background:#FEF2F2; }
    .oh-action-danger:disabled { opacity:0.5; cursor:not-allowed; }
    /* Confirm modal */
    .oh-confirm-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:50; display:flex; align-items:center; justify-content:center; padding:1rem; }
    .oh-confirm-modal { background:#fff; border-radius:16px; width:100%; max-width:22rem; box-shadow:0 8px 32px rgba(0,0,0,0.12); padding:1.25rem; }
    /* NC modals */
    .oh-nc-sheet-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:50; display:flex; align-items:flex-end; justify-content:center; }
    .oh-nc-sheet { background:#fff; width:100%; max-width:32rem; border-radius:1rem 1rem 0 0; max-height:92vh; overflow-y:auto; }
    .oh-nc-tipo-btn { display:flex; align-items:flex-start; gap:0.75rem; padding:0.75rem; border-radius:12px; border:2px solid #E2E6F0; background:#fff; width:100%; text-align:left; cursor:pointer; font-family:inherit; transition:border-color 0.15s,background 0.15s; }
    .oh-nc-tipo-btn.active { border-color:#1F2A7C; background:#EEF0FB; }
    .oh-nc-radio { margin-top:2px; width:16px; height:16px; border-radius:50%; border:2px solid #D1D5DB; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .oh-nc-radio.active { border-color:#1F2A7C; }
    .oh-nc-radio-dot { width:8px; height:8px; border-radius:50%; background:#1F2A7C; }
    .oh-nc-item { border:1px solid #E2E6F0; border-radius:12px; padding:0.75rem; }
    .oh-nc-item.selected { border-color:#1F2A7C; background:rgba(238,240,251,0.3); }
    .oh-nc-item-indent { margin-top:0.5rem; padding-left:1.5rem; }
    .oh-nc-serv-body { padding:1.25rem; display:flex; flex-direction:column; gap:0.75rem; }
  `],
  template: `
    <div class="oh-page">
      <!-- Header -->
      <div class="oh-header">
        <div class="oh-header-row">
          <a routerLink="/operaciones" class="oh-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </a>
          <h1 class="oh-title">Historial de Operaciones</h1>
        </div>

        <!-- Search -->
        <div class="oh-search-wrap">
          <span class="oh-search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            type="text"
            [(ngModel)]="searchText"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar por comprobante o cliente..."
            class="oh-search-input"
          />
        </div>

        <!-- Date chips -->
        <div class="oh-chips-row">
          @for (chip of dateChips; track chip.value) {
            <button
              type="button"
              (click)="selectDateChip(chip.value)"
              [class]="chipClass(activeDateChip() === chip.value)"
              style="white-space:nowrap;flex-shrink:0"
            >{{ chip.label }}</button>
          }
        </div>

        <!-- Custom date range -->
        @if (activeDateChip() === 'PERSONALIZADO') {
          <div class="oh-date-range">
            <input type="date" [(ngModel)]="fechaDesde" (ngModelChange)="aplicarFiltros()" class="oh-date-input" />
            <span style="font-size:0.75rem;color:#9CA3AF;flex-shrink:0">—</span>
            <input type="date" [(ngModel)]="fechaHasta" (ngModelChange)="aplicarFiltros()" class="oh-date-input" />
          </div>
        }

        <!-- Type chips -->
        <div class="oh-type-chips">
          @for (t of tipoChips; track t.value) {
            <button type="button" (click)="selectTipo(t.value)" [class]="chipClass(tipoFiltro() === t.value)">
              {{ t.label }}
            </button>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="oh-content">
        @if (svc.state().isLoading) {
          <div class="oh-list">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="oh-skel-card">
                <div class="oh-skel-row">
                  <div class="oh-skel-icon"></div>
                  <div class="oh-skel-lines">
                    <div class="oh-skel-line" style="width:65%"></div>
                    <div class="oh-skel-line" style="width:45%"></div>
                    <div class="oh-skel-line" style="width:75%"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (svc.state().operaciones.length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p class="empty-title">Sin operaciones</p>
            <p class="empty-desc">No hay registros para los filtros aplicados</p>
          </div>
        } @else {
          <div class="oh-list">
            @for (op of svc.state().operaciones; track op.id) {
              <button type="button" (click)="abrirDetalle(op)" class="oh-op-card"
                [style.border-left]="op.isCancelada ? '3px solid #9CA3AF' : op.tipo === 'VENTA' ? '3px solid #1D4ED8' : '3px solid #16A34A'">
                <div class="oh-op-row">
                  <div class="oh-icon-wrap"
                    [style.background]="op.tipo === 'VENTA' ? '#EFF6FF' : '#F0FDF4'"
                    [style.color]="op.tipo === 'VENTA' ? '#1D4ED8' : '#16A34A'">
                    @if (op.tipo === 'VENTA') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                      </svg>
                    } @else {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                    }
                  </div>
                  <div class="oh-op-info">
                    <div class="oh-op-top">
                      <div style="display:flex;align-items:center;gap:0.375rem;min-width:0">
                        <p class="oh-op-num">{{ op.numeroComprobante }}</p>
                        @if ((op.tipo === 'VENTA' && op.notaCredito) || (op.tipo === 'SERVICIO' && op.notaCreditoServicio)) {
                          <span class="oh-nc-badge">NC</span>
                        }
                      </div>
                      <p class="oh-op-total">S/ {{ op.total.toFixed(2) }}</p>
                    </div>
                    <p class="oh-op-sub">
                      {{ getTipoLabel(op) }}
                      @if (op.estadoSunat) {
                        · <span [class]="sunatTextClass(op.estadoSunat)">{{ getEstadoSunatLabel(op.estadoSunat) }}</span>
                      }
                    </p>
                    @if (op.clienteNombre) {
                      <p class="oh-op-client">{{ op.clienteNombre }}</p>
                    }
                    <p class="oh-op-date">{{ formatFecha(op.fecha) }}</p>
                  </div>
                </div>
                @if (op.isCancelada && op.tipo === 'VENTA') {
                  <div class="oh-cancelled">Cancelada</div>
                }
              </button>
            }
          </div>

          @if (svc.state().isLoadingMore) {
            <div class="oh-loading-more">Cargando más...</div>
          }
        }
      </div>
    </div>

    <!-- Detail Modal -->
    @if (detalleAbierto(); as op) {
      <div class="oh-sheet-backdrop" (click)="cerrarDetalle()">
        <div class="oh-sheet" (click)="$event.stopPropagation()">
          <div class="oh-sheet-header">
            <div>
              <p class="oh-sheet-title">{{ op.numeroComprobante }}</p>
              <p class="oh-sheet-sub">{{ getTipoLabel(op) }}</p>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              @if (op.estadoSunat) {
                <span [class]="sunatBadgeClass(op.estadoSunat)">{{ getEstadoSunatLabel(op.estadoSunat) }}</span>
              }
              <button type="button" (click)="cerrarDetalle()" class="oh-close-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="oh-sheet-body">
            @if (op.estadoSunat === 'RECHAZADO' && op.motivoRechazo) {
              <div class="oh-reject-banner">{{ op.motivoRechazo }}</div>
            }

            <!-- Financiero -->
            <div class="oh-section">
              <p class="oh-section-title">Financiero</p>
              @if (op.tipo === 'VENTA' && op.igvTotal) {
                <div class="oh-info-row">
                  <span class="oh-info-label">Subtotal</span><span>S/ {{ op.subtotal }}</span>
                </div>
                <div class="oh-info-row">
                  <span class="oh-info-label">IGV (18%)</span><span>S/ {{ op.igvTotal }}</span>
                </div>
              }
              <div class="oh-info-total">
                <span>Total</span><span style="color:#1F2A7C">S/ {{ op.total.toFixed(2) }}</span>
              </div>
              @if (op.deuda > 0) {
                <div class="oh-info-row" style="color:#D97706;font-weight:600">
                  <span>Deuda pendiente</span><span>S/ {{ op.deuda.toFixed(2) }}</span>
                </div>
              }
              @if (op.metodoPago) {
                <div class="oh-info-row">
                  <span class="oh-info-label">Método de pago</span><span>{{ getMetodoPagoLabel(op.metodoPago) }}</span>
                </div>
              }
            </div>

            <!-- Productos -->
            @if (op.tipo === 'VENTA' && op.detalles.length > 0) {
              <div>
                <p class="oh-section-title">Productos · {{ op.detalles.length }} ítem{{ op.detalles.length !== 1 ? 's' : '' }}</p>
                <div style="display:flex;flex-direction:column;gap:0.5rem">
                  @for (d of op.detalles; track d.id) {
                    <div class="oh-product" [class.averiado]="d.esAveriado">
                      <div class="oh-product-icon"
                        [style.background]="d.esAveriado ? '#FEF3C7' : '#F4F6FB'"
                        [style.color]="d.esAveriado ? '#D97706' : '#9CA3AF'"
                        [style.border]="d.esAveriado ? 'none' : '1px solid #E2E6F0'">
                        @if (d.esAveriado) {
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                          </svg>
                        } @else {
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                            <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
                          </svg>
                        }
                      </div>
                      <div class="oh-product-info">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem">
                          <div style="min-width:0">
                            <p class="oh-product-name">{{ d.productoNombre }}</p>
                            <p class="oh-product-code">{{ d.productoCodigo }}</p>
                          </div>
                          <p class="oh-product-price">S/ {{ d.subtotal }}</p>
                        </div>
                        <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.375rem;flex-wrap:wrap">
                          <span class="oh-product-qty">{{ d.cantidad }} {{ getUnidadLabel(d.unidadMedida) }} × S/ {{ d.precioUnitario }}</span>
                          @if (d.esAveriado) {
                            <span class="oh-badge-averiado">Averiado</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Cliente -->
            @if (op.clienteNombre) {
              <div class="oh-section">
                <p class="oh-section-title">Cliente</p>
                <p style="font-size:0.875rem;color:#111827;margin:0">{{ op.clienteNombre }}</p>
              </div>
            }

            <!-- Servicio -->
            @if (op.tipo === 'SERVICIO') {
              <div class="oh-section">
                <p class="oh-section-title">Servicio</p>
                @if (op.descripcion) {
                  <div class="oh-info-row">
                    <span class="oh-info-label">Descripción</span>
                    <span style="text-align:right;flex:1;padding-left:1rem">{{ op.descripcion }}</span>
                  </div>
                }
                @if (op.fechaInicio && op.fechaFin) {
                  <div class="oh-info-row">
                    <span class="oh-info-label">Período</span>
                    <span>{{ op.fechaInicio }} — {{ op.fechaFin }}</span>
                  </div>
                }
              </div>
            }

            <!-- NC Venta -->
            @if (op.tipo === 'VENTA' && op.notaCredito; as nc) {
              <div class="oh-nc-banner">
                <p class="oh-nc-title">Nota de crédito emitida</p>
                <p class="oh-nc-num">N° {{ nc.numero }}</p>
                @if (nc.tipoComprobanteDisplay) { <p class="oh-nc-detail">{{ nc.tipoComprobanteDisplay }}</p> }
                @if (nc.motivo) { <p class="oh-nc-detail">{{ nc.motivo }}</p> }
                @if (nc.urlPdfA4 || nc.urlPdfTicket) {
                  <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
                    @if (nc.urlPdfA4) {
                      <button type="button" (click)="descargarNcPdf(nc.urlPdfA4!)" class="btn-secondary" style="flex:1;font-size:0.78rem">Ver PDF</button>
                    }
                    @if (nc.urlPdfTicket) {
                      <button type="button" (click)="imprimirNcExistente(nc.urlPdfTicket!)" class="btn-primary" style="flex:1;font-size:0.78rem;background:#D97706;border-color:#D97706">Imprimir NC</button>
                    }
                  </div>
                }
              </div>
            }

            <!-- NC Servicio -->
            @if (op.tipo === 'SERVICIO' && op.notaCreditoServicio; as nc) {
              <div class="oh-nc-banner">
                <p class="oh-nc-title">Nota de crédito emitida</p>
                <p class="oh-nc-num">N° {{ nc.numero }}</p>
                @if (nc.estado) { <p class="oh-nc-detail">{{ nc.estado }}</p> }
                @if (nc.pdfA4 || nc.pdfTicket) {
                  <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
                    @if (nc.pdfA4) {
                      <button type="button" (click)="descargarNcPdf(nc.pdfA4!)" class="btn-secondary" style="flex:1;font-size:0.78rem">Ver PDF</button>
                    }
                    @if (nc.pdfTicket) {
                      <button type="button" (click)="imprimirNcExistente(nc.pdfTicket!)" class="btn-primary" style="flex:1;font-size:0.78rem;background:#D97706;border-color:#D97706">Imprimir NC</button>
                    }
                  </div>
                }
              </div>
            }

            <!-- Registro -->
            <div class="oh-section">
              <p class="oh-section-title">Registro</p>
              <div class="oh-info-row">
                <span class="oh-info-label">Fecha</span><span>{{ op.fecha }}</span>
              </div>
              <div class="oh-info-row">
                <span class="oh-info-label">Estado</span>
                <span [style.color]="op.isActive ? '#15803D' : '#EF4444'">
                  {{ op.isActive ? 'Activo' : (op.tipo === 'VENTA' ? 'Cancelado' : 'Inactivo') }}
                </span>
              </div>
            </div>

            @if (svc.state().errorMessage) { <div class="error-banner">{{ svc.state().errorMessage }}</div> }
            @if (svc.state().successMessage) { <div class="success-banner">{{ svc.state().successMessage }}</div> }

            <!-- Acciones -->
            <div style="display:flex;flex-direction:column;gap:0.5rem;padding-bottom:0.5rem">
              <button type="button" (click)="imprimirDesdeDetalle(op)"
                class="btn-primary w-full" style="background:#D97706;border-color:#D97706">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Imprimir ticket
              </button>
              @if (op.urlPdfTicket) {
                <button type="button" (click)="descargarPdf(op)" class="btn-secondary w-full">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Descargar PDF
                </button>
              }
              @if (puedeNotaCreditoVenta(op)) {
                <button type="button" (click)="abrirNotaCreditoVenta(op)" [disabled]="svc.state().isSaving" class="oh-action-ghost">Emitir nota de crédito</button>
              }
              @if (puedeNotaCreditoServicio(op)) {
                <button type="button" (click)="abrirNotaCreditoServicio(op)" [disabled]="svc.state().isSaving" class="oh-action-ghost">Emitir nota de crédito</button>
              }
              @if (puedeAnularVenta(op)) {
                <button type="button" (click)="abrirConfirmAnularVenta(op)" [disabled]="svc.state().isSaving" class="oh-action-danger">Anular venta</button>
              }
              @if (puedeCancelarVenta(op)) {
                <button type="button" (click)="abrirConfirmCancelarVenta(op)" [disabled]="svc.state().isSaving" class="oh-action-danger">Cancelar venta</button>
              }
              @if (puedeAnularServicio(op)) {
                <button type="button" (click)="abrirConfirmAnularServicio(op)" [disabled]="svc.state().isSaving" class="oh-action-danger">Anular servicio</button>
              }
              @if (puedeEliminarServicio(op)) {
                <button type="button" (click)="abrirConfirmEliminarServicio(op)" [disabled]="svc.state().isSaving" class="oh-action-danger">Eliminar servicio</button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Modal -->
    @if (confirmModal(); as cm) {
      <div class="oh-confirm-backdrop">
        <div class="oh-confirm-modal">
          <p style="font-size:0.875rem;font-weight:700;color:#111827;margin:0 0 0.25rem">{{ cm.titulo }}</p>
          <p style="font-size:0.75rem;color:#9CA3AF;margin:0 0 1rem">{{ cm.descripcion }}</p>
          @if (cm.conMotivo) {
            <textarea [(ngModel)]="motivoInput" rows="2" [placeholder]="cm.motivoPlaceholder ?? 'Motivo...'"
              class="field-textarea" style="margin-bottom:0.75rem">
            </textarea>
          }
          <div style="display:flex;gap:0.5rem">
            <button type="button" (click)="confirmModal.set(null)" class="btn-secondary" style="flex:1">Cancelar</button>
            <button type="button" (click)="ejecutarConfirm()"
              [disabled]="svc.state().isSaving || (cm.conMotivo && !motivoInput.trim())"
              [class]="cm.destructivo ? 'btn-danger' : 'btn-primary'" style="flex:1">
              @if (svc.state().isSaving) { Procesando... } @else { {{ cm.boton }} }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- NC Venta Modal -->
    @if (notaCreditoVentaOp(); as ncOp) {
      <div class="oh-nc-sheet-backdrop">
        <div class="oh-nc-sheet">
          <div class="oh-sheet-header">
            <p class="oh-sheet-title">Nota de crédito — Venta</p>
            <button type="button" (click)="notaCreditoVentaOp.set(null)" class="oh-close-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="oh-sheet-body">
            <!-- Tipo -->
            <div>
              <p class="oh-section-title" style="margin-bottom:0.5rem">Tipo de nota de crédito</p>
              <div style="display:flex;flex-direction:column;gap:0.5rem">
                @for (t of ncVentaTipos; track t.codigo) {
                  <button type="button" (click)="ncVentaTipo = t.codigo; ncVentaError = ''"
                    [class]="ncVentaTipo === t.codigo ? 'oh-nc-tipo-btn active' : 'oh-nc-tipo-btn'">
                    <span [class]="ncVentaTipo === t.codigo ? 'oh-nc-radio active' : 'oh-nc-radio'">
                      @if (ncVentaTipo === t.codigo) { <span class="oh-nc-radio-dot"></span> }
                    </span>
                    <div>
                      <p style="font-size:0.875rem;font-weight:600;margin:0" [style.color]="ncVentaTipo === t.codigo ? '#1F2A7C' : '#111827'">
                        {{ t.codigo }} — {{ t.label }}
                      </p>
                      <p style="font-size:0.72rem;color:#9CA3AF;margin:0.15rem 0 0">{{ t.desc }}</p>
                    </div>
                  </button>
                }
              </div>
            </div>

            <!-- Ítems -->
            @if (ncVentaRequiereItems()) {
              <div>
                <p class="oh-section-title" style="margin-bottom:0.5rem">
                  {{ ncVentaTipo === '07' ? 'Productos a devolver' : 'Productos con ajuste de precio' }}
                </p>
                @if (ncVentaItems().length === 0) {
                  <p style="font-size:0.75rem;color:#9CA3AF;font-style:italic">No hay ítems disponibles</p>
                } @else {
                  <div style="display:flex;flex-direction:column;gap:0.5rem">
                    @for (item of ncVentaItems(); track item.loteProductoId; let i = $index) {
                      <div [class]="item.seleccionado ? 'oh-nc-item selected' : 'oh-nc-item'">
                        <label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer">
                          <input type="checkbox" [checked]="item.seleccionado" (change)="toggleNcItem(i)" style="margin-top:2px;accent-color:#1F2A7C" />
                          <div style="flex:1;min-width:0">
                            <p style="font-size:0.75rem;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0">{{ item.nombre }}</p>
                            <p style="font-size:0.72rem;color:#9CA3AF;margin:0.15rem 0 0">
                              {{ ncVentaTipo === '07' ? 'Cantidad: ' + item.cantidadOrig : 'Precio actual: S/ ' + item.precioOrig }}
                            </p>
                          </div>
                        </label>
                        @if (item.seleccionado) {
                          <div class="oh-nc-item-indent">
                            @if (ncVentaTipo === '07') {
                              <input type="number" [value]="item.cantidad"
                                (input)="updateNcItemCantidad(i, $any($event.target).value)"
                                [max]="item.cantidadOrig" min="0.01" step="0.01"
                                placeholder="Cantidad a devolver" class="field-input" style="font-size:0.75rem" />
                            } @else {
                              <input type="number" [value]="item.precioNuevo"
                                (input)="updateNcItemPrecio(i, $any($event.target).value)"
                                [max]="item.precioOrig" min="0.01" step="0.01"
                                placeholder="Precio nuevo (menor al actual)" class="field-input" style="font-size:0.75rem" />
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- Motivo -->
            <div class="field-group">
              <label class="field-label">Motivo</label>
              <textarea [(ngModel)]="motivoInput" rows="2" placeholder="Motivo de la nota de crédito..." class="field-textarea"></textarea>
            </div>

            @if (ncVentaError) { <p style="font-size:0.75rem;color:#DC2626">{{ ncVentaError }}</p> }
            @if (svc.state().errorMessage) { <div class="error-banner">{{ svc.state().errorMessage }}</div> }

            <div style="display:flex;gap:0.5rem;padding-bottom:0.5rem">
              <button type="button" (click)="notaCreditoVentaOp.set(null)" class="btn-secondary" style="flex:1">Cancelar</button>
              <button type="button" (click)="confirmarNotaCreditoVenta()" [disabled]="svc.state().isSaving" class="btn-primary" style="flex:1">
                @if (svc.state().isSaving) { Procesando... } @else { Emitir }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- NC Servicio Modal -->
    @if (notaCreditoServicioOp()) {
      <div class="oh-confirm-backdrop">
        <div class="oh-confirm-modal" style="max-width:24rem">
          <p style="font-size:0.875rem;font-weight:700;color:#111827;margin:0 0 0.75rem">Nota de crédito — Servicio</p>
          <div class="oh-nc-serv-body" style="padding:0">
            <div class="field-group">
              <label class="field-label">Tipo</label>
              <select [(ngModel)]="ncServicioTipo" class="field-select">
                <option value="01">01 — Anulación total</option>
                <option value="09">09 — Disminución en valor</option>
              </select>
            </div>
            @if (ncServicioTipo === '09') {
              <div class="field-group">
                <label class="field-label">Nuevo total (S/)</label>
                <input type="number" [(ngModel)]="ncServicioPrecioNuevo" step="0.01" min="0.01" placeholder="0.00" class="field-input" />
              </div>
            }
            <div class="field-group">
              <label class="field-label">Motivo</label>
              <textarea [(ngModel)]="motivoInput" rows="2" placeholder="Motivo..." class="field-textarea"></textarea>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:0.25rem">
              <button type="button" (click)="notaCreditoServicioOp.set(null)" class="btn-secondary" style="flex:1">Cancelar</button>
              <button type="button" (click)="confirmarNotaCreditoServicio()"
                [disabled]="svc.state().isSaving || !motivoInput.trim()" class="btn-primary" style="flex:1">
                @if (svc.state().isSaving) { Procesando... } @else { Emitir }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Print preview -->
    @if (mostrarPreview()) {
      <app-print-preview
        [pdfUrl]="previewPdfUrl()"
        [pdfBlob]="previewPdfBlob()"
        [ticketData]="previewTicketData()"
        (cerrar)="mostrarPreview.set(false)"
      />
    }
  `,
})
export class OperacionesHistorialComponent implements OnInit, OnDestroy {
  readonly svc = inject(OperacionesService);
  private readonly tiendaSvc = inject(TiendaService);

  // Filters
  searchText = '';
  fechaDesde = '';
  fechaHasta = '';
  readonly tipoFiltro = signal<TipoFiltro>('TODOS');
  readonly activeDateChip = signal<DateChip>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly dateChips: { label: string; value: DateChip }[] = [
    { label: 'Hoy', value: 'HOY' },
    { label: 'Ayer', value: 'AYER' },
    { label: 'Esta semana', value: 'SEMANA' },
    { label: 'Este mes', value: 'MES' },
    { label: 'Personalizado', value: 'PERSONALIZADO' },
  ];

  readonly tipoChips: { label: string; value: TipoFiltro }[] = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Ventas', value: 'VENTA' },
    { label: 'Servicios', value: 'SERVICIO' },
  ];

  // Detail modal
  readonly detalleAbierto = signal<OperacionModel | null>(null);

  // Confirm modal
  readonly confirmModal = signal<{
    titulo: string;
    descripcion: string;
    boton: string;
    destructivo: boolean;
    conMotivo: boolean;
    motivoPlaceholder?: string;
    accion: () => Promise<void>;
  } | null>(null);
  motivoInput = '';

  // Nota crédito — venta
  readonly notaCreditoVentaOp = signal<OperacionModel | null>(null);
  ncVentaTipo = '01';
  ncVentaItems = signal<NCItemState[]>([]);
  ncVentaError = '';
  readonly ncVentaTipos = NC_VENTA_TIPOS;

  // Nota crédito — servicio
  readonly notaCreditoServicioOp = signal<OperacionModel | null>(null);
  ncServicioTipo = '01';
  ncServicioPrecioNuevo = '';

  // Print preview
  readonly mostrarPreview = signal(false);
  readonly previewPdfUrl = signal<string | null>(null);
  readonly previewPdfBlob = signal<Blob | null>(null);
  readonly previewTicketData = signal<TicketData | null>(null);

  readonly getTipoVentaLabel = getTipoVentaLabel;
  readonly getMetodoPagoLabel = getMetodoPagoLabel;
  readonly getEstadoSunatLabel = getEstadoSunatLabel;

  getUnidadLabel(code: string): string {
    return getUnidadMedidaLabel(code);
  }

  ngOnInit(): void {
    void this.svc.cargarHistorial({});
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onSearchChange(_val: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.aplicarFiltros(), 300);
  }

  selectDateChip(chip: DateChip): void {
    if (this.activeDateChip() === chip) {
      this.activeDateChip.set(null);
      this.fechaDesde = '';
      this.fechaHasta = '';
      this.aplicarFiltros();
      return;
    }
    this.activeDateChip.set(chip);
    if (chip !== 'PERSONALIZADO') {
      const { desde, hasta } = this.calcDateRange(chip);
      this.fechaDesde = desde;
      this.fechaHasta = hasta;
      this.aplicarFiltros();
    }
  }

  private calcDateRange(chip: DateChip): { desde: string; hasta: string } {
    const now = new Date();
    const today = this.toIso(now);
    if (chip === 'HOY') return { desde: today, hasta: today };
    if (chip === 'AYER') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const ayer = this.toIso(y);
      return { desde: ayer, hasta: ayer };
    }
    if (chip === 'SEMANA') {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      return { desde: this.toIso(start), hasta: today };
    }
    if (chip === 'MES') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { desde: this.toIso(start), hasta: today };
    }
    return { desde: '', hasta: '' };
  }

  private toIso(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  selectTipo(tipo: TipoFiltro): void {
    this.tipoFiltro.set(tipo);
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    void this.svc.cargarHistorial({
      tipo: this.tipoFiltro(),
      search: this.searchText || undefined,
      fechaDesde: this.fechaDesde || undefined,
      fechaHasta: this.fechaHasta || undefined,
    });
  }

  chipClass(activo: boolean): string {
    return activo ? 'chip chip-active' : 'chip';
  }

  getTipoLabel(op: OperacionModel): string {
    if (op.tipo === 'VENTA') return getTipoVentaLabel(op.tipoVenta);
    return op.tipoDisplay || op.tipoVenta;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    try {
      return new Date(fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return fecha;
    }
  }

  sunatBadgeClass(estado: string): string {
    const color = getEstadoSunatColor(estado);
    const map: Record<string, string> = {
      success: 'badge badge-success',
      error: 'badge badge-error',
      info: 'badge badge-info',
      warning: 'badge badge-warning',
      neutral: 'badge badge-zinc',
    };
    return map[color] ?? map['neutral'];
  }

  sunatTextClass(estado: string): string {
    const color = getEstadoSunatColor(estado);
    const map: Record<string, string> = {
      success: 'oh-t-success',
      error: 'oh-t-error',
      info: 'oh-t-info',
      warning: 'oh-t-warning',
      neutral: 'oh-t-neutral',
    };
    return map[color] ?? map['neutral'];
  }

  // --- Business rules ---

  puedeAnularVenta(op: OperacionModel): boolean {
    if (op.tipo !== 'VENTA' || !op.isActive || op.estadoSunat !== 'ACEPTADO') return false;
    const tipo = op.tipoComprobante;
    const fecha = new Date(op.fecha);
    const now = new Date();
    if (tipo === '01') {
      const diff = (now.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }
    if (tipo === '03') {
      return this.toIso(fecha) === this.toIso(now);
    }
    return true;
  }

  puedeCancelarVenta(op: OperacionModel): boolean {
    return op.tipo === 'VENTA' && op.isActive && op.tipoVenta !== 'SUNAT';
  }

  puedeNotaCreditoVenta(op: OperacionModel): boolean {
    return op.tipo === 'VENTA' && op.isActive && op.estadoSunat === 'ACEPTADO' && !op.notaCredito;
  }

  puedeAnularServicio(op: OperacionModel): boolean {
    return op.tipo === 'SERVICIO' && op.isActive && op.estadoSunat === 'ACEPTADO';
  }

  puedeEliminarServicio(op: OperacionModel): boolean {
    return op.tipo === 'SERVICIO' && op.isActive && op.estadoSunat !== 'ACEPTADO' && op.estadoSunat !== 'ANULADO';
  }

  puedeNotaCreditoServicio(op: OperacionModel): boolean {
    return op.tipo === 'SERVICIO' && op.isActive && op.estadoSunat === 'ACEPTADO';
  }

  // --- Detail modal ---

  abrirDetalle(op: OperacionModel): void {
    this.svc.limpiarMensajes();
    this.detalleAbierto.set(op);
  }

  cerrarDetalle(): void {
    this.detalleAbierto.set(null);
    this.svc.limpiarMensajes();
  }

  // --- Acciones ---

  abrirConfirmAnularVenta(op: OperacionModel): void {
    this.motivoInput = '';
    this.confirmModal.set({
      titulo: 'Anular venta',
      descripcion: `¿Anular la venta ${op.numeroComprobante}? Esta acción enviará una nota de anulación a SUNAT.`,
      boton: 'Anular',
      destructivo: true,
      conMotivo: true,
      motivoPlaceholder: 'Motivo de anulación...',
      accion: async () => {
        const ok = await this.svc.anularVenta(op.id, this.motivoInput);
        if (ok) {
          this.confirmModal.set(null);
          this.detalleAbierto.update(d => d ? { ...d, isActive: false, estadoSunat: 'ANULADO' } : d);
        }
      },
    });
  }

  abrirConfirmCancelarVenta(op: OperacionModel): void {
    this.motivoInput = '';
    this.confirmModal.set({
      titulo: 'Cancelar venta',
      descripcion: `¿Cancelar la venta ${op.numeroComprobante}? Esta acción no se puede deshacer.`,
      boton: 'Cancelar venta',
      destructivo: true,
      conMotivo: false,
      accion: async () => {
        const ok = await this.svc.cancelarVenta(op.id);
        if (ok) {
          this.confirmModal.set(null);
          this.detalleAbierto.update(d => d ? { ...d, isActive: false, isCancelada: true } : d);
        }
      },
    });
  }

  abrirConfirmAnularServicio(op: OperacionModel): void {
    this.motivoInput = '';
    this.confirmModal.set({
      titulo: 'Anular servicio',
      descripcion: `¿Anular el servicio ${op.numeroComprobante}?`,
      boton: 'Anular',
      destructivo: true,
      conMotivo: true,
      motivoPlaceholder: 'Motivo de anulación...',
      accion: async () => {
        const ok = await this.svc.anularServicio(op.id, this.motivoInput);
        if (ok) {
          this.confirmModal.set(null);
          this.detalleAbierto.update(d => d ? { ...d, estadoSunat: 'ANULADO' } : d);
        }
      },
    });
  }

  abrirConfirmEliminarServicio(op: OperacionModel): void {
    this.confirmModal.set({
      titulo: 'Eliminar servicio',
      descripcion: `¿Eliminar el servicio ${op.numeroComprobante}? Esta acción no se puede deshacer.`,
      boton: 'Eliminar',
      destructivo: true,
      conMotivo: false,
      accion: async () => {
        const ok = await this.svc.eliminarServicio(op.id);
        if (ok) {
          this.confirmModal.set(null);
          this.detalleAbierto.set(null);
        }
      },
    });
  }

  async ejecutarConfirm(): Promise<void> {
    const cm = this.confirmModal();
    if (!cm) return;
    await cm.accion();
  }

  // --- Nota crédito ---

  readonly ncVentaRequiereItems = (): boolean =>
    this.ncVentaTipo === '07' || this.ncVentaTipo === '09';

  abrirNotaCreditoVenta(op: OperacionModel): void {
    this.motivoInput = '';
    this.ncVentaTipo = '01';
    this.ncVentaError = '';
    this.ncVentaItems.set(
      op.detalles
        .filter(d => d.loteProductoId != null)
        .map(d => ({
          loteProductoId: d.loteProductoId!,
          nombre: d.productoNombre,
          cantidadOrig: d.cantidad,
          precioOrig: d.precioUnitario,
          seleccionado: false,
          cantidad: d.cantidad,
          precioNuevo: '',
        })),
    );
    this.notaCreditoVentaOp.set(op);
  }

  toggleNcItem(index: number): void {
    this.ncVentaItems.update(items =>
      items.map((it, i) => i === index ? { ...it, seleccionado: !it.seleccionado } : it),
    );
  }

  updateNcItemCantidad(index: number, val: string): void {
    this.ncVentaItems.update(items =>
      items.map((it, i) => i === index ? { ...it, cantidad: val } : it),
    );
  }

  updateNcItemPrecio(index: number, val: string): void {
    this.ncVentaItems.update(items =>
      items.map((it, i) => i === index ? { ...it, precioNuevo: val } : it),
    );
  }

  private validarNcVenta(): boolean {
    if (!this.motivoInput.trim()) {
      this.ncVentaError = 'El motivo es requerido';
      return false;
    }
    if (!this.ncVentaRequiereItems()) return true;
    const sel = this.ncVentaItems().filter(it => it.seleccionado);
    if (sel.length === 0) {
      this.ncVentaError = 'Selecciona al menos un producto';
      return false;
    }
    for (const it of sel) {
      if (this.ncVentaTipo === '07') {
        const cant = parseFloat(it.cantidad);
        const orig = parseFloat(it.cantidadOrig);
        if (!cant || cant <= 0) { this.ncVentaError = `Cantidad inválida para ${it.nombre}`; return false; }
        if (cant > orig) { this.ncVentaError = `La cantidad no puede superar ${it.cantidadOrig} para ${it.nombre}`; return false; }
      } else {
        const precio = parseFloat(it.precioNuevo);
        const orig = parseFloat(it.precioOrig);
        if (!precio || precio <= 0) { this.ncVentaError = `Precio inválido para ${it.nombre}`; return false; }
        if (precio >= orig) { this.ncVentaError = `El precio nuevo debe ser menor a S/ ${it.precioOrig} para ${it.nombre}`; return false; }
      }
    }
    this.ncVentaError = '';
    return true;
  }

  async confirmarNotaCreditoVenta(): Promise<void> {
    const op = this.notaCreditoVentaOp();
    if (!op) return;
    if (!this.validarNcVenta()) return;

    const items = this.ncVentaRequiereItems()
      ? this.ncVentaItems()
          .filter(it => it.seleccionado)
          .map(it => ({
            loteProductoId: it.loteProductoId,
            cantidad: it.cantidad,
            precioNuevo: this.ncVentaTipo === '09' ? it.precioNuevo : undefined,
          }))
      : undefined;

    const nc = await this.svc.emitirNotaCreditoVenta(op.id, this.motivoInput, {
      codigoTipo: this.ncVentaTipo,
      items,
    });

    if (nc) {
      this.notaCreditoVentaOp.set(null);
      this.motivoInput = '';
      // Sincronizar detalleAbierto con el estado actualizado del servicio
      const updatedOp = this.svc.state().operaciones.find(o => o.id === op.id);
      if (updatedOp) this.detalleAbierto.set(updatedOp);
      // Mostrar print preview inmediatamente (única oportunidad para algunos tipos)
      const pdfUrl = nc.urlPdfTicket ?? nc.urlPdfA4;
      if (pdfUrl) {
        this.abrirPreviewNc(pdfUrl);
      }
    }
  }

  abrirNotaCreditoServicio(op: OperacionModel): void {
    this.motivoInput = '';
    this.ncServicioTipo = '01';
    this.ncServicioPrecioNuevo = '';
    this.notaCreditoServicioOp.set(op);
  }

  async confirmarNotaCreditoServicio(): Promise<void> {
    const op = this.notaCreditoServicioOp();
    if (!op || !this.motivoInput.trim()) return;
    const nc = await this.svc.emitirNotaCreditoServicio(
      op.id,
      this.motivoInput,
      this.ncServicioTipo,
      this.ncServicioTipo === '09' ? this.ncServicioPrecioNuevo : undefined,
    );
    if (nc) {
      this.notaCreditoServicioOp.set(null);
      this.motivoInput = '';
      // Sincronizar detalleAbierto con el estado actualizado (estadoSunat, isActive)
      const updatedOp = this.svc.state().operaciones.find(o => o.id === op.id);
      if (updatedOp) this.detalleAbierto.set(updatedOp);
      // Para servicios la NC NO se persiste en BD — esta es la única oportunidad de imprimirla
      const pdfUrl = nc.pdfTicket ?? nc.pdfA4;
      if (pdfUrl) {
        this.abrirPreviewNc(pdfUrl);
      }
    }
  }

  private abrirPreviewNc(pdfUrl: string): void {
    this.previewPdfUrl.set(pdfUrl);
    this.previewPdfBlob.set(null);
    this.previewTicketData.set(null);
    this.mostrarPreview.set(true);
  }

  imprimirNcExistente(url: string): void {
    this.abrirPreviewNc(url);
  }

  descargarNcPdf(url: string): void {
    window.open(url, '_blank');
  }

  // --- Print ---

  descargarPdf(op: OperacionModel): void {
    if (op.urlPdfTicket) window.open(op.urlPdfTicket, '_blank');
  }

  imprimirDesdeDetalle(op: OperacionModel): void {
    this.previewPdfUrl.set(null);
    this.previewPdfBlob.set(null);
    this.previewTicketData.set(null);

    if (op.urlPdfTicket) {
      this.previewPdfUrl.set(op.urlPdfTicket);
    } else {
      const tienda = this.tiendaSvc.tiendaActiva();
      if (op.tipo === 'VENTA') {
        this.previewTicketData.set({
          nombreTienda: tienda?.nombreSede ?? 'Tienda',
          ruc: tienda?.ruc ?? '',
          direccion: tienda?.direccion,
          items: op.detalles.map(d => ({
            nombre: d.productoNombre,
            cantidad: parseFloat(d.cantidad),
            precio: parseFloat(d.precioUnitario),
          })),
          subtotal: op.igvTotal ? parseFloat(op.subtotal ?? '0') : undefined,
          igv: op.igvTotal ? parseFloat(op.igvTotal) : undefined,
          total: op.total,
          metodoPago: op.metodoPago,
          tipoComprobante: op.tipoComprobante ?? undefined,
          numeroComprobante: op.numeroComprobante,
          clienteNombre: op.clienteNombre ?? undefined,
          fecha: new Date().toLocaleString('es-PE'),
        });
      } else {
        this.previewTicketData.set({
          nombreTienda: tienda?.nombreSede ?? 'Tienda',
          ruc: tienda?.ruc ?? '',
          direccion: tienda?.direccion,
          items: [{ nombre: op.descripcion || 'Servicio', cantidad: 1, precio: op.total }],
          total: op.total,
          metodoPago: op.metodoPago,
          tipoComprobante: op.tipoComprobante ?? undefined,
          numeroComprobante: op.numeroComprobante,
          clienteNombre: op.clienteNombre ?? undefined,
          fecha: new Date().toLocaleString('es-PE'),
        });
      }
    }

    this.mostrarPreview.set(true);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 200;
    if (nearBottom && this.svc.state().hasMore && !this.svc.state().isLoadingMore) {
      void this.svc.cargarMas();
    }
  }
}
