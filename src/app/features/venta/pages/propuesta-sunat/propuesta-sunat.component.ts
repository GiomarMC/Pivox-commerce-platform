import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../venta.service';
import { CarritoService } from '../../carrito.service';
import { CatalogoService } from '../../../inventario/catalogo.service';
import { FlowHeaderComponent } from '../../components/flow-header/flow-header.component';
import { ProductoCatalogoModel } from '../../../inventario/models/producto.model';
import { getUnidadMedidaLabel } from '../../../inventario/constants/unidad-medida';

interface LineaEditable {
  loteProductoId: number;
  loteProductoNombre: string;
  esRelleno: boolean;
  motivo: string;
  cantidadConfirmada: string;
  precioConfirmado: string;
  loteProductoOriginalId: number | null;
  imagenActual: string | null;
  imagenOriginal: string | null;
  nombreOriginal: string;
}

@Component({
  selector: 'app-propuesta-sunat',
  standalone: true,
  imports: [FlowHeaderComponent, FormsModule],
  templateUrl: './propuesta-sunat.component.html',
  styleUrl: './propuesta-sunat.component.css',
})
export class PropuestaSunatComponent implements OnInit, OnDestroy {
  @Input() isModal = false;
  @Output() propuestaConfirmada = new EventEmitter<void>();
  @Output() carritoRecuperado = new EventEmitter<void>();
  @Output() ventaCancelada = new EventEmitter<void>();

  readonly ventaSvc = inject(VentaService);
  readonly catalogoSvc = inject(CatalogoService);
  private readonly carritoSvc = inject(CarritoService);
  private readonly router = inject(Router);

  readonly lineas = signal<LineaEditable[]>([]);

  readonly rellenosSinResolver = computed(() =>
    this.lineas().filter(l => l.esRelleno && l.loteProductoOriginalId === null).length,
  );

  // Modal selector
  readonly selectorIndice = signal<number | null>(null);
  selectorBusqueda = '';
  private selectorDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const venta = this.ventaSvc.state().ventaCreada;
    if (!venta || venta.propuestaSunat.length === 0) {
      void this.router.navigate(['/ventas/catalogo']);
      return;
    }

    // Tres mapas de imagen: por nombre, por productoId, por loteProductoId
    const carritoImgByNombre = new Map<string, string | null>();
    const carritoByProductoId = new Map<number, string | null>();
    const carritoByLoteId = new Map<number, string | null>();
    for (const item of this.carritoSvc.items()) {
      carritoImgByNombre.set(item.nombre.toLowerCase(), item.imagen);
      carritoByProductoId.set(item.productoId, item.imagen);
      if (item.loteProductoId != null) {
        carritoByLoteId.set(item.loteProductoId, item.imagen);
      }
    }

    this.lineas.set(
      venta.propuestaSunat.map(p => {
        const imagenActual =
          carritoByLoteId.get(p.loteProductoId) ??
          carritoImgByNombre.get(p.loteProductoNombre.toLowerCase()) ??
          null;

        let imagenOriginal: string | null = null;
        let nombreOriginal = '';
        if (p.loteProductoOriginalId != null) {
          imagenOriginal = carritoByLoteId.get(p.loteProductoOriginalId) ?? null;
          const detalle = venta.detalles.find(d => d.loteProductoId === p.loteProductoOriginalId);
          if (detalle) {
            nombreOriginal = detalle.productoNombre;
            if (!imagenOriginal) {
              imagenOriginal =
                carritoByProductoId.get(detalle.productoId) ??
                carritoImgByNombre.get(detalle.productoNombre.toLowerCase()) ??
                null;
            }
          }
        }

        return {
          loteProductoId: p.loteProductoId,
          loteProductoNombre: p.loteProductoNombre,
          esRelleno: p.esRelleno,
          motivo: p.motivo,
          cantidadConfirmada: p.cantidad,
          precioConfirmado: p.precio,
          loteProductoOriginalId: p.loteProductoOriginalId,
          imagenActual,
          imagenOriginal,
          nombreOriginal,
        };
      }),
    );

    // Pre-cargar catálogo para que el selector abra rápido
    void this.catalogoSvc.cargarCatalogo();
  }

  ngOnDestroy(): void {
    if (this.selectorDebounce) clearTimeout(this.selectorDebounce);
  }

  subtotal(linea: LineaEditable): string {
    const v = +linea.cantidadConfirmada * +linea.precioConfirmado;
    return isNaN(v) ? '0.00' : v.toFixed(2);
  }

  // ── Acciones principales ──

  async confirmar(): Promise<void> {
    this.ventaSvc.clearMessages();
    const venta = await this.ventaSvc.confirmarSunat(this.lineas());
    if (!venta) return;
    if (this.isModal) {
      this.propuestaConfirmada.emit();
    } else {
      void this.router.navigate(['/ventas/comprobante']);
    }
  }

  async volverAlCarrito(): Promise<void> {
    if (!confirm('¿Volver al carrito? La venta pendiente será cancelada pero los productos del carrito se conservarán.')) return;
    const ok = await this.ventaSvc.cancelarVentaSinLimpiarCarrito();
    if (!ok) return;
    if (this.isModal) {
      this.carritoRecuperado.emit();
    } else {
      void this.router.navigate(['/ventas/pedido']);
    }
  }

  async cancelar(): Promise<void> {
    if (!confirm('¿Cancelar esta venta? Se revertirán todos los cambios.')) return;
    await this.ventaSvc.cancelarVenta();
    if (this.isModal) {
      this.ventaCancelada.emit();
    } else {
      void this.router.navigate(['/ventas']);
    }
  }

  // ── Modal selector ──

  abrirSelector(indice: number): void {
    this.selectorIndice.set(indice);
    this.selectorBusqueda = '';
    void this.catalogoSvc.cargarCatalogo();
  }

  cerrarSelector(): void {
    this.selectorIndice.set(null);
    this.selectorBusqueda = '';
  }

  onSelectorBusqueda(): void {
    if (this.selectorDebounce) clearTimeout(this.selectorDebounce);
    this.selectorDebounce = setTimeout(() => {
      void this.catalogoSvc.cargarCatalogo(this.selectorBusqueda || undefined);
    }, 350);
  }

  onSelectorScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 250;
    if (nearBottom) void this.catalogoSvc.cargarMasCatalogo();
  }

  seleccionarReemplazo(producto: ProductoCatalogoModel): void {
    const idx = this.selectorIndice();
    if (idx === null) return;

    this.lineas.update(lineas =>
      lineas.map((l, i) =>
        i === idx
          ? { ...l, loteProductoNombre: producto.nombre, imagenActual: producto.imagen }
          : l,
      ),
    );
    this.cerrarSelector();
  }

  getUnidadLabel(code: string): string {
    return getUnidadMedidaLabel(code);
  }
}
