import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventarioService } from '../../inventario.service';
import { LoteFormComponent } from '../lote-form/lote-form.component';

@Component({
  selector: 'app-lote-list',
  standalone: true,
  imports: [RouterLink, LoteFormComponent],
  templateUrl: './lote-list.component.html',
  styleUrl: './lote-list.component.css',
})
export class LoteListComponent implements OnInit {
  readonly svc = inject(InventarioService);
  readonly isDueno = inject(AuthService).isDueno;
  readonly modalAbierto = signal(false);

  onModalCerrar(resultado: 'guardado' | 'cancelado'): void {
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
}
