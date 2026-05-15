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
          borderRadius: 6,
          distributed: true,
          dataLabels: { position: 'end' },
        },
      },
      series: [{ data: [ventas, servicios] }],
      xaxis: {
        categories: ['Ventas', 'Servicios'],
        labels: {
          style: { fontFamily: 'inherit', fontSize: '11px', colors: ['#6B7280'] },
          formatter: (val: string) => `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { fontFamily: 'inherit', fontSize: '12px', colors: ['#374151'], fontWeight: '600' } },
      },
      colors: ['#4F46E5', '#0284C7'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        style: { fontFamily: 'inherit', fontSize: '11px', fontWeight: '700', colors: ['#374151'] },
        offsetX: -6,
      },
      legend: { show: false },
      grid: {
        borderColor: '#F0F2F5',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { left: 0, right: 24 },
      },
      tooltip: {
        y: { formatter: (val: number) => `S/ ${val.toFixed(2)}` },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
