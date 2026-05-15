import { Component, OnInit, inject, signal, effect, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UsuariosService } from './usuarios.service';
import { TiendaService } from '../tienda/tienda.service';
import { UsuarioTiendaModel } from './models/usuario-tienda.model';
import { Roles } from '../../core/auth/auth.models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  readonly svc = inject(UsuariosService);
  readonly tiendaSvc = inject(TiendaService);
  readonly auth = inject(AuthService);

  readonly isDueno = this.auth.isDueno;
  readonly userMe = this.auth.userMe;

  readonly roles = [
    { value: null, label: 'Todos los roles' },
    { value: Roles.dueno, label: 'Dueño' },
    { value: Roles.administrador, label: 'Administrador' },
    { value: Roles.trabajador, label: 'Trabajador' },
  ];

  busqueda = '';
  editando: UsuarioTiendaModel | null = null;
  editRol = '';
  editSalario = '';

  constructor() {
    effect(() => {
      this.auth.selectedTiendaId();
      untracked(() => this.svc.cargarUsuarios());
    });
  }

  ngOnInit(): void {
    if (this.isDueno()) this.tiendaSvc.cargarTiendas();
  }

  get usuariosFiltrados(): UsuarioTiendaModel[] {
    const q = this.busqueda.toLowerCase();
    return this.svc.state().usuarios.filter(
      u => !q || u.usuarioNombre.toLowerCase().includes(q) || u.usuarioEmail.toLowerCase().includes(q),
    );
  }

  seleccionarRol(rol: string | null): void {
    this.svc.seleccionarRol(rol);
  }

  esPendiente(u: UsuarioTiendaModel): boolean {
    return !u.usuarioIsActive && !u.usuarioNombre.trim();
  }

  esInactivo(u: UsuarioTiendaModel): boolean {
    return !u.usuarioIsActive && !!u.usuarioNombre.trim();
  }

  esMiCuenta(u: UsuarioTiendaModel): boolean {
    return u.usuarioId === this.userMe()?.id;
  }

  abrirEdicion(u: UsuarioTiendaModel): void {
    this.editando = u;
    this.editRol = u.rol === Roles.dueno ? '' : u.rol;
    this.editSalario = u.salario;
  }

  async guardarEdicion(): Promise<void> {
    if (!this.editando) return;
    await this.svc.editarUsuario({
      id: this.editando.id,
      rol: this.editando.rol === Roles.dueno ? undefined : this.editRol || undefined,
      salario: this.editSalario || undefined,
    });
    this.editando = null;
  }

  async toggleEstado(u: UsuarioTiendaModel): Promise<void> {
    if (!confirm(`¿${u.usuarioIsActive ? 'Desactivar' : 'Activar'} a ${u.usuarioNombre || u.usuarioEmail}?`)) return;
    this.svc.toggleEstado(u.id);
  }

  async reenviarInvitacion(u: UsuarioTiendaModel): Promise<void> {
    if (!confirm(`¿Reenviar invitación a ${u.usuarioEmail}? La anterior quedará inválida.`)) return;
    await this.svc.refrescarInvitacion(u.usuarioId);
  }

  copiarLink(): void {
    const link = this.svc.state().invitationLink;
    if (link) {
      navigator.clipboard.writeText(link);
      this.svc.clearInvitationLink();
    }
  }

  onRolChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.seleccionarRol(val || null);
  }

  readonly Roles = Roles;
}
