import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { CatalogoService } from '../../catalogo.service';
import { InventarioService } from '../../inventario.service';
import { ProductoCatalogoModel } from '../../models/producto.model';
import { TIPO_IGV_VALUES, getTipoIgvLabel } from '../../constants/tipo-igv';
import { getUnidadMedidaLabel } from '../../constants/unidad-medida';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule],
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

  readonly totalCargados = computed(() => this.catalogoSvc.state().productos.length);
  readonly conStockCount = computed(() =>
    this.catalogoSvc.state().productos.filter(p => parseFloat(p.cantidadDisponible) > 0).length
  );
  readonly sinStockCount = computed(() =>
    this.catalogoSvc.state().productos.filter(p => parseFloat(p.cantidadDisponible) <= 0).length
  );

  busqueda = '';
  editTipoIgv = '';
  editIsActive = true;
  editImagenFile: File | null = null;
  readonly editImagenError = signal<string | null>(null);

  private static readonly IMG_MAX_BYTES = 2 * 1024 * 1024;
  private static readonly IMG_EXT_ALLOWED = ['jpg', 'jpeg', 'png', 'webp'];

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // ── Imágenes fallidas (solo UI) ──
  private readonly imgFailedIds = new Set<number>();
  hasImgFailed(productoId: number): boolean { return this.imgFailedIds.has(productoId); }
  onImgError(productoId: number): void { this.imgFailedIds.add(productoId); }

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
    this.editImagenError.set(null);
  }

  cerrarPanel(): void {
    this.productoSeleccionado.set(null);
    this.editImagenError.set(null);
  }

  onImagenChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.editImagenFile = null;
      this.editImagenError.set(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ProductosComponent.IMG_EXT_ALLOWED.includes(ext)) {
      this.editImagenFile = null;
      this.editImagenError.set('Formato no permitido. Usa JPG, PNG o WEBP.');
      input.value = '';
      return;
    }

    if (file.size > ProductosComponent.IMG_MAX_BYTES) {
      this.editImagenFile = null;
      this.editImagenError.set('La imagen excede el tamaño máximo permitido (2 MB).');
      input.value = '';
      return;
    }

    this.editImagenFile = file;
    this.editImagenError.set(null);
  }

  async guardarProducto(): Promise<void> {
    const p = this.productoSeleccionado();
    if (!p || this.editImagenError()) return;
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
