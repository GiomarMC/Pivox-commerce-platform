import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { FinanzasService } from '../../finanzas.service';
import { DeudaCardComponent } from '../../components/deuda-card/deuda-card.component';
import { PrintPreviewComponent } from '../../../impresora/print-preview/print-preview.component';
import { EstadoCobranzaChartComponent, EstadoCobranzaItem } from '../../components/estado-cobranza-chart/estado-cobranza-chart.component';
import { DeudaModel } from '../../models/deuda.model';
import { getEstadoDeudaLabel } from '../../constants/estados-deuda';

type BusquedaTipo = 'documento' | 'comprobante';
type TabKey = 'activas' | 'historial';

@Component({
  selector: 'app-creditos',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    DeudaCardComponent,
    PrintPreviewComponent,
    EstadoCobranzaChartComponent,
  ],
  templateUrl: './creditos.component.html',
  styleUrl: './creditos.component.css',
})
export class CreditosComponent implements OnInit {
  readonly svc = inject(FinanzasService);
  private readonly route = inject(ActivatedRoute);

  readonly tab = signal<TabKey>('activas');
  readonly tipoBusqueda = signal<BusquedaTipo>('documento');
  queryBusqueda = '';
  readonly estadoFiltro = signal<string>('ACTIVA');

  readonly deudaSeleccionada = signal<DeudaModel | null>(null);
  montoPago: number | null = null;

  readonly getEstadoDeudaLabel = getEstadoDeudaLabel;

  readonly montoPagadoSelected = computed(() => {
    const d = this.deudaSeleccionada();
    if (!d) return 0;
    return Math.max(0, parseFloat(d.montoTotal) - parseFloat(d.saldo));
  });

  readonly porcentajePagadoSelected = computed(() => {
    const d = this.deudaSeleccionada();
    if (!d) return 0;
    const total = parseFloat(d.montoTotal);
    if (total <= 0) return 0;
    return Math.min(100, ((total - parseFloat(d.saldo)) / total) * 100);
  });

  readonly mostrarPreview = signal(false);
  readonly previewPdfBlob = signal<Blob | null>(null);

  readonly estadoChips = [
    { label: 'Activas', value: 'ACTIVA' },
    { label: 'Pagadas', value: 'PAGADA' },
    { label: 'Todas',   value: '' },
  ];

  // ── KPIs ──
  readonly totalPorCobrar = computed(() =>
    this.svc.state().deudasDashboard
      .filter(d => d.estado === 'ACTIVA')
      .reduce((acc, d) => acc + parseFloat(d.saldo || '0'), 0),
  );
  readonly countActivas = computed(() =>
    this.svc.state().deudasDashboard.filter(d => d.estado === 'ACTIVA').length,
  );
  readonly cobradoEsteMes = computed(() => {
    const hoy = new Date();
    const mes = hoy.getMonth();
    const anio = hoy.getFullYear();
    let total = 0;
    for (const d of this.svc.state().deudasDashboard) {
      for (const p of d.pagos) {
        const f = new Date(p.fecha);
        if (!isNaN(f.getTime()) && f.getMonth() === mes && f.getFullYear() === anio) {
          total += parseFloat(p.monto || '0');
        }
      }
    }
    return total;
  });
  readonly promedioPorDeuda = computed(() => {
    const n = this.countActivas();
    return n > 0 ? this.totalPorCobrar() / n : 0;
  });

  // ── Estado de cobranza chart data ──
  readonly estadoCobranzaItems = computed((): EstadoCobranzaItem[] => {
    const deudas = this.svc.state().deudasDashboard
      .filter(d => d.estado === 'ACTIVA' && parseFloat(d.montoTotal) > 0);
    // Sort by montoTotal desc, top 8
    deudas.sort((a, b) => parseFloat(b.montoTotal) - parseFloat(a.montoTotal));
    return deudas.slice(0, 8).map(d => {
      const total = parseFloat(d.montoTotal);
      const saldo = parseFloat(d.saldo);
      const pagado = total - saldo;
      const pct = total > 0 ? (pagado / total) * 100 : 0;
      return {
        label: d.numeroComprobante ?? `Deuda #${d.id}`,
        pct,
        total,
        saldo,
      };
    });
  });

  readonly hayCobranzaItems = computed(() => this.estadoCobranzaItems().length > 0);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('accion') === 'pago') {
      this.tab.set('activas');
      this.estadoFiltro.set('ACTIVA');
    }
    void this.svc.cargarDeudasDashboard();
    void this.svc.cargarDeudas({ estado: 'ACTIVA' });
    void this.svc.cargarPagos({});
  }

  setTab(t: TabKey): void {
    this.tab.set(t);
    this.svc.clearMessages();
    if (t === 'historial') {
      void this.svc.cargarPagos({});
    } else {
      const estado = this.estadoFiltro();
      void this.svc.cargarDeudas(estado ? { estado } : {});
    }
  }

  tipoBusquedaClass(tipo: BusquedaTipo): string {
    return this.tipoBusqueda() === tipo ? 'chip chip-active' : 'chip';
  }

  setEstadoFiltro(estado: string): void {
    this.estadoFiltro.set(estado);
    this.svc.clearMessages();
    if (this.queryBusqueda.trim()) {
      this.buscar();
    } else {
      void this.svc.cargarDeudas(estado ? { estado } : {});
    }
  }

  buscar(): void {
    const q = this.queryBusqueda.trim();
    if (!q) return;
    this.svc.clearMessages();
    if (this.tipoBusqueda() === 'documento') {
      void this.svc.buscarDeudasPorDocumento(q);
    } else {
      void this.svc.buscarDeudasPorComprobante(q);
    }
  }

  limpiarBusqueda(): void {
    this.queryBusqueda = '';
    const estado = this.estadoFiltro();
    void this.svc.cargarDeudas(estado ? { estado } : {});
  }

  abrirPago(deuda: DeudaModel): void {
    this.deudaSeleccionada.set(deuda);
    this.montoPago = parseFloat(deuda.saldo);
    this.svc.clearMessages();
  }

  cerrarPago(): void {
    this.deudaSeleccionada.set(null);
    this.montoPago = null;
  }

  pagarTodo(): void {
    const d = this.deudaSeleccionada();
    if (!d) return;
    this.montoPago = parseFloat(d.saldo);
  }

  async confirmarPago(): Promise<void> {
    const deuda = this.deudaSeleccionada();
    if (!deuda || !this.montoPago) return;
    this.svc.clearMessages();
    const blob = await this.svc.registrarPago(deuda.id, String(this.montoPago));
    if (blob) {
      this.cerrarPago();
      this.previewPdfBlob.set(blob);
      this.mostrarPreview.set(true);
      const estado = this.estadoFiltro();
      void this.svc.cargarDeudas(estado ? { estado } : {});
      void this.svc.cargarDeudasDashboard();
    }
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    try {
      return new Date(fecha).toLocaleString('es-PE', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return fecha;
    }
  }
}
