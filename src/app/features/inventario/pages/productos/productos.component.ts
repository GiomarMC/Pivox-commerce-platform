import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CatalogoService } from '../../catalogo.service';
import { InventarioService } from '../../inventario.service';
import { ProductoCatalogoModel } from '../../models/producto.model';
import { TIPO_IGV_VALUES, getTipoIgvLabel } from '../../constants/tipo-igv';
import { getUnidadMedidaLabel } from '../../constants/unidad-medida';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit, OnDestroy {
  readonly catalogoSvc = inject(CatalogoService);
  readonly inventarioSvc = inject(InventarioService);
  readonly auth = inject(AuthService);
  readonly isDueno = this.auth.isDueno;

  readonly productoSeleccionado = signal<ProductoCatalogoModel | null>(null);
  readonly tiposIgv = TIPO_IGV_VALUES.map(v => ({ value: v, label: getTipoIgvLabel(v) }));

  busqueda = '';
  editTipoIgv = '';
  editIsActive = true;
  editImagenFile: File | null = null;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.catalogoSvc.cargarCatalogo();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
    if (nearBottom) this.catalogoSvc.cargarMasCatalogo();
  }

  onBusquedaChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.catalogoSvc.cargarCatalogo(this.busqueda || undefined);
    }, 400);
  }

  seleccionar(p: ProductoCatalogoModel): void {
    this.productoSeleccionado.set(p);
    this.editTipoIgv = p.tipoIgv;
    this.editIsActive = p.isActive;
    this.editImagenFile = null;
  }

  cerrarPanel(): void {
    this.productoSeleccionado.set(null);
  }

  onImagenChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.editImagenFile = file ?? null;
  }

  async guardarProducto(): Promise<void> {
    const p = this.productoSeleccionado();
    if (!p) return;
    await this.inventarioSvc.actualizarProducto(
      p.productoId,
      { tipoIgv: this.editTipoIgv, isActive: this.editIsActive },
      this.editImagenFile ?? undefined,
    );
    if (!this.inventarioSvc.state().errorMessage) {
      this.cerrarPanel();
      this.catalogoSvc.cargarCatalogo(this.busqueda || undefined);
    }
  }

  getUnidadLabel(code: string): string {
    return getUnidadMedidaLabel(code);
  }

  getTipoIgvLabel(code: string): string {
    return getTipoIgvLabel(code);
  }
}
