import { Routes } from '@angular/router';
import { authGuard, adminGuard, duenioGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'invite',
    loadComponent: () =>
      import('./features/invitation/pages/invitation-accept/invitation-accept.component').then(
        m => m.InvitationAcceptComponent,
      ),
  },
  {
    path: 'profile/complete',
    loadComponent: () =>
      import('./features/onboarding/profile-complete/profile-complete.component').then(
        m => m.ProfileCompleteComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'setup',
    loadComponent: () =>
      import('./features/onboarding/setup/setup.component').then(m => m.SetupComponent),
    canActivate: [authGuard],
  },
  {
    path: 'select-store',
    loadComponent: () =>
      import('./features/auth/store-selector/store-selector.component').then(
        m => m.StoreSelectorComponent,
      ),
    canActivate: [authGuard],
  },

  {
    path: '',
    loadComponent: () =>
      import('./layout/main-shell/main-shell.component').then(m => m.MainShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home.component').then(m => m.HomeComponent),
      },

      // Inventario
      { path: 'inventario', redirectTo: 'inventario/productos', pathMatch: 'full' },
      {
        path: 'inventario/lotes',
        loadComponent: () =>
          import('./features/inventario/pages/lote-list/lote-list.component').then(
            m => m.LoteListComponent,
          ),
      },
      {
        path: 'inventario/lotes/nuevo',
        loadComponent: () =>
          import('./features/inventario/pages/lote-form/lote-form.component').then(
            m => m.LoteFormComponent,
          ),
      },
      {
        path: 'inventario/lotes/:id',
        loadComponent: () =>
          import('./features/inventario/pages/lote-detail/lote-detail.component').then(
            m => m.LoteDetailComponent,
          ),
      },
      {
        path: 'inventario/productos',
        loadComponent: () =>
          import('./features/inventario/pages/productos/productos.component').then(
            m => m.ProductosComponent,
          ),
      },

      // Operaciones
      { path: 'operaciones', redirectTo: 'operaciones/historial', pathMatch: 'full' },
      {
        path: 'operaciones/historial',
        loadComponent: () =>
          import(
            './features/operaciones/operaciones-historial/operaciones-historial.component'
          ).then(m => m.OperacionesHistorialComponent),
      },

      // Ventas
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/venta/pages/venta/venta.component').then(m => m.VentaComponent),
      },
      { path: 'ventas/catalogo', redirectTo: 'ventas', pathMatch: 'full' },
      { path: 'ventas/pedido',   redirectTo: 'ventas', pathMatch: 'full' },
      { path: 'ventas/carrito',  redirectTo: 'ventas', pathMatch: 'full' },
      { path: 'ventas/resumen',  redirectTo: 'ventas', pathMatch: 'full' },
      {
        path: 'ventas/propuesta-sunat',
        loadComponent: () =>
          import('./features/venta/pages/propuesta-sunat/propuesta-sunat.component').then(
            m => m.PropuestaSunatComponent,
          ),
      },
      {
        path: 'ventas/comprobante',
        loadComponent: () =>
          import('./features/venta/pages/comprobante/comprobante.component').then(
            m => m.ComprobanteComponent,
          ),
      },

      // Servicios
      {
        path: 'servicios',
        loadComponent: () =>
          import('./features/servicio/pages/servicio/servicio.component').then(
            m => m.ServicioComponent,
          ),
      },
      { path: 'servicios/resumen', redirectTo: 'servicios', pathMatch: 'full' },
      {
        path: 'servicios/comprobante',
        loadComponent: () =>
          import('./features/servicio/pages/comprobante/comprobante.component').then(
            m => m.ComprobanteServicioComponent,
          ),
      },
      {
        path: 'servicios/historial',
        loadComponent: () =>
          import('./features/servicio/pages/historial/historial.component').then(
            m => m.ServicioHistorialComponent,
          ),
      },

      // Finanzas
      {
        path: 'finanzas',
        loadComponent: () =>
          import('./features/finanzas/pages/finanzas-hub/finanzas-hub.component').then(
            m => m.FinanzasHubComponent,
          ),
      },
      {
        path: 'finanzas/caja/resumen',
        loadComponent: () =>
          import('./features/finanzas/pages/caja-resumen/caja-resumen.component').then(
            m => m.CajaResumenComponent,
          ),
      },
      {
        path: 'finanzas/caja/cierre',
        loadComponent: () =>
          import('./features/finanzas/pages/caja-cierre/caja-cierre.component').then(
            m => m.CajaCierreComponent,
          ),
      },
      {
        path: 'finanzas/deudas',
        loadComponent: () =>
          import('./features/finanzas/pages/deudas/deudas.component').then(
            m => m.DeudasComponent,
          ),
      },
      {
        path: 'finanzas/pago-resumen',
        loadComponent: () =>
          import('./features/finanzas/pages/pago-resumen/pago-resumen.component').then(
            m => m.PagoResumenComponent,
          ),
      },
      {
        path: 'finanzas/gastos',
        loadComponent: () =>
          import('./features/finanzas/pages/gastos/gastos.component').then(
            m => m.GastosComponent,
          ),
        canActivate: [duenioGuard],
      },

      // Usuarios y asistencia
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'asistencia',
        loadComponent: () =>
          import('./features/asistencia/asistencia.component').then(m => m.AsistenciaComponent),
        canActivate: [adminGuard],
      },

      // Tiendas
      {
        path: 'tiendas',
        loadComponent: () =>
          import('./features/tienda/pages/tiendas/tiendas.component').then(
            m => m.TiendasComponent,
          ),
      },
      {
        path: 'tiendas/form',
        loadComponent: () =>
          import('./features/tienda/pages/tienda-form/tienda-form.component').then(
            m => m.TiendaFormComponent,
          ),
      },

      // Config impresora
      {
        path: 'config/impresora',
        loadComponent: () =>
          import('./features/impresora/impresora-config/impresora-config.component').then(
            m => m.ImpresoraConfigComponent,
          ),
      },

      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  {
    path: 'invitation/new',
    loadComponent: () =>
      import('./features/invitation/pages/invitation-form/invitation-form.component').then(
        m => m.InvitationFormComponent,
      ),
    canActivate: [authGuard],
  },

  { path: '**', redirectTo: '/login' },
];
