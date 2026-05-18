import { Component, inject, OnInit, computed, signal, effect, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
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
import { EditorialSectionComponent } from '../../shared/components/editorial-section/editorial-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink, DecimalPipe,
    CobrosChartComponent, InventarioAlertasComponent, RankingsChartComponent,
    VentasServiciosChartComponent, ContadoCreditoChartComponent,
    DeudasWidgetComponent, TendenciaChartComponent,
    EditorialSectionComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly fin  = inject(FinanzasService);
  readonly cat  = inject(CatalogoService);
  readonly stats = inject(HomeStatsService);
  readonly userMe = this.auth.userMe;

  readonly periodo = signal<'dia' | 'semana' | 'mes'>('dia');

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
  readonly prodBajoStock = computed(() =>
    this.cat.state().productos
      .filter(p => p.isActive && +p.cantidadDisponible > 5)
      .sort((a, b) => +a.cantidadDisponible - +b.cantidadDisponible)
      .slice(0, 6)
      .map(p => ({ nombre: p.nombre, cantidadDisponible: p.cantidadDisponible, unidadMedida: p.unidadMedida }))
  );

  readonly paymentSlices = computed(() => {
    const r = this.fin.state().cajaResumen;
    if (!r) return [];
    const items = [
      { label: 'Efectivo',      value: +r.totalEfectivo,      color: '#10B981' },
      { label: 'Yape',          value: +r.totalYape,          color: '#8B5CF6' },
      { label: 'Tarjeta',       value: +r.totalTarjeta,       color: '#06B6D4' },
      { label: 'Plin',          value: +r.totalPlin,          color: '#F59E0B' },
      { label: 'Crédito',       value: +r.totalCredito,       color: '#EF4444' },
      { label: 'Transferencia', value: +r.totalTransferencia, color: '#6366F1' },
    ].filter(i => i.value > 0);
    const total = items.reduce((s, i) => s + i.value, 0);
    return total > 0 ? items.map(i => ({ ...i, pct: (i.value / total) * 100 })) : [];
  });

  readonly ventasVsServicios = computed(() => {
    const r = this.fin.state().cajaResumen;
    if (!r) return null;
    return {
      ventas:    +(r.resumenVentas?.totalGeneral    ?? 0),
      servicios: +(r.resumenServicios?.totalGeneral ?? 0),
    };
  });

  readonly contadoCredito = computed(() => {
    const r = this.fin.state().cajaResumen;
    if (!r) return null;
    return { contado: +r.totalContado, credito: +r.totalCredito };
  });

  readonly rankingsData = computed(() => {
    const d = this.stats.state().data;
    if (!d) return null;
    return { top: d.topProductos, bottom: d.bottomProductos };
  });

  readonly tendenciaData = computed(() => this.stats.state().data?.tendencia ?? []);

  readonly totalDeudas = computed(() => {
    const ds = this.fin.state().deudasDashboard;
    return {
      total: ds.reduce((s, d) => s + +d.saldo, 0),
      count: ds.length,
    };
  });

  // Totales para KPIs
  readonly totalDia = computed(() => +(this.fin.state().cajaResumen?.totalGeneral ?? 0));
  readonly totalVentas = computed(() => +(this.fin.state().cajaResumen?.resumenVentas?.totalGeneral ?? 0));
  readonly totalServicios = computed(() => +(this.fin.state().cajaResumen?.resumenServicios?.totalGeneral ?? 0));
  readonly totalEfectivo = computed(() => +(this.fin.state().cajaResumen?.totalEfectivo ?? 0));

  constructor() {
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

  get fechaCorta(): string {
    return new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  ngOnInit(): void {
    void this.fin.cargarCajaResumen();
    void this.cat.cargarCatalogo();
    void this.fin.cargarDeudasDashboard();
  }
}
