import { Component, inject, OnInit, computed, signal, effect, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { FinanzasService } from '../finanzas/finanzas.service';
import { CatalogoService } from '../inventario/catalogo.service';
import { HomeStatsService } from './home-stats.service';
import { CobrosChartComponent } from './components/cobros-chart/cobros-chart.component';
import { InventarioAlertasComponent } from './components/inventario-alertas/inventario-alertas.component';
import { RankingsChartComponent } from './components/rankings-chart/rankings-chart.component';
import { VentasServiciosChartComponent } from './components/ventas-servicios-chart/ventas-servicios-chart.component';
import { ContadoCreditoChartComponent } from './components/contado-credito-chart/contado-credito-chart.component';
import { DeudasWidgetComponent } from './components/deudas-widget/deudas-widget.component';
import { TendenciaChartComponent } from './components/tendencia-chart/tendencia-chart.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink, CurrencyPipe,
    CobrosChartComponent, InventarioAlertasComponent, RankingsChartComponent,
    VentasServiciosChartComponent, ContadoCreditoChartComponent,
    DeudasWidgetComponent, TendenciaChartComponent,
  ],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="dash-header">
        <div>
          <h1 class="dash-greeting">
            {{ greetLabel }}, <span>{{ userMe()?.firstName ?? 'usuario' }}</span>
          </h1>
          <p class="dash-date">{{ todayLabel }}</p>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="dash-actions-grid">

        <a routerLink="/ventas" class="dash-action dash-action-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
          </svg>
          Nueva venta
        </a>

        <a routerLink="/servicios" class="dash-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Nuevo servicio
        </a>

        <a routerLink="/inventario/productos" class="dash-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
          </svg>
          Productos
        </a>

        <a routerLink="/inventario/lotes" class="dash-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 12 20 22 4 22 4 12"/>
            <rect x="2" y="7" width="20" height="5"/>
            <line x1="12" y1="22" x2="12" y2="7"/>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
          Lotes
        </a>

        <a routerLink="/finanzas/caja/resumen" class="dash-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Ver caja
        </a>

        <a routerLink="/operaciones/historial" class="dash-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Historial
        </a>

      </div>

      <!-- Error state -->
      @if (fin.state().errorMessage) {
        <div class="error-banner" style="margin-bottom:1rem">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ fin.state().errorMessage }}
        </div>
      }

      <!-- KPI row -->
      @if (fin.state().isLoading) {
        <div class="dash-kpi-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="kpi-skeleton"></div>
          }
        </div>
      } @else if (fin.state().cajaResumen) {
        <div class="dash-kpi-grid">
          <div class="kpi-card kpi-featured">
            <span class="kpi-val">{{ fin.state().cajaResumen!.totalGeneral | currency:'PEN':'S/ ' }}</span>
            <span class="kpi-label">Total del día</span>
            <span class="kpi-status">
              <svg width="7" height="7" viewBox="0 0 8 8" style="margin-right:4px">
                <circle cx="4" cy="4" r="4" fill="rgba(255,255,255,0.7)"/>
              </svg>
              En curso
            </span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{{ fin.state().cajaResumen!.resumenVentas?.totalGeneral ?? 0 | currency:'PEN':'S/ ' }}</span>
            <span class="kpi-label">Ventas</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{{ fin.state().cajaResumen!.resumenServicios?.totalGeneral ?? 0 | currency:'PEN':'S/ ' }}</span>
            <span class="kpi-label">Servicios</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{{ fin.state().cajaResumen!.totalEfectivo | currency:'PEN':'S/ ' }}</span>
            <span class="kpi-label">Efectivo</span>
          </div>
        </div>
      } @else {
        <div class="kpi-no-data">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" style="margin-bottom:0.5rem;opacity:0.4">
            <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
            <path d="M6 12h.01M18 12h.01"/>
          </svg>
          <p style="margin:0;font-size:0.85rem;color:#9CA3AF">Caja no iniciada hoy</p>
          <a routerLink="/finanzas/caja/resumen" style="font-size:0.78rem;color:#4F46E5;font-weight:600;margin-top:0.3rem;display:inline-block">Ir a Finanzas →</a>
        </div>
      }

      <!-- ── Gráficos ──────────────────────────────── -->
      <h2 class="dash-section-label">Estadísticas del día</h2>
      <div class="charts-grid">

        <!-- Fila 1: Cobros + Inventario -->
        <div class="chart-card">
          <p class="chart-title">Métodos de pago</p>
          @if (fin.state().isLoading) {
            <div class="chart-skeleton"></div>
          } @else if (paymentSlices().length > 0) {
            <app-cobros-chart [slices]="paymentSlices()" />
          } @else {
            <div class="chart-empty">Caja no iniciada hoy</div>
          }
        </div>

        <div class="chart-card">
          <p class="chart-title">Alertas de inventario</p>
          @if (cat.state().isLoading) {
            <div class="chart-skeleton"></div>
          } @else {
            <app-inventario-alertas
              [sinStock]="prodSinStock()"
              [criticos]="prodCriticos()"
              [bajoStock]="prodBajoStock()" />
          }
        </div>

        <!-- Fila 2: Ventas vs Servicios + Contado vs Crédito -->
        <div class="chart-card">
          <p class="chart-title">Ventas vs Servicios</p>
          @if (fin.state().isLoading) {
            <div class="chart-skeleton"></div>
          } @else if (ventasVsServicios()) {
            <app-ventas-servicios-chart
              [ventas]="ventasVsServicios()!.ventas"
              [servicios]="ventasVsServicios()!.servicios" />
          } @else {
            <div class="chart-empty">Caja no iniciada hoy</div>
          }
        </div>

        <div class="chart-card">
          <p class="chart-title">Contado vs Crédito</p>
          @if (fin.state().isLoading) {
            <div class="chart-skeleton"></div>
          } @else if (contadoCredito()) {
            <app-contado-credito-chart
              [contado]="contadoCredito()!.contado"
              [credito]="contadoCredito()!.credito" />
          } @else {
            <div class="chart-empty">Caja no iniciada hoy</div>
          }
        </div>

        <!-- Fila 3: Rankings full-width con toggle de período -->
        <div class="chart-card chart-full">
          <div class="chart-card-header">
            <p class="chart-title" style="margin:0">Ranking de productos</p>
            <div class="period-toggle">
              <button class="period-btn" [class.period-btn-active]="periodo() === 'dia'"
                      (click)="periodo.set('dia')">Hoy</button>
              <button class="period-btn" [class.period-btn-active]="periodo() === 'semana'"
                      (click)="periodo.set('semana')">Semana</button>
              <button class="period-btn" [class.period-btn-active]="periodo() === 'mes'"
                      (click)="periodo.set('mes')">Mes</button>
            </div>
          </div>
          @if (stats.state().isLoading) {
            <div class="chart-skeleton" style="margin-top:0.875rem;height:160px"></div>
          } @else if (rankingsData()) {
            <app-rankings-chart [data]="rankingsData()" />
          } @else {
            <div class="chart-empty">Sin datos de ventas</div>
          }
        </div>

        <!-- Fila 4: Tendencia 7 días full-width -->
        <div class="chart-card chart-full">
          <p class="chart-title">Tendencia — últimos 7 días</p>
          @if (stats.state().isLoading) {
            <div class="chart-skeleton" style="height:280px"></div>
          } @else if (tendenciaData().length > 0) {
            <app-tendencia-chart [tendencia]="tendenciaData()" />
          } @else {
            <div class="chart-empty">Sin datos de tendencia</div>
          }
        </div>

        <!-- Fila 5: Deudas activas full-width -->
        <div class="chart-card chart-full">
          <p class="chart-title">Deudas activas</p>
          <app-deudas-widget
            [total]="totalDeudas().total"
            [count]="totalDeudas().count"
            [isLoading]="fin.state().deudasDashboardLoading" />
        </div>

      </div>

    </div>
  `,
  styles: [`
    .dash-header { margin-bottom: 1.25rem; }
    .dash-greeting { font-size: 1.3rem; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin: 0; }
    .dash-greeting span { color: #4F46E5; }
    .dash-date { font-size: 0.78rem; color: #9CA3AF; margin: 0.2rem 0 0; text-transform: capitalize; }

    .dash-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.875rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 640px) {
      .dash-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .kpi-card {
      background: #fff;
      border: 1px solid #E2E6F0;
      border-radius: 14px;
      padding: 1.1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .kpi-card:hover { box-shadow: 0 4px 14px rgba(79,70,229,0.12); transform: translateY(-1px); }

    .kpi-featured {
      background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
      border-color: #4338CA;
      box-shadow: 0 4px 16px rgba(79,70,229,0.25);
    }
    .kpi-featured:hover { box-shadow: 0 6px 22px rgba(0,128,96,0.35); }

    .kpi-val { font-size: 1.5rem; font-weight: 900; color: #111827; letter-spacing: -0.03em; line-height: 1; }
    .kpi-featured .kpi-val { color: #fff; }

    .kpi-label { font-size: 0.68rem; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi-featured .kpi-label { color: rgba(255,255,255,0.55); }

    .kpi-status {
      display: flex; align-items: center;
      font-size: 0.68rem; font-weight: 600; color: rgba(255,255,255,0.7);
      margin-top: auto; padding-top: 0.4rem;
    }

    .kpi-skeleton {
      background: #fff; border: 1px solid #E2E6F0; border-radius: 14px;
      height: 90px; animation: kpi-pulse 1.5s ease-in-out infinite;
    }
    @keyframes kpi-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

    .kpi-no-data {
      background: #fff; border: 1px solid #E2E6F0; border-radius: 14px;
      padding: 1.5rem; display: flex; flex-direction: column;
      align-items: center; margin-bottom: 1.5rem;
    }

    .dash-section-label {
      font-size: 0.68rem; font-weight: 700; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 0.75rem;
    }

    .dash-actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.625rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 480px) {
      .dash-actions-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .dash-action {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.75rem 0.75rem;
      background: #fff; border: 1px solid #E2E6F0; border-radius: 12px;
      text-decoration: none; color: #374151;
      font-size: 0.83rem; font-weight: 600;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s;
    }
    .dash-action:hover {
      border-color: #4F46E5; color: #4F46E5;
      box-shadow: 0 2px 8px rgba(79,70,229,0.1); transform: translateY(-1px);
    }
    .dash-action:active { transform: scale(0.98); }

    .dash-action-primary {
      background: #4F46E5; border-color: #4F46E5; color: #fff;
      box-shadow: 0 2px 8px rgba(79,70,229,0.2);
    }
    .dash-action-primary:hover {
      background: #4338CA; border-color: #4338CA; color: #fff;
      box-shadow: 0 4px 14px rgba(79,70,229,0.3);
    }

    /* ── Charts grid ── */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.875rem;
    }
    @media (max-width: 700px) {
      .charts-grid { grid-template-columns: 1fr; }
    }

    .chart-full { grid-column: span 2; }
    @media (max-width: 700px) {
      .chart-full { grid-column: span 1; }
    }

    .chart-card {
      background: #fff;
      border: 1px solid #E2E6F0;
      border-radius: 14px;
      padding: 1.1rem 1.25rem 1.25rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }

    .chart-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.875rem;
    }

    .chart-title {
      font-size: 0.68rem;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin: 0 0 0.875rem;
    }

    .chart-skeleton {
      height: 80px;
      background: linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      border-radius: 8px;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .chart-empty {
      display: flex; align-items: center; justify-content: center;
      height: 80px;
      font-size: 0.78rem; color: #9CA3AF; font-style: italic;
    }

    /* Period toggle */
    .period-toggle {
      display: flex;
      gap: 2px;
      background: #F3F4F6;
      border-radius: 8px;
      padding: 3px;
    }
    .period-btn {
      font-size: 0.72rem; font-weight: 600;
      padding: 0.25rem 0.65rem;
      border: none; border-radius: 6px;
      background: transparent; color: #6B7280;
      cursor: pointer; transition: background 0.15s, color 0.15s;
    }
    .period-btn:hover { color: #374151; }
    .period-btn-active {
      background: #fff; color: #4F46E5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  `],
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly fin  = inject(FinanzasService);
  readonly cat  = inject(CatalogoService);
  readonly stats = inject(HomeStatsService);
  readonly userMe = this.auth.userMe;

  readonly periodo = signal<'dia' | 'semana' | 'mes'>('dia');

  // ── Inventario: productos específicos que necesitan atención ──
  readonly prodSinStock = computed(() =>
    this.cat.state().productos
      .filter(p => p.isActive && +p.cantidadDisponible === 0)
      .map(p => ({ nombre: p.nombre, cantidadDisponible: p.cantidadDisponible, unidadMedida: p.unidadMedida }))
  );
  readonly prodCriticos = computed(() =>
    this.cat.state().productos
      .filter(p => p.isActive && +p.cantidadDisponible >= 1 && +p.cantidadDisponible <= 5)
      .sort((a, b) => +a.cantidadDisponible - +b.cantidadDisponible)
      .map(p => ({ nombre: p.nombre, cantidadDisponible: p.cantidadDisponible, unidadMedida: p.unidadMedida }))
  );
  // Productos con stock más bajo entre los que aún están bien (> 5 und.) — siempre hay algo que mostrar
  readonly prodBajoStock = computed(() =>
    this.cat.state().productos
      .filter(p => p.isActive && +p.cantidadDisponible > 5)
      .sort((a, b) => +a.cantidadDisponible - +b.cantidadDisponible)
      .slice(0, 6)
      .map(p => ({ nombre: p.nombre, cantidadDisponible: p.cantidadDisponible, unidadMedida: p.unidadMedida }))
  );

  // ── Cobros por método de pago ──
  readonly paymentSlices = computed(() => {
    const r = this.fin.state().cajaResumen;
    if (!r) return [];
    const items = [
      { label: 'Efectivo',      value: +r.totalEfectivo,      color: '#16A34A' },
      { label: 'Yape',          value: +r.totalYape,          color: '#7C3AED' },
      { label: 'Tarjeta',       value: +r.totalTarjeta,       color: '#0284C7' },
      { label: 'Plin',          value: +r.totalPlin,          color: '#D97706' },
      { label: 'Crédito',       value: +r.totalCredito,       color: '#DC2626' },
      { label: 'Transferencia', value: +r.totalTransferencia, color: '#6B7280' },
    ].filter(i => i.value > 0);
    const total = items.reduce((s, i) => s + i.value, 0);
    return total > 0 ? items.map(i => ({ ...i, pct: (i.value / total) * 100 })) : [];
  });

  // ── Ventas vs Servicios ──
  readonly ventasVsServicios = computed(() => {
    const r = this.fin.state().cajaResumen;
    if (!r) return null;
    return {
      ventas:    +(r.resumenVentas?.totalGeneral    ?? 0),
      servicios: +(r.resumenServicios?.totalGeneral ?? 0),
    };
  });

  // ── Contado vs Crédito ──
  readonly contadoCredito = computed(() => {
    const r = this.fin.state().cajaResumen;
    if (!r) return null;
    return { contado: +r.totalContado, credito: +r.totalCredito };
  });

  // ── Rankings ──
  readonly rankingsData = computed(() => {
    const d = this.stats.state().data;
    if (!d) return null;
    return { top: d.topProductos, bottom: d.bottomProductos };
  });

  // ── Tendencia ──
  readonly tendenciaData = computed(() => this.stats.state().data?.tendencia ?? []);

  // ── Deudas dashboard ──
  readonly totalDeudas = computed(() => {
    const ds = this.fin.state().deudasDashboard;
    return {
      total: ds.reduce((s, d) => s + +d.saldo, 0),
      count: ds.length,
    };
  });

  constructor() {
    // Recarga el ranking cuando cambia el período
    effect(() => {
      const p = this.periodo();
      untracked(() => void this.stats.cargarStats(p));
    });
  }

  get greetLabel(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  ngOnInit(): void {
    void this.fin.cargarCajaResumen();
    void this.cat.cargarCatalogo();
    void this.fin.cargarDeudasDashboard();
    // stats.cargarStats se dispara desde el effect del constructor
  }
}
