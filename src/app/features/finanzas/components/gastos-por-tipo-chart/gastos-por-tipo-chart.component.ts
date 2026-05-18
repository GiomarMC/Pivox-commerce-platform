import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

export interface GastoTipoItem {
  /** Etiqueta legible del tipo, ej. "Alquiler", "Sueldos" */
  label: string;
  /** Monto en soles */
  value: number;
}

function truncate(s: string, max = 24): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

const PALETA = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#A855F7', '#0EA5E9'];

@Component({
  selector: 'app-gastos-por-tipo-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class GastosPorTipoChartComponent implements OnDestroy {
  readonly items = input.required<GastoTipoItem[]>();

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

  private buildOptions(items: GastoTipoItem[]): ApexCharts.ApexOptions {
    const labels = items.map(i => truncate(i.label));
    const values = items.map(i => i.value);
    const colors = items.map((_, i) => PALETA[i % PALETA.length]);
    const height = Math.max(200, items.length * 38 + 40);

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
          barHeight: '60%',
        },
      },
      series: [{ data: values }],
      xaxis: {
        categories: labels,
        labels: {
          style: { fontFamily: 'Geist Mono Variable, monospace', fontSize: '10px', colors: ['#94A3B8'] },
          formatter: (val: string) => `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontFamily: 'Geist Variable, sans-serif', fontSize: '12px', colors: ['#334155'] },
          maxWidth: 180,
        },
      },
      colors,
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        style: {
          fontFamily: 'Geist Mono Variable, monospace',
          fontSize: '11px',
          fontWeight: '500',
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
        y: { formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        style: { fontFamily: 'Geist Variable, sans-serif' },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
