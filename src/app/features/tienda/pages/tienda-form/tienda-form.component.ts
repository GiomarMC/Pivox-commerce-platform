import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TiendaService } from '../../tienda.service';
import { StoreModel } from '../../../../core/models/store.model';
import { EditorialPageHeaderComponent } from '../../../../shared/components/editorial-page-header/editorial-page-header.component';
import { EditorialSectionComponent } from '../../../../shared/components/editorial-section/editorial-section.component';

@Component({
  selector: 'app-tienda-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    EditorialPageHeaderComponent,
    EditorialSectionComponent,
  ],
  templateUrl: './tienda-form.component.html',
  styleUrl: './tienda-form.component.css',
})
export class TiendaFormComponent implements OnInit {
  private readonly svc = inject(TiendaService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  tiendaExistente: StoreModel | null = null;
  get esEdicion(): boolean { return this.tiendaExistente !== null; }

  form = this.fb.group({
    nombreSede: ['', Validators.required],
    direccion: ['', Validators.required],
    ubigeo: [''],
    serieFactura: [''],
    serieBoleta: [''],
    serieTicket: [''],
  });

  readonly state = this.svc.state;

  readonly modoLabel = computed(() => this.esEdicion ? 'Editando sede' : 'Nueva sede');

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const tienda = nav?.extras?.state?.['tienda'] as StoreModel | undefined;
    if (tienda) {
      this.tiendaExistente = tienda;
      this.form.patchValue({
        nombreSede: tienda.nombreSede,
        direccion: tienda.direccion,
        ubigeo: tienda.ubigeo,
      });
    } else {
      const tiendas = this.svc.state().tiendas;
      this.form.patchValue({
        serieFactura: this.siguienteSerie(tiendas.map(t => t.serieFactura), 'F'),
        serieBoleta: this.siguienteSerie(tiendas.map(t => t.serieBoleta), 'B'),
        serieTicket: this.siguienteSerie(tiendas.map(t => t.serieTicket), 'T'),
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    const v = this.form.value;

    if (this.esEdicion) {
      await this.svc.actualizarTienda(this.tiendaExistente!.id, {
        nombreSede: v.nombreSede!,
        direccion: v.direccion!,
        ubigeo: v.ubigeo ?? '',
      });
    } else {
      await this.svc.crearTienda({
        nombreSede: v.nombreSede!,
        direccion: v.direccion!,
        ubigeo: v.ubigeo ?? '',
        serieFactura: v.serieFactura ?? 'F001',
        serieBoleta: v.serieBoleta ?? 'B001',
        serieTicket: v.serieTicket ?? 'T001',
        empresaId: 1,
      });
    }

    if (!this.svc.state().errorMessage) {
      this.router.navigate(['/tiendas']);
    }
  }

  volver(): void {
    this.router.navigate(['/tiendas']);
  }

  private siguienteSerie(series: string[], prefijo: string): string {
    let max = 0;
    for (const s of series) {
      const m = /(\d+)/.exec(s);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${prefijo}${String(max + 1).padStart(3, '0')}`;
  }
}
