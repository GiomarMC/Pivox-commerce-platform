import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventarioService } from '../../inventario.service';
import { LoteFormComponent } from '../lote-form/lote-form.component';
import { EditorialPageHeaderComponent } from '../../../../shared/components/editorial-page-header/editorial-page-header.component';
import { HeroNumberComponent } from '../../../../shared/components/hero-number/hero-number.component';

@Component({
  selector: 'app-lote-list',
  standalone: true,
  imports: [RouterLink, LoteFormComponent, EditorialPageHeaderComponent, HeroNumberComponent],
  templateUrl: './lote-list.component.html',
  styleUrl: './lote-list.component.css',
})
export class LoteListComponent implements OnInit {
  readonly svc = inject(InventarioService);
  readonly isDueno = inject(AuthService).isDueno;
  readonly modalAbierto = signal(false);

  readonly totalProductos = computed(() =>
    this.svc.state().lotes.reduce((acc, l) => acc + l.productos.length, 0),
  );

  onModalCerrar(_resultado: 'guardado' | 'cancelado'): void {
    this.modalAbierto.set(false);
  }

  ngOnInit(): void {
    this.svc.cargarLotes();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
    if (nearBottom) this.svc.cargarMasLotes();
  }

  async desactivar(id: number, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm('¿Desactivar este lote? No podrá deshacerse.')) return;
    await this.svc.desactivarLote(id);
  }

  indexLabel(i: number): string {
    return String(i + 1).padStart(3, '0');
  }
}
