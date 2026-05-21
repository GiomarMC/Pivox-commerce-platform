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
        canActivate: [duenioGuard],
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

      // Finanzas (rediseñado: hub absorbe caja-resumen + caja-cierre como modal)
      {
        path: 'finanzas',
        loadComponent: () =>
          import('./features/finanzas/pages/finanzas-hub/finanzas-hub.component').then(
            m => m.FinanzasHubComponent,
          ),
      },
      {
        path: 'finanzas/creditos',
        loadComponent: () =>
          import('./features/finanzas/pages/creditos/creditos.component').then(
            m => m.CreditosComponent,
          ),
        canActivate: [adminGuard],
      },
      {
        path: 'finanzas/gastos',
        loadComponent: () =>
          import('./features/finanzas/pages/gastos/gastos.component').then(
            m => m.GastosComponent,
          ),
        canActivate: [duenioGuard],
      },

      // Redirects de rutas viejas (deprecated) hacia las nuevas
      { path: 'finanzas/caja/resumen', redirectTo: 'finanzas',           pathMatch: 'full' },
      { path: 'finanzas/caja/cierre',  redirectTo: 'finanzas',           pathMatch: 'full' },
      { path: 'finanzas/deudas',       redirectTo: 'finanzas/creditos',  pathMatch: 'full' },
      { path: 'finanzas/pago-resumen', redirectTo: 'finanzas/creditos',  pathMatch: 'full' },

      // Equipo (absorbe usuarios + asistencia)
      {
        path: 'equipo',
        loadComponent: () =>
          import('./features/equipo/equipo.component').then(m => m.EquipoComponent),
        canActivate: [adminGuard],
      },
      { path: 'usuarios',   redirectTo: 'equipo', pathMatch: 'full' },
      { path: 'asistencia', redirectTo: 'equipo', pathMatch: 'full' },

      // Tiendas
      {
        path: 'tiendas',
        loadComponent: () =>
          import('./features/tienda/pages/tiendas/tiendas.component').then(
            m => m.TiendasComponent,
          ),
        canActivate: [duenioGuard],
      },
      {
        path: 'tiendas/form',
        loadComponent: () =>
          import('./features/tienda/pages/tienda-form/tienda-form.component').then(
            m => m.TiendaFormComponent,
          ),
        canActivate: [duenioGuard],
      },

      // Config impresora
      {
        path: 'config/impresora',
        loadComponent: () =>
          import('./features/impresora/impresora-config/impresora-config.component').then(
            m => m.ImpresoraConfigComponent,
          ),
        canActivate: [duenioGuard],
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
    canActivate: [duenioGuard],
  },

  { path: '**', redirectTo: '/login' },
];
