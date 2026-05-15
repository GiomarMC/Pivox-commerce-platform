import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventarioService } from '../../inventario.service';
import { LoteProductoInput } from '../../models/lote.model';
import { ProductoModel } from '../../models/producto.model';
import { UNIDAD_MEDIDA_VALUES, getUnidadMedidaLabel } from '../../constants/unidad-medida';

@Component({
  selector: 'app-lote-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './lote-form.component.html',
  styleUrl: './lote-form.component.css',
})
export class LoteFormComponent implements OnInit {
  @Input() modal = false;
  @Output() cerrar = new EventEmitter<'guardado' | 'cancelado'>();

  readonly svc = inject(InventarioService);
  readonly auth = inject(AuthService);
  readonly isDueno = this.auth.isDueno;
  private readonly router = inject(Router);

  // Lote base fields
  fechaLlegada = '';
  costoOperacion = '0.00';
  costoTransporte = '0.00';

  // Item input fields
  usarProductoExistente = true;
  productoSeleccionadoId: number | null = null;
  nuevoNombre = '';
  unidadMedida = 'NIU';
  conFactura = true;
  cantidad = '';
  cantidadAveriada = '';
  costoTotal = '';
  precioVentaBase = '';
  precioVentaMercado = '';

  // Item search
  busquedaProducto = '';

  productosAgregados: LoteProductoInput[] = [];

  readonly unidades = UNIDAD_MEDIDA_VALUES.map(v => ({ value: v, label: getUnidadMedidaLabel(v) }));
  readonly showSelector = signal(false);
  readonly hoveredProductId = signal<number | null>(null);

  get hoveredCatalogo() {
    const id = this.hoveredProductId();
    if (id == null) return null;
    return this.svc.state().catalogo.find(c => c.productoId === id) ?? null;
  }

  formError = '';
  itemError = '';

  get maxFecha(): string {
    return new Date().toISOString().split('T')[0];
  }

  get productosFiltrados(): ProductoModel[] {
    const q = this.busquedaProducto.toLowerCase();
    return this.svc.state().productos.filter(
      p => !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q),
    );
  }

  get productoSeleccionadoNombre(): string {
    if (this.productoSeleccionadoId == null) return '';
    return this.svc.state().productos.find(p => p.id === this.productoSeleccionadoId)?.nombre ?? '';
  }

  ngOnInit(): void {
    this.svc.cargarProductos();
    this.svc.cargarCatalogo();
  }

  toggleModoProducto(existente: boolean): void {
    this.usarProductoExistente = existente;
    this.productoSeleccionadoId = null;
    this.nuevoNombre = '';
    this.busquedaProducto = '';
  }

  seleccionarProducto(p: ProductoModel): void {
    this.productoSeleccionadoId = p.id;
    this.busquedaProducto = '';
    this.showSelector.set(false);
  }

  agregarProducto(): void {
    this.itemError = '';

    if (!this.cantidad || isNaN(Number(this.cantidad)) || Number(this.cantidad) <= 0) {
      this.itemError = 'Ingresa una cantidad válida mayor a 0.';
      return;
    }
    if (!this.costoTotal || isNaN(Number(this.costoTotal)) || Number(this.costoTotal) <= 0) {
      this.itemError = 'Ingresa un costo total válido.';
      return;
    }
    if (!this.precioVentaMercado || isNaN(Number(this.precioVentaMercado)) || Number(this.precioVentaMercado) <= 0) {
      this.itemError = 'Ingresa el precio de venta mercado.';
      return;
    }
    const cantAvNum = this.cantidadAveriada ? Number(this.cantidadAveriada) : 0;
    if (cantAvNum > Number(this.cantidad)) {
      this.itemError = 'La cantidad averiada no puede superar la cantidad total.';
      return;
    }
    if (this.precioVentaBase && Number(this.precioVentaBase) > Number(this.precioVentaMercado)) {
      this.itemError = 'El precio base no puede superar el precio de mercado.';
      return;
    }
    if (this.usarProductoExistente) {
      if (!this.productoSeleccionadoId) {
        this.itemError = 'Selecciona un producto existente.';
        return;
      }
      if (this.productosAgregados.some(p => p.productoId === this.productoSeleccionadoId)) {
        this.itemError = 'Este producto ya fue agregado.';
        return;
      }
    } else {
      if (!this.nuevoNombre.trim()) {
        this.itemError = 'Ingresa el nombre del nuevo producto.';
        return;
      }
    }

    this.productosAgregados = [...this.productosAgregados, {
      productoId: this.usarProductoExistente ? this.productoSeleccionadoId! : undefined,
      nombre: !this.usarProductoExistente ? this.nuevoNombre.trim() : undefined,
      unidadMedida: this.unidadMedida,
      conFactura: this.conFactura,
      cantidad: this.cantidad,
      cantidadAveriada: this.cantidadAveriada || '0.000',
      costoTotal: this.costoTotal,
      precioVentaBase: this.precioVentaBase || undefined,
      precioVentaMercado: this.precioVentaMercado,
    }];

    // Reset item fields
    this.productoSeleccionadoId = null;
    this.nuevoNombre = '';
    this.cantidad = '';
    this.cantidadAveriada = '';
    this.costoTotal = '';
    this.precioVentaBase = '';
    this.precioVentaMercado = '';
    this.conFactura = true;
    this.unidadMedida = 'NIU';
  }

  eliminarProducto(idx: number): void {
    this.productosAgregados = this.productosAgregados.filter((_, i) => i !== idx);
  }

  getProductoLabel(item: LoteProductoInput): string {
    if (item.nombre) return item.nombre;
    if (item.productoId) {
      return this.svc.state().productos.find(p => p.id === item.productoId)?.nombre ?? `Producto #${item.productoId}`;
    }
    return 'Producto';
  }

  async guardarLote(): Promise<void> {
    this.formError = '';

    if (!this.fechaLlegada) {
      this.formError = 'Selecciona la fecha de llegada.';
      return;
    }
    if (this.productosAgregados.length === 0) {
      this.formError = 'Agrega al menos un producto.';
      return;
    }

    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) {
      this.formError = 'No hay tienda seleccionada.';
      return;
    }

    if (!confirm(`¿Guardar lote con ${this.productosAgregados.length} producto(s)? Esta acción no se puede deshacer.`)) return;

    const ok = await this.svc.crearLote({
      tienda: tiendaId,
      fechaLlegada: this.fechaLlegada,
      costoOperacion: this.costoOperacion || '0.00',
      costoTransporte: this.costoTransporte || '0.00',
      productos: this.productosAgregados,
    });

    if (ok) {
      if (this.modal) {
        this.cerrar.emit('guardado');
      } else {
        this.router.navigate(['/inventario/lotes']);
      }
    }
  }

  onCancelar(): void {
    if (this.modal) {
      this.cerrar.emit('cancelado');
    } else {
      this.router.navigate(['/inventario/lotes']);
    }
  }

  getUnidadLabel(code: string): string {
    return getUnidadMedidaLabel(code);
  }

  onUnidadChange(event: Event): void {
    this.unidadMedida = (event.target as HTMLSelectElement).value;
  }
}
