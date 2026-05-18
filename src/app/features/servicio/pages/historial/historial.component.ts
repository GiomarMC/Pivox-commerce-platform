import { Component, OnInit, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicioService } from '../../servicio.service';
import { ServicioRepository } from '../../servicio.repository';
import { ServicioReadModel } from '../../models/servicio-read.model';
import { getTipoVentaLabel } from '../../../venta/constants/tipo-venta';
import { getEstadoSunatLabel, getEstadoSunatColor } from '../../../venta/constants/estado-sunat';

@Component({
  selector: 'app-servicio-historial',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .hist-card { background:#fff; border:1px solid #EEF1F6; border-radius: 16px; padding:1rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); margin-bottom:0.75rem; }
    .hist-meta { display:flex; gap:1.5rem; flex-wrap:wrap; margin-bottom:0.75rem; }
    .hist-meta-item { font-size:0.75rem; color:#94A3B8; }
    .hist-meta-item span { color:#334155; font-weight:600; }
  `],
  template: `
    <div class="page-content max-w-3xl pb-24">
      <div class="page-header">
        <h1 class="page-title">Historial de Servicios</h1>
      </div>

      <!-- Filtros -->
      <div class="card" style="margin-bottom:1rem;display:flex;flex-direction:column;gap:0.75rem">
        <div style="position:relative">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%)">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" [(ngModel)]="busqueda" placeholder="Buscar por N° comprobante..."
            style="width:100%;padding:0.55rem 0.875rem 0.55rem 2.25rem;border:1px solid #EEF1F6;border-radius: 16px;font-size:0.875rem;outline:none;font-family:inherit;box-sizing:border-box" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.625rem">
          <select [(ngModel)]="filtroTipo" class="field-select">
            <option value="">Todos los tipos</option>
            <option value="NORMAL">Normal</option>
            <option value="CREDITO">Crédito</option>
            <option value="SUNAT">SUNAT</option>
          </select>
          <select [(ngModel)]="filtroEstadoSunat" class="field-select">
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ACEPTADO">Aceptado</option>
            <option value="RECHAZADO">Rechazado</option>
            <option value="NO_APLICA">No aplica</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.625rem">
          <div class="field-group">
            <label class="field-label">Desde</label>
            <input type="date" [(ngModel)]="fechaDesde" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Hasta</label>
            <input type="date" [(ngModel)]="fechaHasta" class="field-input" />
          </div>
        </div>
        <button type="button" (click)="buscar()" class="btn-primary w-full">Buscar</button>
      </div>

      <!-- Lista -->
      @if (svc.historial().isLoading && svc.historial().servicios.length === 0) {
        <div class="empty-state">
          <div class="loading-spinner" style="margin-bottom:0.5rem"></div>
          Cargando servicios...
        </div>
      } @else if (svc.historial().servicios.length === 0) {
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p class="empty-title">Sin servicios</p>
          <p class="empty-desc">No hay servicios registrados con los filtros actuales</p>
        </div>
      } @else {
        @for (s of svc.historial().servicios; track s.id) {
          <div class="hist-card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.625rem">
              <div>
                <p style="font-size:0.68rem;font-family:monospace;color:#94A3B8;margin:0 0 0.2rem">{{ s.numeroComprobante }}</p>
                <p style="font-size:0.9rem;font-weight:700;color:#334155;margin:0">{{ getTipoVentaLabel(s.tipo) }}</p>
                @if (s.descripcion) {
                  <p style="font-size:0.75rem;color:#94A3B8;margin:0.15rem 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">{{ s.descripcion }}</p>
                }
              </div>
              @if (s.estadoSunat && s.estadoSunat !== 'NO_APLICA') {
                <span [class]="sunatBadgeClass(s.estadoSunat)">{{ getEstadoSunatLabel(s.estadoSunat) }}</span>
              }
            </div>

            <div class="hist-meta">
              @if (s.cliente) {
                <span class="hist-meta-item">Cliente: <span>{{ s.cliente.nombre }}</span></span>
              }
              <span class="hist-meta-item">Período: <span>{{ s.fechaInicio }} — {{ s.fechaFin }}</span></span>
              <span class="hist-meta-item">Fecha: <span>{{ s.fecha }}</span></span>
              <span style="font-size:0.875rem;font-weight:800;color:#334155;letter-spacing:-0.01em">S/ {{ s.total.toFixed(2) }}</span>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
              <button type="button" (click)="descargarPdf(s)" class="btn-secondary" style="font-size:0.78rem;padding:0.35rem 0.75rem">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                PDF
              </button>
              @if (puedeAnular(s)) {
                <button type="button" (click)="anular(s)" [disabled]="accionando() === s.numeroComprobante"
                  class="btn-danger" style="font-size:0.78rem;padding:0.35rem 0.75rem">
                  Anular
                </button>
              }
              @if (puedeEliminar(s)) {
                <button type="button" (click)="eliminar(s)" [disabled]="accionando() === s.numeroComprobante"
                  class="btn-danger" style="font-size:0.78rem;padding:0.35rem 0.75rem">
                  Eliminar
                </button>
              }
            </div>

            @if (errorPorNumero() === s.numeroComprobante) {
              <div class="error-banner" style="margin-top:0.625rem;font-size:0.75rem">{{ errorMsg() }}</div>
            }
          </div>
        }

        @if (svc.historial().isLoading) {
          <div style="text-align:center;padding:1.5rem 0;font-size:0.85rem;color:#94A3B8">Cargando más...</div>
        }
      }
    </div>
  `,
})
export class ServicioHistorialComponent implements OnInit {
  readonly svc = inject(ServicioService);
  private readonly repo = inject(ServicioRepository);

  busqueda = '';
  filtroTipo = '';
  filtroEstadoSunat = '';
  fechaDesde = '';
  fechaHasta = '';

  readonly accionando = signal<string | null>(null);
  readonly errorPorNumero = signal<string | null>(null);
  readonly errorMsg = signal<string | null>(null);

  readonly getTipoVentaLabel = getTipoVentaLabel;
  readonly getEstadoSunatLabel = getEstadoSunatLabel;

  ngOnInit(): void {
    this.svc.cargarServicios();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
    if (nearBottom && !this.svc.historial().isLoading) {
      void this.svc.cargarMasServicios();
    }
  }

  buscar(): void {
    void this.svc.cargarServicios({
      search: this.busqueda || undefined,
      tipo: this.filtroTipo || undefined,
      estadoSunat: this.filtroEstadoSunat || undefined,
      fechaDesde: this.fechaDesde || undefined,
      fechaHasta: this.fechaHasta || undefined,
    });
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

  puedeAnular(s: ServicioReadModel): boolean {
    return s.tipo === 'SUNAT' && s.estadoSunat === 'ACEPTADO' && s.isActive;
  }

  puedeEliminar(s: ServicioReadModel): boolean {
    return s.tipo !== 'SUNAT' && s.isActive;
  }

  async descargarPdf(s: ServicioReadModel): Promise<void> {
    await this.svc.descargarTicketPdf(s.numeroComprobante);
  }

  async anular(s: ServicioReadModel): Promise<void> {
    const motivo = window.prompt('Motivo de anulación:') ?? '';
    if (!motivo.trim()) return;
    this.accionando.set(s.numeroComprobante);
    this.errorPorNumero.set(null);
    try {
      await this.repo.anularServicio(s.numeroComprobante, motivo);
      void this.svc.cargarServicios();
    } catch (err) {
      this.errorPorNumero.set(s.numeroComprobante);
      this.errorMsg.set((err as Error).message);
    } finally {
      this.accionando.set(null);
    }
  }

  async eliminar(s: ServicioReadModel): Promise<void> {
    if (!confirm(`¿Eliminar el servicio ${s.numeroComprobante}?`)) return;
    this.accionando.set(s.numeroComprobante);
    this.errorPorNumero.set(null);
    try {
      await this.repo.eliminarServicio(s.numeroComprobante);
      void this.svc.cargarServicios();
    } catch (err) {
      this.errorPorNumero.set(s.numeroComprobante);
      this.errorMsg.set((err as Error).message);
    } finally {
      this.accionando.set(null);
    }
  }
}
