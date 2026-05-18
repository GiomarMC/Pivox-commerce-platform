import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TiendaService } from '../../tienda.service';
import { StoreModel } from '../../../../core/models/store.model';
import { EditorialPageHeaderComponent } from '../../../../shared/components/editorial-page-header/editorial-page-header.component';
import { EditorialSectionComponent } from '../../../../shared/components/editorial-section/editorial-section.component';
import { HeroNumberComponent } from '../../../../shared/components/hero-number/hero-number.component';

@Component({
  selector: 'app-tiendas',
  standalone: true,
  imports: [
    RouterLink,
    EditorialPageHeaderComponent,
    EditorialSectionComponent,
    HeroNumberComponent,
  ],
  templateUrl: './tiendas.component.html',
  styleUrl: './tiendas.component.css',
})
export class TiendasComponent implements OnInit {
  readonly svc = inject(TiendaService);
  readonly auth = inject(AuthService);

  readonly isDueno = this.auth.isDueno;
  readonly selectedId = this.auth.selectedTiendaId;

  readonly totalTiendas = computed(() => this.svc.state().tiendas.length);
  readonly tiendaActivaNombre = computed((): string => {
    const id = this.selectedId();
    const tienda = this.svc.state().tiendas.find(t => t.id === id);
    return tienda?.nombreSede ?? '—';
  });

  ngOnInit(): void {
    this.svc.cargarTiendas();
  }

  seleccionarTienda(id: number): void {
    this.auth.selectTienda(id);
  }

  desactivar(tienda: StoreModel): void {
    if (!confirm(`¿Desactivar la tienda "${tienda.nombreSede}"?`)) return;
    this.svc.desactivarTienda(tienda.id);
  }

  indexLabel(i: number): string {
    return String(i + 1).padStart(2, '0');
  }
}
