import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventarioService } from '../../inventario.service';

@Component({
  selector: 'app-lote-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lote-detail.component.html',
  styleUrl: './lote-detail.component.css',
})
export class LoteDetailComponent implements OnInit {
  readonly svc = inject(InventarioService);
  readonly isDueno = inject(AuthService).isDueno;
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.cargarLoteDetalle(id);
  }

  async desactivar(): Promise<void> {
    const lote = this.svc.state().loteDetalle;
    if (!lote) return;
    if (!confirm(`¿Desactivar el lote #${lote.id}? No podrá deshacerse.`)) return;
    await this.svc.desactivarLote(lote.id);
  }
}
