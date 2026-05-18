import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServicioService } from '../../servicio.service';
import { ServicioRepository } from '../../servicio.repository';
import { TiendaService } from '../../../tienda/tienda.service';
import { TicketData } from '../../../impresora/ticket.converter';
import { NotaCreditoData } from '../../models/nota-credito.model';
import { PrintPreviewComponent } from '../../../impresora/print-preview/print-preview.component';
import { ServicioFlowHeaderComponent } from '../../components/servicio-flow-header/servicio-flow-header.component';
import { getTipoVentaLabel } from '../../../venta/constants/tipo-venta';
import { getTipoComprobanteLabel } from '../../../venta/constants/tipo-comprobante';
import { getMetodoPagoLabel } from '../../../venta/constants/metodo-pago';
import { getEstadoSunatLabel, getEstadoSunatColor } from '../../../venta/constants/estado-sunat';

@Component({
  selector: 'app-comprobante-servicio',
  standalone: true,
  imports: [ServicioFlowHeaderComponent, FormsModule, PrintPreviewComponent],
  styles: [`
    .sc-card { background:#fff; border:1px solid #EEF1F6; border-radius: 16px; padding:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); margin-bottom:0.875rem; }
    .sc-meta-row { display:flex; justify-content:space-between; align-items:baseline; padding:0.35rem 0; border-bottom:1px solid #F8FAFC; }
    .sc-meta-row:last-child { border-bottom:none; }
    .sc-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #EEF1F6; padding:1rem; display:flex; flex-direction:column; gap:0.5rem; z-index:20; }
    .sc-layout { display:flex; flex-direction:column; gap:0.875rem; }
    .sc-right-panel { display:flex; flex-direction:column; gap:0.5rem; }
    .sc-desktop-footer { display:none; }

    @media (min-width: 768px) {
      .sc-wrap { max-width:900px; padding-bottom:2rem; }
      .sc-layout { display:grid; grid-template-columns:1fr 280px; gap:1.5rem; align-items:start; }
      .sc-right-panel { position:sticky; top:1rem; background:#fff; border:1px solid #EEF1F6; border-radius: 16px; padding:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
      .sc-footer { display:none; }
      .sc-desktop-footer { display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem; }
    }
  `],
  template: `
    <app-servicio-flow-header [currentStep]="3" />

    <div class="page-content sc-wrap pb-28">
      <!-- Banner éxito -->
      <div style="background:#ECFDF5;border:1px solid #86EFAC;border-radius: 16px;padding:1.25rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.875rem">
        <div style="width:40px;height:40px;border-radius:50%;background:#10B981;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <p style="font-size:0.9rem;font-weight:700;color:#10B981;margin:0 0 0.1rem">Servicio registrado</p>
          <p style="font-size:0.75rem;color:#10B981;margin:0">La operación fue procesada correctamente</p>
        </div>
      </div>

      @if (servicio(); as s) {
        <div class="sc-layout">

        <!-- Left column -->
        <div>
        <!-- Info principal -->
        <div class="sc-card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.875rem">
            <div>
              <p style="font-size:0.68rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 0.2rem">Comprobante</p>
              <p style="font-size:1rem;font-weight:800;color:#334155;margin:0 0 0.1rem">{{ getTipoVentaLabel(s.tipo) }}</p>
              @if (s.tipoComprobante) {
                <p style="font-size:0.78rem;color:#64748B;margin:0">{{ getTipoComprobanteLabel(s.tipoComprobante) }}</p>
              }
            </div>
            @if (isSunat() && s.estadoSunat) {
              <span [class]="sunatBadgeClass(s.estadoSunat)">{{ getEstadoSunatLabel(s.estadoSunat) }}</span>
            }
          </div>

          @if (s.estadoSunat === 'RECHAZADO' && s.motivoRechazo) {
            <div class="error-banner" style="margin-bottom:0.875rem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              </svg>
              {{ s.motivoRechazo }}
            </div>
          }

          <div style="border-top:1px solid #F8FAFC;padding-top:0.75rem;margin-bottom:0.75rem">
            <div class="sc-meta-row">
              <span style="font-size:0.75rem;color:#94A3B8">N° comprobante</span>
              <span style="font-size:0.75rem;font-weight:700;color:#334155;font-family:monospace">{{ s.numeroComprobante }}</span>
            </div>
            @if (s.cliente) {
              <div class="sc-meta-row">
                <span style="font-size:0.75rem;color:#94A3B8">Cliente</span>
                <span style="font-size:0.75rem;font-weight:600;color:#334155">{{ s.cliente.nombre }}</span>
              </div>
            }
            @if (s.metodoPago) {
              <div class="sc-meta-row">
                <span style="font-size:0.75rem;color:#94A3B8">Pago</span>
                <span style="font-size:0.75rem;font-weight:600;color:#334155">{{ getMetodoPagoLabel(s.metodoPago) }}</span>
              </div>
            }
            <div class="sc-meta-row">
              <span style="font-size:0.75rem;color:#94A3B8">Período</span>
              <span style="font-size:0.75rem;font-weight:600;color:#334155">{{ s.fechaInicio }} — {{ s.fechaFin }}</span>
            </div>
            <div class="sc-meta-row">
              <span style="font-size:0.75rem;color:#94A3B8">Fecha</span>
              <span style="font-size:0.75rem;font-weight:600;color:#334155">{{ s.fecha }}</span>
            </div>
            @if (s.descripcion) {
              <div class="sc-meta-row">
                <span style="font-size:0.75rem;color:#94A3B8">Descripción</span>
                <span style="font-size:0.75rem;font-weight:600;color:#334155;max-width:200px;text-align:right">{{ s.descripcion }}</span>
              </div>
            }
          </div>

          <div style="border-top:1px solid #EEF1F6;padding-top:0.75rem;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.9rem;font-weight:700;color:#334155">Total</span>
            <span style="font-size:1.1rem;font-weight:800;color:#334155;letter-spacing:-0.01em">S/ {{ s.total.toFixed(2) }}</span>
          </div>
          @if (s.deuda > 0) {
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.35rem">
              <span style="font-size:0.75rem;color:#F59E0B">Deuda pendiente</span>
              <span style="font-size:0.82rem;font-weight:700;color:#F59E0B">S/ {{ s.deuda.toFixed(2) }}</span>
            </div>
          }
        </div>

        <!-- Nota de crédito emitida -->
        @if (notaCreditoEmitida(); as nc) {
          <div class="info-banner" style="flex-direction:column;align-items:flex-start;margin-bottom:0.875rem">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="12" x2="12" y2="16"/>
              </svg>
              <span style="font-size:0.82rem;font-weight:700">Nota de crédito emitida · N° {{ nc.numero }}</span>
            </div>
            @if (nc.pdfTicket || nc.pdfA4) {
              <div style="display:flex;gap:0.5rem;width:100%">
                @if (nc.pdfA4) {
                  <button type="button" (click)="descargarPdfNc(nc.pdfA4!)" class="btn-secondary" style="flex:1;font-size:0.78rem">PDF A4</button>
                }
                @if (nc.pdfTicket) {
                  <button type="button" (click)="imprimirNc(nc.pdfTicket!)" class="btn-primary" style="flex:1;font-size:0.78rem">Imprimir NC</button>
                }
              </div>
            }
          </div>
        }

        <!-- Emitir nota de crédito -->
        @if (puedeNotaCredito()) {
          @if (!mostrarFormNotaCredito()) {
            <button type="button" (click)="mostrarFormNotaCredito.set(true)" class="btn-secondary w-full" style="margin-bottom:0.875rem">
              Emitir nota de crédito
            </button>
          } @else {
            <div class="sc-card">
              <p style="font-size:0.875rem;font-weight:700;color:#334155;margin:0 0 0.75rem">Nota de crédito</p>
              <div class="field-group" style="margin-bottom:0.75rem">
                <label class="field-label">Tipo</label>
                <select [(ngModel)]="tipoNotaCredito" class="field-select">
                  <option value="01">01 — Anulación total</option>
                  <option value="09">09 — Disminución en valor</option>
                </select>
              </div>
              @if (tipoNotaCredito === '09') {
                <div class="field-group" style="margin-bottom:0.75rem">
                  <label class="field-label">Nuevo total (S/)</label>
                  <input type="number" [(ngModel)]="precioNuevo" step="0.01" min="0.01" placeholder="0.00" class="field-input" />
                </div>
              }
              <div class="field-group" style="margin-bottom:0.75rem">
                <label class="field-label">Motivo</label>
                <textarea [(ngModel)]="motivoNotaCredito" rows="2" placeholder="Describe el motivo..." class="field-textarea"></textarea>
              </div>
              <div style="display:flex;gap:0.5rem">
                <button type="button" (click)="mostrarFormNotaCredito.set(false)" class="btn-secondary" style="flex:1">Cancelar</button>
                <button type="button" (click)="emitirNotaCredito()" [disabled]="servicioSvc.state().isSaving" class="btn-primary" style="flex:1">
                  @if (servicioSvc.state().isSaving) { Emitiendo... } @else { Emitir }
                </button>
              </div>
            </div>
          }
        }

        @if (servicioSvc.state().errorMessage) {
          <div class="error-banner" style="margin-bottom:0.875rem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            {{ servicioSvc.state().errorMessage }}
          </div>
        }
        @if (servicioSvc.state().successMessage && !esExitoCreacion()) {
          <div class="success-banner" style="margin-bottom:0.875rem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;margin-top:1px">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ servicioSvc.state().successMessage }}
          </div>
        }

        </div><!-- /left column -->

        <!-- Right panel -->
        <div class="sc-right-panel">
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <button type="button" (click)="descargarPdf()" [disabled]="servicioSvc.state().isLoading" class="btn-secondary w-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar PDF
          </button>
          <button type="button" (click)="imprimirTicket()" class="btn-secondary w-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
          @if (puedeCancelar()) {
            <button type="button" (click)="cancelar()" [disabled]="servicioSvc.state().isSaving" class="btn-danger w-full">
              Cancelar servicio
            </button>
          }
          @if (puedeAnular()) {
            <button type="button" (click)="anular()" [disabled]="servicioSvc.state().isSaving" class="btn-danger w-full">
              Anular servicio
            </button>
          }
        </div>

          <!-- Desktop footer buttons -->
          <div class="sc-desktop-footer">
            <button type="button" (click)="nuevoServicio()" class="btn-primary w-full">+ Nuevo servicio</button>
            <button type="button" (click)="volverAOperaciones()" class="btn-secondary w-full">Ver operaciones</button>
          </div>
        </div><!-- /sc-right-panel -->

        </div><!-- /sc-layout -->
      }
    </div>

    <div class="sc-footer">
      <button type="button" (click)="volverAOperaciones()" class="btn-primary w-full">Volver a operaciones</button>
      <button type="button" (click)="nuevoServicio()" class="btn-secondary w-full">+ Nuevo servicio</button>
    </div>

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
export class ComprobanteServicioComponent implements OnInit {
  readonly servicioSvc = inject(ServicioService);
  private readonly router = inject(Router);
  private readonly tiendaSvc = inject(TiendaService);
  private readonly servicioRepo = inject(ServicioRepository);

  readonly servicio = computed(() => this.servicioSvc.state().servicioCreado);
  readonly isSunat = computed(() => this.servicio()?.tipo === 'SUNAT');

  readonly mostrarFormNotaCredito = signal(false);
  motivoNotaCredito = '';
  tipoNotaCredito = '01';
  precioNuevo = '';

  readonly mostrarPreview      = signal(false);
  readonly previewPdfUrl       = signal<string | null>(null);
  readonly previewPdfBlob      = signal<Blob | null>(null);
  readonly previewTicketData   = signal<TicketData | null>(null);
  readonly notaCreditoEmitida  = signal<NotaCreditoData | null>(null);

  readonly getTipoVentaLabel = getTipoVentaLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;
  readonly getMetodoPagoLabel = getMetodoPagoLabel;
  readonly getEstadoSunatLabel = getEstadoSunatLabel;

  ngOnInit(): void {
    if (!this.servicio()) {
      void this.router.navigate(['/servicios']);
    }
  }

  esExitoCreacion(): boolean {
    return this.servicioSvc.state().successMessage === 'Servicio registrado exitosamente.';
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

  puedeNotaCredito(): boolean {
    const s = this.servicio();
    return !!s && s.tipo === 'SUNAT' && s.estadoSunat === 'ACEPTADO' && s.isActive && !this.notaCreditoEmitida();
  }

  puedeAnular(): boolean {
    const s = this.servicio();
    return !!s && s.tipo === 'SUNAT' && s.estadoSunat === 'ACEPTADO' && s.isActive;
  }

  puedeCancelar(): boolean {
    const s = this.servicio();
    return !!s && s.tipo !== 'SUNAT' && s.isActive;
  }

  async descargarPdf(): Promise<void> {
    const s = this.servicio();
    if (!s) return;
    if (s.urlPdfTicket) {
      window.open(s.urlPdfTicket, '_blank');
      return;
    }
    await this.servicioSvc.descargarTicketPdf(s.numeroComprobante);
  }

  descargarPdfNc(url: string): void {
    window.open(url, '_blank');
  }

  imprimirNc(pdfUrl: string): void {
    this.previewPdfUrl.set(pdfUrl);
    this.previewPdfBlob.set(null);
    this.previewTicketData.set(null);
    this.mostrarPreview.set(true);
  }

  volverAOperaciones(): void {
    void this.router.navigate(['/operaciones']);
  }

  async cancelar(): Promise<void> {
    if (!confirm('¿Cancelar este servicio?')) return;
    const ok = await this.servicioSvc.eliminarServicio();
    if (ok) void this.router.navigate(['/servicios']);
  }

  async imprimirTicket(): Promise<void> {
    const s = this.servicio();
    if (!s) return;

    this.previewPdfUrl.set(null);
    this.previewPdfBlob.set(null);
    this.previewTicketData.set(null);

    if (s.urlPdfTicket) {
      // SUNAT: URL pública disponible en la respuesta
      this.previewPdfUrl.set(s.urlPdfTicket);
    } else {
      // NORMAL/CREDITO: bajar el PDF del endpoint autenticado
      try {
        const blob = await this.servicioRepo.descargarTicketPdf(s.numeroComprobante);
        this.previewPdfBlob.set(blob);
      } catch {
        // Fallback: ticket HTML si el endpoint falla
        const tienda = this.tiendaSvc.tiendaActiva();
        this.previewTicketData.set({
          nombreTienda: tienda?.nombreSede ?? 'Tienda',
          ruc: tienda?.ruc ?? '',
          direccion: tienda?.direccion,
          items: [{ nombre: s.descripcion || 'Servicio', cantidad: 1, precio: s.total }],
          total: s.total,
          metodoPago: s.metodoPago,
          tipoComprobante: s.tipoComprobante ?? undefined,
          numeroComprobante: s.numeroComprobante,
          clienteNombre: s.cliente?.nombre ?? undefined,
          fecha: new Date().toLocaleString('es-PE'),
        });
      }
    }

    this.mostrarPreview.set(true);
  }

  async anular(): Promise<void> {
    const motivo = window.prompt('Ingresa el motivo de anulación:') ?? '';
    if (!motivo.trim()) return;
    await this.servicioSvc.anularServicio(motivo);
  }

  async emitirNotaCredito(): Promise<void> {
    if (!this.motivoNotaCredito.trim()) return;
    const nc = await this.servicioSvc.emitirNotaCredito(
      this.motivoNotaCredito,
      this.tipoNotaCredito,
      this.tipoNotaCredito === '09' ? this.precioNuevo : undefined,
    );
    if (nc) {
      this.notaCreditoEmitida.set(nc);
      this.mostrarFormNotaCredito.set(false);
      this.motivoNotaCredito = '';
      this.precioNuevo = '';
    }
  }

  nuevoServicio(): void {
    this.servicioSvc.limpiarFlujo();
    void this.router.navigate(['/servicios']);
  }
}
