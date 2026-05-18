import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../venta.service';
import { VentaRepository } from '../../venta.repository';
import { TiendaService } from '../../../tienda/tienda.service';
import { TicketData } from '../../../impresora/ticket.converter';
import { PrintPreviewComponent } from '../../../impresora/print-preview/print-preview.component';
import { FlowHeaderComponent } from '../../components/flow-header/flow-header.component';
import { getEstadoSunatLabel, getEstadoSunatColor } from '../../constants/estado-sunat';
import { getTipoVentaLabel } from '../../constants/tipo-venta';
import { getTipoComprobanteLabel } from '../../constants/tipo-comprobante';
import { getMetodoPagoLabel } from '../../constants/metodo-pago';

@Component({
  selector: 'app-comprobante-venta',
  standalone: true,
  imports: [FlowHeaderComponent, FormsModule, PrintPreviewComponent],
  styles: [`
    .comp-card { background:#fff; border:1px solid #EEF1F6; border-radius: 16px; padding:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); margin-bottom:0.875rem; }
    .comp-meta-row { display:flex; justify-content:space-between; align-items:baseline; padding:0.35rem 0; }
    .comp-meta-row:not(:last-child) { border-bottom:1px solid #F8FAFC; }
    .comp-detail-row { display:flex; justify-content:space-between; align-items:center; padding:0.45rem 0; }
    .comp-detail-row:not(:last-child) { border-bottom:1px solid #F8FAFC; }
    .comp-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #EEF1F6; padding:1rem; display:flex; flex-direction:column; gap:0.5rem; z-index:20; }
    .comp-footer-hidden { display:none !important; }
    .sunat-badge { font-size:0.7rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:20px; }
    .comp-layout { display:flex; flex-direction:column; gap:0.875rem; }
    .comp-right-panel { display:flex; flex-direction:column; gap:0.5rem; }
    .comp-desktop-footer { display:none; }
    .comp-modal-footer { display:flex !important; flex-direction:column; gap:0.5rem; margin-top:0.5rem; }

    @media (min-width: 768px) {
      .comp-wrap { max-width:960px; padding-bottom:2rem; }
      .comp-layout { display:grid; grid-template-columns:1fr 280px; gap:1.5rem; align-items:start; }
      .comp-right-panel { position:sticky; top:1rem; background:#fff; border:1px solid #EEF1F6; border-radius: 16px; padding:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
      .comp-footer { display:none; }
      .comp-desktop-footer { display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem; }
    }
  `],
  template: `
    @if (!isModal) {
      <app-flow-header [currentStep]="isSunat() ? 3 : 2" [showSunatStep]="isSunat()" />
    }

    <div class="page-content comp-wrap pb-28">
      <!-- Banner éxito -->
      <div style="background:#ECFDF5;border:1px solid #86EFAC;border-radius: 16px;padding:1.25rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.875rem">
        <div style="width:40px;height:40px;border-radius:50%;background:#10B981;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <p style="font-size:0.9rem;font-weight:700;color:#10B981;margin:0 0 0.1rem">Venta registrada</p>
          <p style="font-size:0.75rem;color:#10B981;margin:0">La operación fue procesada correctamente</p>
        </div>
      </div>

      @if (venta(); as v) {
        <div class="comp-layout">

        <!-- Left column -->
        <div>
        <!-- Info principal -->
        <div class="comp-card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.875rem">
            <div>
              <p style="font-size:0.68rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 0.2rem">Comprobante</p>
              <p style="font-size:1rem;font-weight:800;color:#334155;margin:0 0 0.1rem">{{ getTipoVentaLabel(v.tipoVenta) }}</p>
              @if (v.tipoComprobante) {
                <p style="font-size:0.78rem;color:#64748B;margin:0">{{ getTipoComprobanteLabel(v.tipoComprobante) }}</p>
              }
            </div>
            @if (isSunat() && v.estadoSunat) {
              <span class="sunat-badge" [class]="sunatBadgeClass(v.estadoSunat)">
                {{ getEstadoSunatLabel(v.estadoSunat) }}
              </span>
            }
          </div>

          @if (v.estadoSunat === 'RECHAZADO' && v.motivoRechazo) {
            <div class="error-banner" style="margin-bottom:0.875rem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              </svg>
              {{ v.motivoRechazo }}
            </div>
          }

          <div style="border-top:1px solid #F8FAFC;padding-top:0.75rem;margin-bottom:0.75rem">
            <div class="comp-meta-row">
              <span style="font-size:0.75rem;color:#94A3B8">N° operación</span>
              <span style="font-size:0.75rem;font-weight:700;color:#334155;font-family:monospace">{{ v.numero }}</span>
            </div>
            @if (v.clienteNombre) {
              <div class="comp-meta-row">
                <span style="font-size:0.75rem;color:#94A3B8">Cliente</span>
                <span style="font-size:0.75rem;font-weight:600;color:#334155">{{ v.clienteNombre }}</span>
              </div>
            }
            @if (v.metodoPago) {
              <div class="comp-meta-row">
                <span style="font-size:0.75rem;color:#94A3B8">Pago</span>
                <span style="font-size:0.75rem;font-weight:600;color:#334155">{{ getMetodoPagoLabel(v.metodoPago) }}</span>
              </div>
            }
            <div class="comp-meta-row">
              <span style="font-size:0.75rem;color:#94A3B8">Fecha</span>
              <span style="font-size:0.75rem;font-weight:600;color:#334155">{{ formatFecha(v.fechaCreacion) }}</span>
            </div>
          </div>

          <!-- Detalle ítems -->
          <div style="border-top:1px solid #F8FAFC;padding-top:0.75rem;margin-bottom:0.75rem">
            @if (isSunat() && v.detallesSunat.length > 0) {
              @for (l of v.detallesSunat; track l.id) {
                <div class="comp-detail-row">
                  <span style="font-size:0.82rem;color:#334155">{{ l.productoNombre }} × {{ l.cantidad }}</span>
                  <span style="font-size:0.82rem;font-weight:700;color:#334155">S/ {{ l.subtotal }}</span>
                </div>
              }
            } @else {
              @for (l of v.detalles; track l.id) {
                <div class="comp-detail-row">
                  <span style="font-size:0.82rem;color:#334155">{{ l.productoNombre }} × {{ l.cantidad }}</span>
                  <span style="font-size:0.82rem;font-weight:700;color:#334155">S/ {{ l.subtotal }}</span>
                </div>
              }
            }
          </div>

          <!-- Totales -->
          <div style="border-top:1px solid #EEF1F6;padding-top:0.75rem">
            @if (v.igvTotal) {
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem">
                <span style="font-size:0.75rem;color:#94A3B8">Subtotal</span>
                <span style="font-size:0.75rem;color:#64748B">S/ {{ v.subtotal }}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem">
                <span style="font-size:0.75rem;color:#94A3B8">IGV (18%)</span>
                <span style="font-size:0.75rem;color:#64748B">S/ {{ v.igvTotal }}</span>
              </div>
            }
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:0.9rem;font-weight:700;color:#334155">Total</span>
              <span style="font-size:1.1rem;font-weight:800;color:#334155">S/ {{ v.total }}</span>
            </div>
          </div>
        </div>

        <!-- Nota de crédito existente -->
        @if (v.notaCredito; as nc) {
          <div class="info-banner" style="flex-direction:column;align-items:flex-start;margin-bottom:0.875rem">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>
              </svg>
              <span style="font-size:0.82rem;font-weight:700">Nota de crédito emitida · N° {{ nc.numero }}</span>
            </div>
            @if (nc.tipoComprobanteDisplay) {
              <p style="font-size:0.75rem;margin:0 0 0.15rem">{{ nc.tipoComprobanteDisplay }}</p>
            }
            @if (nc.motivo) {
              <p style="font-size:0.75rem;margin:0 0 0.5rem">{{ nc.motivo }}</p>
            }
            @if (nc.urlPdfTicket || nc.urlPdfA4) {
              <div style="display:flex;gap:0.5rem;width:100%">
                @if (nc.urlPdfA4) {
                  <button type="button" (click)="descargarPdfNc(nc.urlPdfA4!)" class="btn-secondary" style="flex:1;font-size:0.78rem">
                    PDF A4
                  </button>
                }
                @if (nc.urlPdfTicket) {
                  <button type="button" (click)="imprimirNc(nc.urlPdfTicket!)" class="btn-primary" style="flex:1;font-size:0.78rem">
                    Imprimir NC
                  </button>
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
            <div class="comp-card">
              <p style="font-size:0.875rem;font-weight:700;color:#334155;margin:0 0 0.75rem">Nota de crédito</p>
              <div class="field-group" style="margin-bottom:0.75rem">
                <label class="field-label">Motivo</label>
                <textarea
                  [(ngModel)]="motivoNotaCredito"
                  rows="2"
                  placeholder="Describe el motivo..."
                  class="field-textarea"
                ></textarea>
              </div>
              <div style="display:flex;gap:0.5rem">
                <button type="button" (click)="mostrarFormNotaCredito.set(false)" class="btn-secondary" style="flex:1">Cancelar</button>
                <button type="button" (click)="emitirNotaCredito()" [disabled]="ventaSvc.state().isSaving" class="btn-primary" style="flex:1">
                  @if (ventaSvc.state().isSaving) { Emitiendo... } @else { Emitir }
                </button>
              </div>
            </div>
          }
        }

        @if (ventaSvc.state().errorMessage) {
          <div class="error-banner" style="margin-bottom:0.875rem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            {{ ventaSvc.state().errorMessage }}
          </div>
        }
        @if (ventaSvc.state().successMessage) {
          <div class="success-banner" style="margin-bottom:0.875rem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;margin-top:1px">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ ventaSvc.state().successMessage }}
          </div>
        }

        </div><!-- /left column -->

        <!-- Right panel -->
        <div class="comp-right-panel">
        <!-- Acciones -->
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <button type="button" (click)="descargarPdf()" [disabled]="ventaSvc.state().isLoading" class="btn-secondary w-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar PDF
          </button>
          <button type="button" (click)="imprimir()" class="btn-secondary w-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
          @if (puedeCancelar()) {
            <button type="button" (click)="cancelar()" [disabled]="ventaSvc.state().isSaving" class="btn-danger w-full">
              Cancelar venta
            </button>
          }
          @if (puedeAnular()) {
            <button type="button" (click)="anular()" [disabled]="ventaSvc.state().isSaving" class="btn-danger w-full">
              Anular venta
            </button>
          }
        </div>

          <!-- Footer buttons (desktop right column / always visible in modal) -->
          <div [class]="isModal ? 'comp-modal-footer' : 'comp-desktop-footer'">
            <button type="button" (click)="nuevaVenta()" class="btn-primary w-full">
              Nueva venta
            </button>
            @if (!isModal) {
              <button type="button" (click)="volverAOperaciones()" class="btn-secondary w-full">
                Ver operaciones
              </button>
            }
          </div>
        </div><!-- /comp-right-panel -->

        </div><!-- /comp-layout -->
      }
    </div>

    @if (!isModal) {
      <div class="comp-footer">
        <button type="button" (click)="volverAOperaciones()" class="btn-primary w-full">
          Volver a operaciones
        </button>
        <button type="button" (click)="nuevaVenta()" class="btn-secondary w-full">
          Nueva venta
        </button>
      </div>
    }

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
export class ComprobanteComponent implements OnInit {
  @Input() isModal = false;
  @Output() nuevaVentaEvent = new EventEmitter<void>();

  readonly ventaSvc = inject(VentaService);
  private readonly router = inject(Router);
  private readonly tiendaSvc = inject(TiendaService);
  private readonly ventaRepo = inject(VentaRepository);

  readonly venta = computed(() => this.ventaSvc.state().ventaCreada);
  readonly isSunat = computed(() => this.venta()?.tipoVenta === 'SUNAT');

  readonly mostrarFormNotaCredito = signal(false);
  motivoNotaCredito = '';

  readonly mostrarPreview     = signal(false);
  readonly previewPdfUrl      = signal<string | null>(null);
  readonly previewPdfBlob     = signal<Blob | null>(null);
  readonly previewTicketData  = signal<TicketData | null>(null);

  readonly getEstadoSunatLabel = getEstadoSunatLabel;
  readonly getTipoVentaLabel = getTipoVentaLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;
  readonly getMetodoPagoLabel = getMetodoPagoLabel;

  ngOnInit(): void {
    if (!this.venta() && !this.isModal) {
      void this.router.navigate(['/ventas']);
    }
  }

  formatFecha(fecha: string): string {
    try {
      return new Date(fecha).toLocaleString('es-PE', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
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

  puedeCancelar(): boolean {
    const v = this.venta();
    return !!v && v.tipoVenta !== 'SUNAT' && !v.isCancelada;
  }

  puedeAnular(): boolean {
    const v = this.venta();
    return !!v && v.tipoVenta === 'SUNAT' && v.estadoSunat === 'ACEPTADO';
  }

  puedeNotaCredito(): boolean {
    const v = this.venta();
    return !!v && v.tipoVenta === 'SUNAT' && v.estadoSunat === 'ACEPTADO' && !v.notaCredito;
  }

  async descargarPdf(): Promise<void> {
    const v = this.venta();
    if (!v) return;
    if (v.urlPdfTicket) {
      window.open(v.urlPdfTicket, '_blank');
      return;
    }
    await this.ventaSvc.descargarTicketPdf(v.numero);
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
    this.ventaSvc.limpiarFlujo();
    void this.router.navigate(['/operaciones']);
  }

  async imprimir(): Promise<void> {
    const v = this.venta();
    if (!v) return;

    this.previewPdfUrl.set(null);
    this.previewPdfBlob.set(null);
    this.previewTicketData.set(null);

    if (v.urlPdfTicket) {
      // SUNAT: la URL pública ya viene del backend
      this.previewPdfUrl.set(v.urlPdfTicket);
    } else {
      // NORMAL/CREDITO: bajar el PDF del endpoint autenticado
      try {
        const blob = await this.ventaRepo.descargarTicketPdf(v.numero);
        this.previewPdfBlob.set(blob);
      } catch {
        // Si falla la descarga, mostrar el ticket HTML como fallback
        const tienda = this.tiendaSvc.tiendaActiva();
        this.previewTicketData.set({
          nombreTienda: tienda?.nombreSede ?? 'Tienda',
          ruc: tienda?.ruc ?? '',
          direccion: tienda?.direccion,
          items: v.detalles.map(d => ({
            nombre: d.productoNombre,
            cantidad: parseFloat(d.cantidad),
            precio: parseFloat(d.precioUnitario),
          })),
          subtotal: v.igvTotal ? parseFloat(v.subtotal) : undefined,
          igv: v.igvTotal ? parseFloat(v.igvTotal) : undefined,
          total: parseFloat(v.total),
          metodoPago: v.metodoPago,
          tipoComprobante: v.tipoComprobante ?? undefined,
          numeroComprobante: v.numero,
          clienteNombre: v.clienteNombre ?? undefined,
          fecha: new Date().toLocaleString('es-PE'),
        });
      }
    }

    this.mostrarPreview.set(true);
  }

  async cancelar(): Promise<void> {
    if (!confirm('¿Cancelar esta venta?')) return;
    await this.ventaSvc.cancelarVenta();
    if (this.isModal) {
      this.nuevaVentaEvent.emit();
    } else {
      void this.router.navigate(['/ventas']);
    }
  }

  async anular(): Promise<void> {
    const motivo = prompt('Ingresa el motivo de anulación:') ?? '';
    if (!motivo.trim()) return;
    await this.ventaSvc.anularVenta(motivo);
  }

  async emitirNotaCredito(): Promise<void> {
    if (!this.motivoNotaCredito.trim()) return;
    const ok = await this.ventaSvc.emitirNotaCredito(this.motivoNotaCredito);
    if (ok) {
      this.mostrarFormNotaCredito.set(false);
      this.motivoNotaCredito = '';
    }
  }

  nuevaVenta(): void {
    this.ventaSvc.limpiarFlujo();
    if (this.isModal) {
      this.nuevaVentaEvent.emit();
    } else {
      void this.router.navigate(['/ventas']);
    }
  }
}
