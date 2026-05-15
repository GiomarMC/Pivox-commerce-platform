import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TiendaService } from '../../tienda.service';
import { StoreModel } from '../../../../core/models/store.model';

@Component({
  selector: 'app-tiendas',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './tiendas.component.html',
  styleUrl: './tiendas.component.css',
})
export class TiendasComponent implements OnInit {
  readonly svc = inject(TiendaService);
  readonly auth = inject(AuthService);

  readonly isDueno = this.auth.isDueno;
  readonly selectedId = this.auth.selectedTiendaId;

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
}
