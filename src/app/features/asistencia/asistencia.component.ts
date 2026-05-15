import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AsistenciaService } from './asistencia.service';
import { UsuarioConAsistencia } from './models/asistencia.model';

type Tab = 'hoy' | 'resumen';

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './asistencia.component.html',
  styleUrl: './asistencia.component.css',
})
export class AsistenciaComponent implements OnInit {
  readonly svc = inject(AsistenciaService);
  private readonly auth = inject(AuthService);
  readonly tab = signal<Tab>('hoy');

  mesOpciones = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: this.nombreMes(i + 1) }));
  anioOpciones = [new Date().getFullYear() - 1, new Date().getFullYear()];

  dialogSalida: UsuarioConAsistencia | null = null;
  almuerzo = false;

  constructor() {
    effect(() => {
      this.auth.selectedTiendaId();
      this.svc.cargarAsistenciasHoy();
    });
  }

  ngOnInit(): void {}

  cambiarTab(t: Tab): void {
    this.tab.set(t);
    if (t === 'resumen' && this.svc.state().resumen.length === 0) {
      this.svc.cargarResumen();
    }
  }

  marcarEntrada(u: UsuarioConAsistencia): void {
    this.svc.marcarEntrada(u.usuario.id);
  }

  abrirSalida(u: UsuarioConAsistencia): void {
    this.dialogSalida = u;
    this.almuerzo = false;
  }

  confirmarSalida(): void {
    if (!this.dialogSalida) return;
    this.svc.marcarSalida(this.dialogSalida.usuario.id, this.almuerzo);
    this.dialogSalida = null;
  }

  cambiarMes(mes: number): void {
    this.svc.cargarResumen(mes, this.svc.state().anioResumen);
  }

  cambiarAnio(anio: number): void {
    this.svc.cargarResumen(this.svc.state().mesResumen, anio);
  }

  onMesChange(event: Event): void {
    this.cambiarMes(+(event.target as HTMLSelectElement).value);
  }

  onAnioChange(event: Event): void {
    this.cambiarAnio(+(event.target as HTMLSelectElement).value);
  }

  private nombreMes(n: number): string {
    return new Date(2000, n - 1, 1).toLocaleString('es-PE', { month: 'long' });
  }
}
