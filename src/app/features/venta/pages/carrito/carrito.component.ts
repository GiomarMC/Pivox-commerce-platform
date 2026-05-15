import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CarritoService } from '../../carrito.service';
import { InventarioService } from '../../../inventario/inventario.service';
import { ResumenVentaService } from '../../resumen-venta.service';
import { CarritoItem } from '../../models/carrito.model';
import { LoteProductoResponse } from '../../../inventario/models/lote.model';
import { FlowHeaderComponent } from '../../components/flow-header/flow-header.component';

interface ModalLoteData {
  item: CarritoItem;
  idx: number;
}

interface LoteOpcion {
  id: number | null;
  fecha: string;
  conFactura: boolean;
  stock: number;
}

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [RouterLink, FlowHeaderComponent, DecimalPipe],
  styles: [`
    .cart-item { background:#fff; border:1px solid #E2E6F0; border-radius:14px; padding:1rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .cart-item-averiado { background:#FFFBEB; border-color:#FCD34D; }
    .item-img { width:56px; height:56px; border-radius:10px; object-fit:cover; flex-shrink:0; }
    .item-img-ph { width:56px; height:56px; border-radius:10px; background:#F4F6FB; border:1px solid #E2E6F0; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .item-del { width:28px; height:28px; border-radius:8px; background:#FEE2E2; border:none; display:flex; align-items:center; justify-content:center; color:#DC2626; cursor:pointer; flex-shrink:0; transition:background 0.12s; }
    .item-del:hover { background:#FECACA; }
    .lote-chip { display:inline-flex; align-items:center; gap:0.35rem; margin-top:0.35rem; padding:0.25rem 0.6rem; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:20px; font-size:0.7rem; font-weight:600; color:#1D4ED8; cursor:pointer; transition:background 0.12s; }
    .lote-chip:hover { background:#DBEAFE; }
    .averiado-chip { display:inline-flex; align-items:center; gap:0.35rem; margin-top:0.35rem; padding:0.2rem 0.6rem; background:#FFFBEB; border:1px solid #FCD34D; border-radius:20px; font-size:0.7rem; font-weight:600; color:#D97706; }
    .qty-btn { width:28px; height:28px; border-radius:50%; border:1px solid #E2E6F0; background:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; cursor:pointer; color:#374151; transition:border-color 0.12s, background 0.12s; line-height:1; }
    .qty-btn:hover { border-color:#1F2A7C; background:#F0F2FF; }
    .qty-input { width:60px; padding:0.35rem 0.25rem; font-size:0.85rem; border:1px solid #E2E6F0; border-radius:8px; text-align:center; outline:none; }
    .qty-input:focus { border-color:#1F2A7C; }
    .price-input { width:90px; padding:0.35rem 0.5rem; font-size:0.85rem; border:1px solid #E2E6F0; border-radius:8px; outline:none; }
    .price-input:focus { border-color:#1F2A7C; }
    .cart-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #E2E6F0; padding:1rem; z-index:20; }
    .cart-total-box { display:flex; align-items:center; justify-content:space-between; background:#F0F2FF; border-radius:12px; padding:0.75rem 1rem; margin-bottom:0.875rem; }
    .lote-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:60; display:flex; align-items:flex-end; justify-content:center; }
    .lote-modal-sheet { background:#fff; border-radius:20px 20px 0 0; width:100%; max-width:480px; padding:1.25rem; max-height:72dvh; overflow-y:auto; }
    .lote-option { width:100%; text-align:left; padding:0.875rem; border-radius:12px; border:1.5px solid #E2E6F0; background:#fff; cursor:pointer; transition:border-color 0.12s, background 0.12s; margin-bottom:0.5rem; font-family:inherit; }
    .lote-option:hover { border-color:#1F2A7C; background:#F8F9FF; }
    .lote-option-active-green { border-color:#16A34A; background:#F0FDF4; }
    .lote-option-active-navy { border-color:#1F2A7C; background:#EFF6FF; }
    .lote-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:3px; }
    .dot-green { background:#16A34A; }
    .dot-navy { background:#1F2A7C; }
    .dot-zinc { background:#D1D5DB; border:1px solid #9CA3AF; }
  `],
  template: `
    <app-flow-header [currentStep]="3" />

    <div class="page-content max-w-2xl pb-36">
      @if (svc.items().length === 0) {
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
              <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
          </div>
          <p class="empty-title">Carrito vacío</p>
          <p class="empty-desc">Agrega productos desde el catálogo</p>
          <a routerLink="/ventas/catalogo" class="btn-primary" style="margin-top:1rem;text-decoration:none;display:inline-flex">
            Ir al catálogo
          </a>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          @for (item of svc.items(); track item.productoId + '-' + item.esAveriado; let idx = $index) {
            <div [class]="'cart-item' + (item.esAveriado ? ' cart-item-averiado' : '')">
              <div style="display:flex;align-items:flex-start;gap:0.75rem">
                @if (item.imagen) {
                  <img [src]="item.imagen" [alt]="item.nombre" class="item-img" />
                } @else {
                  <div class="item-img-ph">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5">
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                      <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
                    </svg>
                  </div>
                }
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem">
                    <p style="font-size:0.875rem;font-weight:700;color:#111827;line-height:1.3;margin:0">{{ item.nombre }}</p>
                    <button type="button" (click)="eliminar(item)" class="item-del" title="Eliminar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <p style="font-size:0.7rem;color:#9CA3AF;margin:0.15rem 0 0">{{ item.codigo }} · {{ item.unidadMedida }}</p>

                  <!-- Chip lote selector -->
                  <button type="button" (click)="abrirModalLote(item, idx)" class="lote-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                    </svg>
                    {{ fechaLlegadaDelLote(item) ?? 'Automático' }}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>

                  <!-- Averiado badge -->
                  @if (item.esAveriado) {
                    <div class="averiado-chip">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                      </svg>
                      Averiado
                      <button type="button" (click)="toggleAveriado(item, false)" title="Cambiar a normal"
                        style="margin-left:2px;background:none;border:none;cursor:pointer;color:#D97706;display:flex;align-items:center;padding:0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              </div>

              @if (item.cantidad > item.stockDisponible) {
                <p style="font-size:0.7rem;color:#DC2626;margin:0.2rem 0 0">
                  Stock insuficiente. Disponible: {{ item.stockDisponible | number:'1.0-3' }}
                </p>
              }
              @if ((stockPorTipo().get(item.productoId)?.sinFactura ?? 0) > 0 &&
                   (stockPorTipo().get(item.productoId)?.conFactura ?? 0) > 0) {
                <p style="font-size:0.68rem;color:#6B7280;margin:0.15rem 0 0">
                  {{ stockPorTipo().get(item.productoId)?.conFactura | number:'1.0-3' }} c/factura ·
                  {{ stockPorTipo().get(item.productoId)?.sinFactura | number:'1.0-3' }} s/factura
                </p>
              }
              @if (esSunat() && loteEsSinFactura(item)) {
                <p style="font-size:0.68rem;color:#D97706;margin:0.15rem 0 0">
                  ⚠ Lote sin factura — SUNAT puede requerir sustitución
                </p>
              }

              <div style="margin-top:0.875rem;display:flex;align-items:flex-end;gap:0.75rem">
                <!-- Cantidad stepper -->
                <div style="display:flex;flex-direction:column;gap:0.3rem">
                  <label style="font-size:0.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em">Cantidad</label>
                  <div style="display:flex;align-items:center;gap:0.375rem">
                    <button type="button" (click)="decrementar(item)" class="qty-btn">−</button>
                    <input type="number" [value]="item.cantidad" (change)="onCantidadChange(item, $event)" min="0.001" step="0.001" class="qty-input" />
                    <button type="button" (click)="incrementar(item)" class="qty-btn" style="color:#1F2A7C">+</button>
                  </div>
                </div>
                <!-- Precio -->
                <div style="display:flex;flex-direction:column;gap:0.3rem">
                  <label style="font-size:0.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em">Precio unit.</label>
                  <input type="number" [value]="item.precioUnitario" (change)="onPrecioChange(item, $event)" min="0" step="0.01" class="price-input" />
                </div>
                <!-- Subtotal -->
                <div style="flex:1;text-align:right">
                  <p style="font-size:0.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.2rem">Subtotal</p>
                  <p style="font-size:1rem;font-weight:800;color:#1F2A7C;margin:0;letter-spacing:-0.01em">
                    S/ {{ (item.cantidad * item.precioUnitario) | number:'1.2-2' }}
                  </p>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Footer fijo -->
    @if (svc.items().length > 0) {
      <div class="cart-footer">
        <div class="cart-total-box">
          <div>
            <p style="font-size:0.72rem;color:#6B7280;margin:0 0 0.1rem">{{ svc.items().length }} producto(s)</p>
            <p style="font-size:0.8rem;font-weight:600;color:#374151;margin:0">Total a pagar</p>
          </div>
          <p style="font-size:1.35rem;font-weight:800;color:#1F2A7C;margin:0;letter-spacing:-0.02em">S/ {{ svc.total() | number:'1.2-2' }}</p>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button type="button" (click)="irACatalogo()" class="btn-secondary" style="flex:1;font-size:0.8rem">Agregar más</button>
          <button type="button" (click)="limpiar()" class="btn-danger" style="flex:1;font-size:0.8rem">Limpiar</button>
          <button type="button" (click)="irAResumen()" [disabled]="hayStockInsuficiente()" class="btn-primary" style="flex:1;font-size:0.8rem">Continuar</button>
        </div>
      </div>
    }

    <!-- Modal selector de lote -->
    @if (modalLoteData()) {
      <div class="lote-modal-backdrop" (click)="modalLoteData.set(null)">
        <div class="lote-modal-sheet" (click)="$event.stopPropagation()">
          <p style="font-size:0.9rem;font-weight:700;color:#111827;margin:0 0 1rem;text-align:center">
            Lote · {{ modalLoteData()!.item.nombre }}
          </p>

          <!-- Opción Automático -->
          <button
            type="button"
            (click)="seleccionarLote(null)"
            [class]="'lote-option ' + (modalLoteData()!.item.loteProductoId === null ? 'lote-option-active-green' : '')"
          >
            <div style="display:flex;align-items:flex-start;gap:0.75rem">
              <div [class]="'lote-dot ' + (modalLoteData()!.item.loteProductoId === null ? 'dot-green' : 'dot-zinc')"></div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
                  <p style="font-size:0.85rem;font-weight:700;color:#15803D;margin:0">Automático (FIFO)</p>
                  <span [style]="'font-size:0.68rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:20px;' + (loteFifaConFactura() ? 'background:#DCFCE7;color:#15803D' : 'background:#FEF3C7;color:#D97706')">
                    {{ loteFifaConFactura() ? 'Con factura' : 'Sin factura' }}
                  </span>
                </div>
                <p style="font-size:0.72rem;color:#9CA3AF;margin:0.2rem 0 0">Llegada: {{ loteFifaFecha() ?? 'N/A' }}</p>
              </div>
            </div>
          </button>

          <!-- Otros lotes -->
          @if (otrosLotes().length > 0) {
            <p style="font-size:0.68rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;margin:0.25rem 0 0.5rem">Otros lotes disponibles</p>
            @for (lote of otrosLotes(); track lote.id) {
              <button
                type="button"
                (click)="seleccionarLote(lote.id)"
                [class]="'lote-option ' + (modalLoteData()!.item.loteProductoId === lote.id ? 'lote-option-active-navy' : '')"
              >
                <div style="display:flex;align-items:flex-start;gap:0.75rem">
                  <div [class]="'lote-dot ' + (modalLoteData()!.item.loteProductoId === lote.id ? 'dot-navy' : 'dot-zinc')"></div>
                  <div style="flex:1">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
                      <p style="font-size:0.85rem;font-weight:700;color:#1F2A7C;margin:0">Llegada: {{ lote.fecha }}</p>
                      <span [style]="'font-size:0.68rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:20px;' + (lote.conFactura ? 'background:#DCFCE7;color:#15803D' : 'background:#FEF3C7;color:#D97706')">
                        {{ lote.conFactura ? 'Con factura' : 'Sin factura' }}
                      </span>
                    </div>
                    <p style="font-size:0.72rem;color:#9CA3AF;margin:0.2rem 0 0">Stock: {{ lote.stock }}</p>
                  </div>
                </div>
              </button>
            }
          } @else {
            <p style="font-size:0.82rem;color:#9CA3AF;text-align:center;padding:1rem 0">Solo disponible el lote automático</p>
          }
        </div>
      </div>
    }
  `,
})
export class CarritoComponent implements OnInit {
  readonly svc = inject(CarritoService);
  private readonly inventarioSvc = inject(InventarioService);
  private readonly resumenSvc = inject(ResumenVentaService);
  private readonly router = inject(Router);

  readonly esSunat = computed(() => this.resumenSvc.state().tipoVenta === 'SUNAT');

  readonly stockPorTipo = computed(() => {
    const lotes = this.inventarioSvc.state().lotes;
    const map = new Map<number, { conFactura: number; sinFactura: number }>();
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        const cur = map.get(lp.producto) ?? { conFactura: 0, sinFactura: 0 };
        if (lp.conFactura) cur.conFactura += lp.cantidadDisponible;
        else cur.sinFactura += lp.cantidadDisponible;
        map.set(lp.producto, { ...cur });
      }
    }
    return map;
  });

  readonly modalLoteData = signal<ModalLoteData | null>(null);

  ngOnInit(): void {
    if (this.inventarioSvc.state().lotes.length === 0) {
      void this.inventarioSvc.cargarLotes();
    }
  }

  readonly lotesParaModal = computed((): LoteProductoResponse[] => {
    const data = this.modalLoteData();
    if (!data) return [];
    const lotes = this.inventarioSvc.state().lotes;
    const result: LoteProductoResponse[] = [];
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.producto === data.item.productoId && lp.isActive && lp.cantidadDisponible > 0) {
          result.push(lp);
        }
      }
    }
    return result;
  });

  // FIFO lote (oldest by fechaLlegada)
  readonly loteFifo = computed(() => {
    const data = this.modalLoteData();
    if (!data) return null;
    const lotes = this.inventarioSvc.state().lotes;
    const matches: { fecha: string; lp: LoteProductoResponse }[] = [];
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.producto === data.item.productoId && lp.isActive) {
          matches.push({ fecha: lote.fechaLlegada, lp });
        }
      }
    }
    if (matches.length === 0) return null;
    matches.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { fecha: matches[0].fecha, conFactura: matches[0].lp.conFactura };
  });

  readonly loteFifaFecha = computed(() => this.loteFifo()?.fecha ?? null);
  readonly loteFifaConFactura = computed(() => this.loteFifo()?.conFactura ?? false);

  readonly otrosLotes = computed((): LoteOpcion[] => {
    const data = this.modalLoteData();
    if (!data) return [];
    const lotes = this.inventarioSvc.state().lotes;
    const result: LoteOpcion[] = [];
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.producto === data.item.productoId && lp.isActive && lp.cantidadDisponible > 0) {
          result.push({ id: lp.id, fecha: lote.fechaLlegada, conFactura: lp.conFactura, stock: lp.cantidadDisponible });
        }
      }
    }
    result.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return result;
  });

  loteEsSinFactura(item: CarritoItem): boolean {
    const lotes = this.inventarioSvc.state().lotes;
    if (item.loteProductoId === null) {
      // FIFO: verificar si el lote más antiguo (el que se usaría) es sin factura
      let oldest: { fecha: string; conFactura: boolean } | null = null;
      for (const lote of lotes) {
        for (const lp of lote.productos) {
          if (lp.producto === item.productoId && lp.isActive && lp.cantidadDisponible > 0) {
            if (!oldest || lote.fechaLlegada < oldest.fecha) {
              oldest = { fecha: lote.fechaLlegada, conFactura: lp.conFactura };
            }
          }
        }
      }
      return oldest !== null && !oldest.conFactura;
    }
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.id === item.loteProductoId) return !lp.conFactura;
      }
    }
    return false;
  }

  fechaLlegadaDelLote(item: CarritoItem): string | null {
    const lotes = this.inventarioSvc.state().lotes;
    if (item.loteProductoId === null) {
      const matches: string[] = [];
      for (const lote of lotes) {
        for (const lp of lote.productos) {
          if (lp.producto === item.productoId && lp.isActive) {
            matches.push(lote.fechaLlegada);
          }
        }
      }
      if (matches.length === 0) return null;
      matches.sort();
      return matches[0];
    }
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.id === item.loteProductoId) return lote.fechaLlegada;
      }
    }
    return null;
  }

  abrirModalLote(item: CarritoItem, idx: number): void {
    this.modalLoteData.set({ item, idx });
  }

  seleccionarLote(loteId: number | null): void {
    const data = this.modalLoteData();
    if (!data) return;
    this.svc.actualizarLote(data.item.productoId, data.item.esAveriado, loteId);
    this.modalLoteData.set(null);
  }

  toggleAveriado(item: CarritoItem, valor: boolean): void {
    this.svc.actualizarAveriado(item.productoId, item.esAveriado, valor);
  }

  onCantidadChange(item: CarritoItem, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) this.svc.actualizarCantidad(item.productoId, item.esAveriado, val);
  }

  onPrecioChange(item: CarritoItem, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 0) this.svc.actualizarPrecio(item.productoId, item.esAveriado, val);
  }

  decrementar(item: CarritoItem): void {
    const nueva = item.cantidad - 1;
    if (nueva <= 0) {
      this.svc.eliminarItem(item.productoId, item.esAveriado);
    } else {
      this.svc.actualizarCantidad(item.productoId, item.esAveriado, nueva);
    }
  }

  incrementar(item: CarritoItem): void {
    this.svc.actualizarCantidad(item.productoId, item.esAveriado, item.cantidad + 1);
  }

  eliminar(item: CarritoItem): void {
    this.svc.eliminarItem(item.productoId, item.esAveriado);
  }

  limpiar(): void {
    this.svc.limpiar();
  }

  irACatalogo(): void {
    void this.router.navigate(['/ventas/catalogo']);
  }

  hayStockInsuficiente(): boolean {
    return this.svc.items().some(i => i.cantidad > i.stockDisponible);
  }

  irAResumen(): void {
    if (this.hayStockInsuficiente()) return;
    void this.router.navigate(['/ventas/resumen']);
  }
}
