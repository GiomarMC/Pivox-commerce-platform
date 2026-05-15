import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { TiendaService } from '../../features/tienda/tienda.service';
import { NotificacionService } from '../../core/services/notificacion.service';

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LowerCasePipe],
  templateUrl: './main-shell.component.html',
  styleUrl: './main-shell.component.css',
})
export class MainShellComponent {
  private readonly auth      = inject(AuthService);
  private readonly router    = inject(Router);
  private readonly tiendaSvc = inject(TiendaService);
  readonly notifSvc          = inject(NotificacionService);

  readonly canViewUsuarios = this.auth.canViewUsuarios;
  readonly isDueno         = this.auth.isDueno;
  readonly userMe          = this.auth.userMe;
  readonly tiendaActiva    = this.tiendaSvc.tiendaActiva;

  readonly menuOpen    = signal(false);
  readonly profileOpen = signal(false);
  readonly panelNotifs = signal(false);

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.panelNotifs.set(false);
    }
  }

  toggleMenu(): void    { this.menuOpen.update(v => !v); }
  closeMenu(): void     { this.menuOpen.set(false); }
  toggleProfile(): void { this.profileOpen.update(v => !v); }
  closeProfile(): void  { this.profileOpen.set(false); }

  toggleNotifs(): void {
    const opening = !this.panelNotifs();
    this.panelNotifs.set(opening);
    this.profileOpen.set(false);
    if (opening && !this.notifSvc.state().cargado) {
      const tienda = this.tiendaActiva() as { id?: number } | null;
      void this.notifSvc.cargar(tienda?.id);
    }
  }

  irA(ruta: string): void {
    this.panelNotifs.set(false);
    void this.router.navigate([ruta]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  cambiarTienda(): void {
    this.auth.clearTiendaSelection();
    this.router.navigate(['/select-store']);
  }
}
