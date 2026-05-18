import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

@Component({
  selector: 'app-ventas-servicios-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class VentasServiciosChartComponent implements OnDestroy {
  readonly ventas    = input.required<number>();
  readonly servicios = input.required<number>();

  private readonly chartEl  = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.ventas(), this.servicios()));
      await this.chart.render();
    });

    effect(() => {
      const v = this.ventas();
      const s = this.servicios();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateOptions(this.buildOptions(v, s), false, false);
        }
      });
    });
  }

  private buildOptions(ventas: number, servicios: number): ApexCharts.ApexOptions {
    return {
      chart: {
        type: 'bar',
        height: 170,
        toolbar: { show: false },
        background: 'transparent',
        animations: { enabled: true, speed: 500 },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 0,
          distributed: true,
          dataLabels: { position: 'end' },
          barHeight: '60%',
        },
      },
      series: [{ data: [ventas, servicios] }],
      xaxis: {
        categories: ['Ventas', 'Servicios'],
        labels: {
          style: { fontFamily: 'Geist Mono Variable, monospace', fontSize: '10px', colors: ['#94A3B8'] },
          formatter: (val: string) => `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            fontFamily: 'Geist Variable, sans-serif',
            fontSize: '11px',
            colors: ['#334155'],
            fontWeight: '600',
          },
        },
      },
      colors: ['#6366F1', '#8B5CF6'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
        y: { formatter: (val: number) => `S/ ${val.toFixed(2)}` },
        style: { fontFamily: 'Geist Variable, sans-serif' },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
