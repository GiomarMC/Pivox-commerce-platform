import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { TiendaService } from '../tienda/tienda.service';
import { UsuarioTiendaModel } from '../usuarios/models/usuario-tienda.model';
import { AsistenciaService } from '../asistencia/asistencia.service';
import { AsistenciaResumenModel, UsuarioConAsistencia } from '../asistencia/models/asistencia.model';
import { Roles } from '../../core/auth/auth.models';
import { InvitationService } from '../invitation/invitation.service';
import { CopyLinkButtonComponent } from '../../shared/components/copy-link-button/copy-link-button.component';

type TabKey = 'miembros' | 'asistencia-hoy' | 'resumen';

@Component({
  selector: 'app-equipo',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DecimalPipe, CopyLinkButtonComponent],
  templateUrl: './equipo.component.html',
  styleUrl: './equipo.component.css',
})
export class EquipoComponent implements OnInit {
  readonly usuariosSvc = inject(UsuariosService);
  readonly asistenciaSvc = inject(AsistenciaService);
  readonly invSvc = inject(InvitationService);
  private readonly tiendaSvc = inject(TiendaService);
  private readonly auth = inject(AuthService);
  private readonly invFb = inject(FormBuilder);

  readonly isDueno = this.auth.isDueno;
  readonly userMe = this.auth.userMe;
  readonly Roles = Roles;

  readonly tab = signal<TabKey>('miembros');

  // ── Modal de invitación ──
  dialogInvitar = signal(false);

  invForm = this.invFb.group({
    email:    ['', [Validators.required, Validators.email]],
    rol:      ['', Validators.required],
    tiendaId: [null as number | null],
    salario:  [null as number | null],
  });

  readonly invRequiereTienda = computed(() => {
    const rol = this.invForm.get('rol')?.value;
    return !!rol && rol !== Roles.dueno;
  });

  // ── Filtros miembros ──
  readonly roles = [
    { value: null, label: 'Todos los roles' },
    { value: Roles.dueno, label: 'Dueño' },
    { value: Roles.administrador, label: 'Administrador' },
    { value: Roles.trabajador, label: 'Trabajador' },
  ];
  busqueda = '';

  // ── Edición miembro ──
  editando: UsuarioTiendaModel | null = null;
  editRol = '';
  editSalario = '';

  // ── Asistencia: dialog salida ──
  dialogSalida: UsuarioConAsistencia | null = null;
  almuerzo = false;

  // ── Resumen mensual: filtros ──
  readonly mesOpciones = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: this.nombreMes(i + 1),
  }));
  readonly anioOpciones = [new Date().getFullYear() - 1, new Date().getFullYear()];

  constructor() {
    effect(() => {
      this.auth.selectedTiendaId();
      untracked(() => {
        void this.usuariosSvc.cargarUsuarios();
        this.asistenciaSvc.cargarAsistenciasHoy();
        this.asistenciaSvc.cargarResumen();
      });
    });
  }

  ngOnInit(): void {
    if (this.isDueno()) this.tiendaSvc.cargarTiendas();
  }

  // ── KPIs ──
  readonly miembrosActivos = computed(() =>
    this.usuariosSvc.state().usuarios.filter(u => u.usuarioIsActive && u.usuarioNombre.trim()).length,
  );

  readonly presentesHoy = computed(() =>
    this.asistenciaSvc.state().usuariosHoy.filter(item => !!item.asistencia?.horaEntrada).length,
  );

  readonly totalActivosHoy = computed(() => this.asistenciaSvc.state().usuariosHoy.length);

  readonly horasDelMes = computed(() =>
    this.asistenciaSvc.state().resumen.reduce((acc, r) => acc + r.horasTotales, 0),
  );

  readonly invitacionesPendientes = computed(() =>
    this.usuariosSvc.state().usuarios.filter(u => !u.usuarioIsActive && !u.usuarioNombre.trim()).length,
  );

  // ── Resumen mensual: derivados ──
  readonly resumenRanking = computed(() =>
    [...this.asistenciaSvc.state().resumen].sort((a, b) => b.horasTotales - a.horasTotales),
  );
  readonly resumenTotalDias = computed(() =>
    this.asistenciaSvc.state().resumen.reduce((acc, r) => acc + r.diasTrabajados, 0),
  );
  readonly resumenTotalHoras = computed(() =>
    this.asistenciaSvc.state().resumen.reduce((acc, r) => acc + r.horasTotales, 0),
  );
  readonly resumenPromedioHoras = computed(() => {
    const total = this.asistenciaSvc.state().resumen.length;
    return total > 0 ? this.resumenTotalHoras() / total : 0;
  });
  readonly resumenMaxHoras = computed(() =>
    this.asistenciaSvc.state().resumen.reduce((max, r) => Math.max(max, r.horasTotales), 0),
  );
  readonly resumenTopPerformer = computed((): AsistenciaResumenModel | null => {
    const ranking = this.resumenRanking();
    return ranking.length > 0 ? ranking[0] : null;
  });

  porcentajeHoras(horas: number): number {
    const max = this.resumenMaxHoras();
    return max > 0 ? (horas / max) * 100 : 0;
  }

  // ── Miembros (lista filtrada) ──
  get usuariosFiltrados(): UsuarioTiendaModel[] {
    const q = this.busqueda.toLowerCase();
    return this.usuariosSvc.state().usuarios.filter(
      u => !q || u.usuarioNombre.toLowerCase().includes(q) || u.usuarioEmail.toLowerCase().includes(q),
    );
  }

  esPendiente(u: UsuarioTiendaModel): boolean {
    return !u.usuarioIsActive && !u.usuarioNombre.trim();
  }

  esMiCuenta(u: UsuarioTiendaModel): boolean {
    return u.usuarioId === this.userMe()?.id;
  }

  setTab(t: TabKey): void {
    this.tab.set(t);
    if (t === 'resumen' && this.asistenciaSvc.state().resumen.length === 0) {
      this.asistenciaSvc.cargarResumen();
    }
  }

  onRolChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.usuariosSvc.seleccionarRol(val || null);
  }

  // ── Edición usuario ──
  abrirEdicion(u: UsuarioTiendaModel): void {
    this.editando = u;
    this.editRol = u.rol === Roles.dueno ? '' : u.rol;
    this.editSalario = u.salario;
  }

  async guardarEdicion(): Promise<void> {
    if (!this.editando) return;
    await this.usuariosSvc.editarUsuario({
      id: this.editando.id,
      rol: this.editando.rol === Roles.dueno ? undefined : this.editRol || undefined,
      salario: this.editSalario || undefined,
    });
    this.editando = null;
  }

  async toggleEstado(u: UsuarioTiendaModel): Promise<void> {
    if (!confirm(`¿${u.usuarioIsActive ? 'Desactivar' : 'Activar'} a ${u.usuarioNombre || u.usuarioEmail}?`)) return;
    this.usuariosSvc.toggleEstado(u.id);
  }

  async reenviarInvitacion(u: UsuarioTiendaModel): Promise<void> {
    if (!confirm(`¿Reenviar invitación a ${u.usuarioEmail}? La anterior quedará inválida.`)) return;
    await this.usuariosSvc.refrescarInvitacion(u.usuarioId);
  }

  copiarLink(): void {
    const link = this.usuariosSvc.state().invitationLink;
    if (link) {
      navigator.clipboard.writeText(link);
      this.usuariosSvc.clearInvitationLink();
    }
  }

  // ── Asistencia ──
  marcarEntrada(u: UsuarioConAsistencia): void {
    this.asistenciaSvc.marcarEntrada(u.usuario.id);
  }

  abrirSalida(u: UsuarioConAsistencia): void {
    this.dialogSalida = u;
    this.almuerzo = false;
  }

  confirmarSalida(): void {
    if (!this.dialogSalida) return;
    this.asistenciaSvc.marcarSalida(this.dialogSalida.usuario.id, this.almuerzo);
    this.dialogSalida = null;
  }

  onMesChange(event: Event): void {
    const mes = +(event.target as HTMLSelectElement).value;
    this.asistenciaSvc.cargarResumen(mes, this.asistenciaSvc.state().anioResumen);
  }

  onAnioChange(event: Event): void {
    const anio = +(event.target as HTMLSelectElement).value;
    this.asistenciaSvc.cargarResumen(this.asistenciaSvc.state().mesResumen, anio);
  }

  abrirInvitar(): void {
    this.invSvc.clearMessages();
    this.invForm.reset();
    void this.invSvc.cargarRolesYTiendas();
    this.dialogInvitar.set(true);
  }

  cerrarInvitar(): void {
    this.dialogInvitar.set(false);
    this.invSvc.reset();
    this.invForm.reset();
  }

  async submitInvitar(): Promise<void> {
    this.invForm.markAllAsTouched();
    if (this.invForm.invalid) return;
    const { email, rol, tiendaId, salario } = this.invForm.value;
    await this.invSvc.crearInvitacion(
      email!,
      rol!,
      tiendaId ?? undefined,
      salario ?? undefined,
    );
  }

  nuevaInvitacion(): void {
    this.invSvc.reset();
    this.invForm.reset();
  }

  formatHora(hora: string | null): string {
    if (!hora) return '';
    return hora.slice(0, 5);
  }

  private nombreMes(n: number): string {
    return new Date(2000, n - 1, 1).toLocaleString('es-PE', { month: 'long' });
  }
}
