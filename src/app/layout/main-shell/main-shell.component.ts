import { Component, computed, inject, signal, effect, untracked, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LowerCasePipe],
  templateUrl: './main-shell.component.html',
  styleUrl: './main-shell.component.css',
})
export class MainShellComponent {
  private readonly auth  = inject(AuthService);
  private readonly router = inject(Router);
  readonly notifSvc       = inject(NotificacionService);

  readonly canViewUsuarios   = this.auth.canViewUsuarios;
  readonly isDueno           = this.auth.isDueno;
  readonly userMe            = this.auth.userMe;
  readonly tiendaActivaNombre = computed((): string | null => {
    const selectedId = this.auth.selectedTiendaId();
    if (!selectedId) return null;
    const tiendas = this.auth.userMe()?.tiendas ?? [];
    return tiendas.find(t => t.tiendaId === selectedId)?.tiendaNombre ?? null;
  });

  readonly menuOpen    = signal(false);
  readonly profileOpen = signal(false);
  readonly panelNotifs = signal(false);

  constructor() {
    effect(() => {
      const tiendaId = this.auth.selectedTiendaId();
      untracked(() => {
        this.notifSvc.limpiar();
        if (tiendaId != null) void this.notifSvc.cargar(tiendaId);
      });
    });
  }

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
      void this.notifSvc.cargar(this.auth.selectedTiendaId() ?? undefined);
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
