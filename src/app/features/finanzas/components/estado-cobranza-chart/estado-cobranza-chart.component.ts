import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

export interface EstadoCobranzaItem {
  /** Label corto, ej. "Boleta B-0124" */
  label: string;
  /** Porcentaje pagado 0..100 */
  pct: number;
  /** Monto total (para tooltip) */
  total: number;
  /** Saldo pendiente (para tooltip) */
  saldo: number;
}

function truncate(s: string, max = 24): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

@Component({
  selector: 'app-estado-cobranza-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class EstadoCobranzaChartComponent implements OnDestroy {
  readonly items = input.required<EstadoCobranzaItem[]>();

  private readonly chartEl = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.items()));
      await this.chart.render();
    });

    effect(() => {
      const items = this.items();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateOptions(this.buildOptions(items), false, false);
        }
      });
    });
  }

  private colorForPct(pct: number): string {
    // gradient indigo (alto) -> amber (bajo)
    if (pct >= 75) return '#10B981';   // success green
    if (pct >= 50) return '#6366F1';   // indigo
    if (pct >= 25) return '#8B5CF6';   // violet
    return '#F59E0B';                  // amber (poco pagado)
  }

  private buildOptions(items: EstadoCobranzaItem[]): ApexCharts.ApexOptions {
    const labels  = items.map(i => truncate(i.label));
    const values  = items.map(i => i.pct);
    const colors  = items.map(i => this.colorForPct(i.pct));
    const totales = items.map(i => i.total);
    const saldos  = items.map(i => i.saldo);

    const height = Math.max(220, items.length * 36 + 40);

    return {
      chart: {
        type: 'bar',
        height,
        toolbar: { show: false },
        background: 'transparent',
        animations: { enabled: true, speed: 500 },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          borderRadiusApplication: 'end',
          distributed: true,
          dataLabels: { position: 'end' },
          barHeight: '55%',
        },
      },
      series: [{ data: values }],
      xaxis: {
        categories: labels,
        max: 100,
        labels: {
          style: { fontFamily: 'Geist Mono Variable, monospace', fontSize: '10px', colors: ['#94A3B8'] },
          formatter: (val: string) => `${Number(val).toFixed(0)}%`,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontFamily: 'Geist Variable, sans-serif', fontSize: '12px', colors: ['#334155'] },
          maxWidth: 200,
        },
      },
      colors,
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(0)}%`,
        style: {
          fontFamily: 'Geist Mono Variable, monospace',
          fontSize: '11px',
          fontWeight: '600',
          colors: ['#334155'],
        },
        offsetX: -6,
      },
      legend: { show: false },
      grid: {
        borderColor: '#EEF1F6',
        strokeDashArray: 2,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { left: 0, right: 24 },
      },
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        custom: ({ dataPointIndex }: any) => {
          const idx = dataPointIndex as number;
          const label = items[idx].label;
          const total = totales[idx];
          const saldo = saldos[idx];
          const pagado = total - saldo;
          const pct = values[idx];
          return `<div style="padding:8px 12px;font-family:'Geist Variable',sans-serif;font-size:12px;border:1px solid #334155;background:#FFFFFF">
            <p style="margin:0 0 4px;font-weight:600;color:#1E293B">${label}</p>
            <p style="margin:0;font-family:'Geist Mono Variable',monospace;font-size:11px;color:#64748B">
              Pagado: S/ ${pagado.toFixed(2)} (${pct.toFixed(0)}%)<br>
              Saldo:  S/ ${saldo.toFixed(2)}<br>
              Total:  S/ ${total.toFixed(2)}
            </p>
          </div>`;
        },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
