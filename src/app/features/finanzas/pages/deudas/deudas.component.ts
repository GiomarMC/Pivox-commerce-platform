import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinanzasService } from '../../finanzas.service';
import { DeudaCardComponent } from '../../components/deuda-card/deuda-card.component';
import { PrintPreviewComponent } from '../../../impresora/print-preview/print-preview.component';
import { DeudaModel } from '../../models/deuda.model';

type BusquedaTipo = 'documento' | 'comprobante';

@Component({
  selector: 'app-deudas',
  standalone: true,
  imports: [FormsModule, DeudaCardComponent, PrintPreviewComponent],
  styles: [`
    .deu-modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:flex-end;justify-content:center;z-index:50; }
    .deu-modal-sheet { background:#fff;border-radius:18px 18px 0 0;width:100%;max-width:480px;padding:1.5rem; }
  `],
  template: `
    <div class="page-content max-w-2xl pb-8">
      <div class="page-header">
        <h1 class="page-title">Deudas</h1>
      </div>

      <!-- Búsqueda -->
      <div class="card" style="margin-bottom:0.875rem;display:flex;flex-direction:column;gap:0.625rem">
        <!-- Tipo búsqueda toggle -->
        <div style="display:flex;gap:0.5rem">
          <button type="button" (click)="tipoBusqueda = 'documento'" [class]="tipoBusquedaClass('documento')">
            Por documento
          </button>
          <button type="button" (click)="tipoBusqueda = 'comprobante'" [class]="tipoBusquedaClass('comprobante')">
            Por comprobante
          </button>
        </div>

        <div style="display:flex;gap:0.5rem">
          <div style="position:relative;flex:1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%)">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" [(ngModel)]="queryBusqueda" (keyup.enter)="buscar()"
              [placeholder]="tipoBusqueda === 'documento' ? 'DNI o RUC del cliente...' : 'N° comprobante...'"
              style="width:100%;padding:0.55rem 0.875rem 0.55rem 2.25rem;border:1px solid #E2E6F0;border-radius:10px;font-size:0.875rem;outline:none;font-family:inherit;box-sizing:border-box" />
          </div>
          <button type="button" (click)="buscar()" [disabled]="svc.state().isLoading || !queryBusqueda.trim()" class="btn-primary" style="font-size:0.875rem;padding:0.55rem 1rem">
            {{ svc.state().isLoading ? '...' : 'Buscar' }}
          </button>
        </div>
      </div>

      <!-- Filtros chip -->
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.875rem">
        @for (chip of estadoChips; track chip.value) {
          <button type="button" (click)="setEstadoFiltro(chip.value)" [class]="estadoFiltro() === chip.value ? 'chip chip-active' : 'chip'">
            {{ chip.label }}
          </button>
        }
      </div>

      @if (svc.state().errorMessage) {
        <div class="error-banner" style="margin-bottom:0.875rem">{{ svc.state().errorMessage }}</div>
      }

      @if (svc.state().isLoading) {
        <div style="display:flex;flex-direction:column;gap:0.625rem">
          @for (i of [1,2,3]; track i) {
            <div class="card" style="animation:pulse 1.5s infinite">
              <div style="display:flex;gap:0.75rem">
                <div style="width:44px;height:44px;border-radius:12px;background:#E5E7EB;flex-shrink:0"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:0.5rem">
                  <div style="height:14px;background:#E5E7EB;border-radius:6px;width:60%"></div>
                  <div style="height:11px;background:#F3F4F6;border-radius:6px;width:40%"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (svc.state().deudas.length === 0 && hasBuscado()) {
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <p class="empty-title">Sin deudas</p>
          <p class="empty-desc">No hay deudas para los filtros aplicados</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:0.625rem">
          @for (deuda of svc.state().deudas; track deuda.id) {
            <app-deuda-card [deuda]="deuda" (pagar)="abrirPago($event)" />
          }
        </div>
      }

      <!-- Modal pago -->
      @if (deudaSeleccionada()) {
        <div class="deu-modal-backdrop" (click)="cerrarPago()">
          <div class="deu-modal-sheet" (click)="$event.stopPropagation()">
            <p style="font-size:1rem;font-weight:700;color:#111827;margin:0 0 0.25rem">Registrar pago</p>
            <p style="font-size:0.75rem;color:#9CA3AF;margin:0 0 1rem">
              Saldo pendiente: <span style="font-weight:600;color:#DC2626">S/ {{ deudaSeleccionada()!.saldo }}</span>
            </p>
            <div class="field-group" style="margin-bottom:1rem">
              <label class="field-label">Monto (S/)</label>
              <input type="number" [(ngModel)]="montoPago" step="0.01" min="0.01" [max]="deudaSeleccionada()!.saldo" placeholder="0.00" class="field-input" />
            </div>
            @if (svc.state().errorMessage) {
              <div class="error-banner" style="margin-bottom:0.75rem;font-size:0.75rem">{{ svc.state().errorMessage }}</div>
            }
            <div style="display:flex;gap:0.75rem">
              <button type="button" (click)="cerrarPago()" class="btn-secondary" style="flex:1">Cancelar</button>
              <button type="button" (click)="confirmarPago()" [disabled]="svc.state().isSaving || !montoPago" class="btn-primary" style="flex:1">
                {{ svc.state().isSaving ? 'Registrando...' : 'Confirmar pago' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    @if (mostrarPreview()) {
      <app-print-preview [pdfBlob]="previewPdfBlob()" (cerrar)="mostrarPreview.set(false)" />
    }
  `,
})
export class DeudasComponent implements OnInit {
  readonly svc = inject(FinanzasService);

  tipoBusqueda: BusquedaTipo = 'documento';
  queryBusqueda = '';
  readonly estadoFiltro = signal<string>('ACTIVA');
  private _hasBuscado = false;

  readonly deudaSeleccionada = signal<DeudaModel | null>(null);
  montoPago: number | null = null;

  readonly mostrarPreview = signal(false);
  readonly previewPdfBlob = signal<Blob | null>(null);

  readonly estadoChips = [
    { label: 'Activa', value: 'ACTIVA' },
    { label: 'Pagada', value: 'PAGADA' },
    { label: 'Todas', value: '' },
  ];

  tipoBusquedaClass(tipo: BusquedaTipo): string {
    return this.tipoBusqueda === tipo ? 'chip chip-active' : 'chip';
  }

  ngOnInit(): void {
    this._hasBuscado = true;
    void this.svc.cargarDeudas({ estado: 'ACTIVA' });
  }

  hasBuscado(): boolean {
    return this._hasBuscado;
  }

  setEstadoFiltro(estado: string): void {
    this.estadoFiltro.set(estado);
    this._hasBuscado = true;
    this.svc.clearMessages();
    if (this.queryBusqueda.trim()) {
      this.buscar();
    } else {
      void this.svc.cargarDeudas(estado ? { estado } : {});
    }
  }

  buscar(): void {
    const q = this.queryBusqueda.trim();
    if (!q) return;
    this._hasBuscado = true;
    this.svc.clearMessages();
    if (this.tipoBusqueda === 'documento') {
      void this.svc.buscarDeudasPorDocumento(q);
    } else {
      void this.svc.buscarDeudasPorComprobante(q);
    }
  }

  abrirPago(deuda: DeudaModel): void {
    this.deudaSeleccionada.set(deuda);
    this.montoPago = parseFloat(deuda.saldo);
    this.svc.clearMessages();
  }

  cerrarPago(): void {
    this.deudaSeleccionada.set(null);
    this.montoPago = null;
  }

  async confirmarPago(): Promise<void> {
    const deuda = this.deudaSeleccionada();
    if (!deuda || !this.montoPago) return;
    this.svc.clearMessages();
    const blob = await this.svc.registrarPago(deuda.id, String(this.montoPago));
    if (blob) {
      this.cerrarPago();
      this.previewPdfBlob.set(blob);
      this.mostrarPreview.set(true);
      const estado = this.estadoFiltro();
      void this.svc.cargarDeudas(estado ? { estado } : {});
    }
  }
}
