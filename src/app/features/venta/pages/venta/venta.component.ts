import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Subscription } from 'rxjs';
import { CatalogoService } from '../../../inventario/catalogo.service';
import { CarritoService } from '../../carrito.service';
import { InventarioService } from '../../../inventario/inventario.service';
import { ResumenVentaService } from '../../resumen-venta.service';
import { VentaService } from '../../venta.service';
import { CarritoItem } from '../../models/carrito.model';
import { ClienteModel } from '../../models/cliente.model';
import { LoteProductoResponse } from '../../../inventario/models/lote.model';
import { ProductoCatalogoModel } from '../../../inventario/models/producto.model';
import { FlowHeaderComponent } from '../../components/flow-header/flow-header.component';
import { ClienteSearchComponent } from '../../components/cliente-search/cliente-search.component';
import { PropuestaSunatComponent } from '../propuesta-sunat/propuesta-sunat.component';
import { ComprobanteComponent } from '../comprobante/comprobante.component';
import { getUnidadMedidaLabel } from '../../../inventario/constants/unidad-medida';
import { METODO_PAGO_VALUES, getMetodoPagoLabel } from '../../constants/metodo-pago';
import { TIPO_COMPROBANTE_VALUES, getTipoComprobanteLabel } from '../../constants/tipo-comprobante';
import { ventaFormValidator, rucValidator, noRucEnBoletaValidator } from '../../validators/venta.validators';

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
  selector: 'app-venta',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    FlowHeaderComponent,
    ClienteSearchComponent,
    PropuestaSunatComponent,
    ComprobanteComponent,
    DecimalPipe,
    NgTemplateOutlet,
  ],
  templateUrl: './venta.component.html',
  styleUrl: './venta.component.css',
})
export class VentaComponent implements OnInit, OnDestroy {
  readonly svc = inject(CatalogoService);
  readonly carritoSvc = inject(CarritoService);
  readonly inventarioSvc = inject(InventarioService);
  private readonly resumenSvc = inject(ResumenVentaService);
  readonly ventaSvc = inject(VentaService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // ── Catálogo ──
  busqueda = '';
  readonly modalProducto = signal<ProductoCatalogoModel | null>(null);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Imágenes fallidas (solo UI) ──
  private readonly imgFailedIds = new Set<number>();
  hasImgFailed(productoId: number): boolean { return this.imgFailedIds.has(productoId); }
  onImgError(productoId: number): void { this.imgFailedIds.add(productoId); }

  // ── Panel / Carrito ──
  readonly mostrarSheet = signal(false);
  readonly panelStep = signal<1 | 2>(1);
  readonly modalActivo = signal<'propuesta' | 'comprobante' | null>(null);
  readonly modalLoteData = signal<ModalLoteData | null>(null);
  readonly stockError = signal<string | null>(null);

  private readonly _resetStep = effect(() => {
    if (this.carritoSvc.count() === 0) this.panelStep.set(1);
  });

  // ── Resumen / Pago ──
  private readonly _metodoPago = signal('EFECTIVO');
  private readonly _tipoComprobante = signal('');
  private readonly _tipoVenta = signal('NORMAL');

  readonly metodoPago = this._metodoPago.asReadonly();
  readonly tipoComprobante = this._tipoComprobante.asReadonly();
  readonly tipoVentaActual = this._tipoVenta.asReadonly();

  readonly isSunat = computed(() => this._tipoVenta() === 'SUNAT');
  readonly isCredito = computed(() => this._tipoVenta() === 'CREDITO');
  readonly esSunat = computed(() => this._tipoVenta() === 'SUNAT');
  readonly clienteObligatorio = computed(
    () => this.isCredito() || (this.isSunat() && this._tipoComprobante() === '01'),
  );

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

  readonly metodoPagoValues = METODO_PAGO_VALUES;
  readonly tipoComprobanteValues = TIPO_COMPROBANTE_VALUES;
  readonly getMetodoPagoLabel = getMetodoPagoLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;

  // ── Lote modal computed ──
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

  form = this.fb.group(
    {
      metodoPago: ['EFECTIVO', Validators.required],
      tipoComprobante: [''],
      clienteId: [null as number | null],
      usarClienteNuevo: [false],
      clienteNuevo: this.fb.group({
        tipoDocumento: ['1'],
        numeroDocumento: [''],
        nombre: [''],
        telefono: [''],
        email: [''],
        direccion: [''],
      }),
    },
    { validators: ventaFormValidator },
  );

  private subs: Subscription[] = [];

  ngOnInit(): void {
    void this.svc.cargarCatalogo();
    if (this.inventarioSvc.state().lotes.length === 0) {
      void this.inventarioSvc.cargarLotes();
    }

    const saved = this.resumenSvc.state();
    this._tipoVenta.set(saved.tipoVenta);
    this._metodoPago.set(saved.metodoPago);
    this._tipoComprobante.set(saved.tipoComprobante ?? '');

    this.form.patchValue({
      metodoPago: saved.metodoPago,
      tipoComprobante: saved.tipoComprobante ?? '',
      clienteId: saved.clienteId,
      usarClienteNuevo: saved.usarClienteNuevo,
    });

    const tipoDocCtrl = this.form.get('clienteNuevo.tipoDocumento')!;
    const numDocCtrl = this.form.get('clienteNuevo.numeroDocumento')!;
    const tipoCompCtrl = this.form.get('tipoComprobante')!;

    this.subs.push(
      this.form.get('metodoPago')!.valueChanges.subscribe(v => {
        this._metodoPago.set(v ?? 'EFECTIVO');
      }),
    );
    this.subs.push(
      tipoCompCtrl.valueChanges.subscribe(v => {
        this._tipoComprobante.set(v ?? '');
      }),
    );
    this.subs.push(
      tipoDocCtrl.valueChanges.subscribe(tipo => {
        if (tipo === '6') {
          numDocCtrl.setValidators([rucValidator()]);
        } else {
          numDocCtrl.clearValidators();
        }
        numDocCtrl.updateValueAndValidity();
      }),
    );
    this.subs.push(
      tipoCompCtrl.valueChanges.subscribe(() => {
        tipoDocCtrl.setValidators([noRucEnBoletaValidator(tipoCompCtrl)]);
        tipoDocCtrl.updateValueAndValidity();
      }),
    );
    this.subs.push(
      this.form.valueChanges.subscribe(val => {
        const cn = val['clienteNuevo'] ?? {};
        this.resumenSvc.actualizar({
          metodoPago: val['metodoPago'] ?? 'EFECTIVO',
          tipoComprobante: val['tipoComprobante'] || null,
          clienteId: val['clienteId'] ?? null,
          usarClienteNuevo: val['usarClienteNuevo'] ?? false,
          clienteNuevo: {
            tipoDocumento: (cn['tipoDocumento'] as string) ?? '1',
            numeroDocumento: (cn['numeroDocumento'] as string) ?? '',
            nombre: (cn['nombre'] as string) ?? '',
            email: (cn['email'] as string) || undefined,
            telefono: (cn['telefono'] as string) || undefined,
            direccion: (cn['direccion'] as string) || undefined,
          },
        });
      }),
    );

    if (this.isSunat()) {
      tipoCompCtrl.setValidators([Validators.required]);
      tipoCompCtrl.updateValueAndValidity();
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Catálogo ──

  onCatalogScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
    if (nearBottom) void this.svc.cargarMasCatalogo();
  }

  onBusquedaChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.svc.cargarCatalogo(this.busqueda || undefined);
    }, 400);
  }

  estaEnCarrito(productoId: number): boolean {
    return this.carritoSvc.items().some(i => i.productoId === productoId);
  }

  onTapProducto(p: ProductoCatalogoModel): void {
    if (+p.cantidadDisponible <= 0) return;

    if (this.estaEnCarrito(p.productoId)) {
      this.carritoSvc.eliminarItem(p.productoId, false);
      this.carritoSvc.eliminarItem(p.productoId, true);
      return;
    }

    if (+p.cantidadAveriada > 0) {
      this.modalProducto.set(p);
      return;
    }

    this.carritoSvc.agregarItem(p, false);
  }

  seleccionarTipoModal(esAveriado: boolean): void {
    const p = this.modalProducto();
    if (!p) return;
    this.carritoSvc.agregarItem(p, esAveriado);
    this.modalProducto.set(null);
  }

  getUnidadLabel(code: string): string {
    return getUnidadMedidaLabel(code);
  }

  // ── Tipo de venta ──

  seleccionarTipoVenta(tipo: string): void {
    this._tipoVenta.set(tipo);
    this.resumenSvc.actualizar({ tipoVenta: tipo });

    const tipoCompCtrl = this.form.get('tipoComprobante')!;
    if (tipo === 'SUNAT') {
      tipoCompCtrl.setValidators([Validators.required]);
    } else {
      tipoCompCtrl.clearValidators();
      this.form.patchValue({ tipoComprobante: '' });
    }
    tipoCompCtrl.updateValueAndValidity();
  }

  nextStep(): void {
    if (this.carritoSvc.count() === 0) return;
    this.panelStep.set(2);
  }

  chipClass(activo: boolean): string {
    return activo ? 'chip chip-active' : 'chip';
  }

  // ── Cart item controls ──

  decrementar(item: CarritoItem): void {
    const nueva = item.cantidad - 1;
    if (nueva <= 0) {
      this.carritoSvc.eliminarItem(item.productoId, item.esAveriado);
    } else {
      this.carritoSvc.actualizarCantidad(item.productoId, item.esAveriado, nueva);
    }
  }

  incrementar(item: CarritoItem): void {
    this.carritoSvc.actualizarCantidad(item.productoId, item.esAveriado, item.cantidad + 1);
  }

  eliminar(item: CarritoItem): void {
    this.carritoSvc.eliminarItem(item.productoId, item.esAveriado);
  }

  onCantidadChange(item: CarritoItem, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) this.carritoSvc.actualizarCantidad(item.productoId, item.esAveriado, val);
  }

  onPrecioChange(item: CarritoItem, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 0) this.carritoSvc.actualizarPrecio(item.productoId, item.esAveriado, val);
  }

  toggleAveriado(item: CarritoItem, valor: boolean): void {
    this.carritoSvc.actualizarAveriado(item.productoId, item.esAveriado, valor);
  }

  // ── Lote modal ──

  abrirModalLote(item: CarritoItem, idx: number): void {
    this.modalLoteData.set({ item, idx });
  }

  seleccionarLote(loteId: number | null): void {
    const data = this.modalLoteData();
    if (!data) return;
    this.carritoSvc.actualizarLote(data.item.productoId, data.item.esAveriado, loteId);
    this.modalLoteData.set(null);
  }

  loteEsSinFactura(item: CarritoItem): boolean {
    const lotes = this.inventarioSvc.state().lotes;
    if (item.loteProductoId === null) {
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

  // ── Cliente ──

  setUsarClienteNuevo(value: boolean): void {
    this.form.patchValue({ usarClienteNuevo: value });
    if (!value) this.form.patchValue({ clienteId: null });
  }

  onClienteSeleccionado(cliente: ClienteModel): void {
    this.resumenSvc.seleccionarCliente(cliente);
    this.form.patchValue({ clienteId: cliente.id, usarClienteNuevo: false });
  }

  onLimpiarCliente(): void {
    this.form.patchValue({ clienteId: null });
    this.resumenSvc.actualizar({ clienteId: null, clienteNombre: null });
  }

  // ── Pagar ──

  hayStockInsuficiente(): boolean {
    return this.carritoSvc.items().some(i => i.cantidad > i.stockDisponible);
  }

  async pagar(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.carritoSvc.count() === 0) return;
    const insuficientes = this.carritoSvc.items().filter(i => i.cantidad > i.stockDisponible);
    if (insuficientes.length > 0) {
      this.stockError.set(
        `Stock insuficiente: ${insuficientes.map(i => `${i.nombre} (disp: ${i.stockDisponible})`).join(', ')}`,
      );
      return;
    }
    this.stockError.set(null);
    this.ventaSvc.clearMessages();
    const venta = await this.ventaSvc.crearVenta();
    if (!venta) return;
    if (venta.propuestaSunat.length > 0) {
      this.modalActivo.set('propuesta');
    } else {
      this.modalActivo.set('comprobante');
    }
  }

  onPropuestaConfirmada(): void {
    this.modalActivo.set('comprobante');
  }

  cerrarModal(): void {
    this.modalActivo.set(null);
  }

  onVentaCancelada(): void {
    this.modalActivo.set(null);
  }
}
