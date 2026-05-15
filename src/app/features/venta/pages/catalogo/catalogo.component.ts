import { Component, HostListener, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CatalogoService } from '../../../inventario/catalogo.service';
import { CarritoService } from '../../carrito.service';
import { ResumenVentaService } from '../../resumen-venta.service';
import { ProductoCatalogoModel } from '../../../inventario/models/producto.model';
import { FlowHeaderComponent } from '../../components/flow-header/flow-header.component';
import { getUnidadMedidaLabel } from '../../../inventario/constants/unidad-medida';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [RouterLink, FormsModule, FlowHeaderComponent, DecimalPipe],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css',
})
export class CatalogoComponent implements OnInit, OnDestroy {
  readonly svc = inject(CatalogoService);
  readonly carritoSvc = inject(CarritoService);
  private readonly resumenSvc = inject(ResumenVentaService);

  readonly esSunat = computed(() => this.resumenSvc.state().tipoVenta === 'SUNAT');

  busqueda = '';
  readonly modalProducto = signal<ProductoCatalogoModel | null>(null);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void this.svc.cargarCatalogo();
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
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
}
