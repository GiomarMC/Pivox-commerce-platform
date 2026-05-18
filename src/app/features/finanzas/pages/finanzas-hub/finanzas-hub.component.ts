import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinanzasService } from '../../finanzas.service';
import { MetodosPagoChartComponent, MetodoPagoSlice } from '../../components/metodos-pago-chart/metodos-pago-chart.component';
import { TendenciaGastosChartComponent } from '../../components/tendencia-gastos-chart/tendencia-gastos-chart.component';
import { CerrarCajaModalComponent } from '../../components/cerrar-caja-modal/cerrar-caja-modal.component';

@Component({
  selector: 'app-finanzas-hub',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    MetodosPagoChartComponent,
    TendenciaGastosChartComponent,
    CerrarCajaModalComponent,
  ],
  templateUrl: './finanzas-hub.component.html',
  styleUrl: './finanzas-hub.component.css',
})
export class FinanzasHubComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly svc = inject(FinanzasService);
  readonly isDueno = this.auth.isDueno;

  readonly modalCierre = signal(false);

  // KPIs del día
  readonly totalDia = computed(() => parseFloat(this.svc.state().cajaResumen?.totalGeneral ?? '0'));
  readonly totalContado = computed(() => parseFloat(this.svc.state().cajaResumen?.totalContado ?? '0'));
  readonly totalCredito = computed(() => parseFloat(this.svc.state().cajaResumen?.totalCredito ?? '0'));

  readonly deudasActivas = computed(() =>
    this.svc.state().deudasDashboard.filter(d => d.estado === 'ACTIVA'),
  );
  readonly totalDeudas = computed(() =>
    this.deudasActivas().reduce((acc, d) => acc + parseFloat(d.saldo || '0'), 0),
  );
  readonly countDeudas = computed(() => this.deudasActivas().length);

  // Ventas vs servicios (barras inline)
  readonly totalVentas = computed(() => parseFloat(this.svc.state().cajaResumen?.resumenVentas?.totalGeneral ?? '0'));
  readonly totalServicios = computed(() => parseFloat(this.svc.state().cajaResumen?.resumenServicios?.totalGeneral ?? '0'));
  readonly ventasPct = computed(() => {
    const total = this.totalVentas() + this.totalServicios();
    return total > 0 ? (this.totalVentas() / total) * 100 : 0;
  });
  readonly serviciosPct = computed(() => {
    const total = this.totalVentas() + this.totalServicios();
    return total > 0 ? (this.totalServicios() / total) * 100 : 0;
  });

  // Slices para el donut de métodos de pago
  readonly metodosPagoSlices = computed((): MetodoPagoSlice[] => {
    const c = this.svc.state().cajaResumen;
    if (!c) return [];
    const slices: MetodoPagoSlice[] = [
      { label: 'Efectivo',      value: parseFloat(c.totalEfectivo),      color: '#10B981' },
      { label: 'Yape',          value: parseFloat(c.totalYape),          color: '#8B5CF6' },
      { label: 'Tarjeta',       value: parseFloat(c.totalTarjeta),       color: '#06B6D4' },
      { label: 'Plin',          value: parseFloat(c.totalPlin),          color: '#F59E0B' },
      { label: 'Transferencia', value: parseFloat(c.totalTransferencia), color: '#6366F1' },
    ];
    return slices.filter(s => s.value > 0);
  });

  readonly hayMetodosPago = computed(() => this.metodosPagoSlices().length > 0);

  // Tendencia gastos
  readonly tendenciaPuntos = computed(() => this.svc.state().tendenciaGastos);
  readonly hayTendencia = computed(() =>
    this.tendenciaPuntos().some(p => p.total > 0),
  );

  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  ngOnInit(): void {
    void this.svc.cargarCajaResumen();
    void this.svc.cargarDeudasDashboard();
    if (this.isDueno()) {
      void this.svc.cargarTendenciaGastos(6);
    }
  }

  abrirCierre(): void {
    this.modalCierre.set(true);
  }

  cerrarModalCierre(): void {
    this.modalCierre.set(false);
  }
}
