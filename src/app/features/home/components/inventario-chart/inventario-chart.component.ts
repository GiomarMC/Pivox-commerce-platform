import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

@Component({
  selector: 'app-inventario-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class InventarioChartComponent implements OnDestroy {
  readonly normal    = input.required<number>(); // isActive AND cantidad > 5
  readonly critico   = input.required<number>(); // isActive AND cantidad 1–5
  readonly sinStock  = input.required<number>(); // isActive AND cantidad = 0
  readonly inactivos = input.required<number>(); // isActive = false

  private readonly chartEl    = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(
        this.chartEl().nativeElement,
        this.buildOptions(this.normal(), this.critico(), this.sinStock(), this.inactivos()),
      );
      await this.chart.render();
    });

    effect(() => {
      const n = this.normal();
      const c = this.critico();
      const s = this.sinStock();
      const i = this.inactivos();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateSeries([n, c, s, i], false);
        }
      });
    });
  }

  private buildOptions(normal: number, critico: number, sinStock: number, inactivos: number): ApexCharts.ApexOptions {
    const total = normal + critico + sinStock + inactivos;
    return {
      chart: {
        type: 'donut',
        height: 240,
        animations: { enabled: true, speed: 600 },
        toolbar: { show: false },
        background: 'transparent',
      },
      series: [normal, critico, sinStock, inactivos],
      labels: ['Stock normal', 'Stock crítico', 'Sin stock', 'Inactivos'],
      colors: ['#10B981', '#F59E0B', '#EF4444', '#94A3B8'],
      legend: {
        position: 'bottom',
        fontSize: '10px',
        fontFamily: 'Geist Variable, sans-serif',
        fontWeight: 500,
        labels: { colors: '#64748B' },
        markers: { size: 5, shape: 'square' },
        itemMargin: { horizontal: 8, vertical: 4 },
      },
      dataLabels: {
        enabled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (val: any) => `${Number(val).toFixed(0)}%`,
        style: { fontSize: '10px', fontFamily: 'Geist Mono Variable, monospace', fontWeight: '500', colors: ['#FFFFFF'] },
        dropShadow: { enabled: false },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'TOTAL SKUs',
                fontSize: '10px',
                fontFamily: 'Geist Variable, sans-serif',
                fontWeight: '700',
                color: '#94A3B8',
                formatter: () => String(total),
              },
              value: {
                fontFamily: 'Geist Variable, serif',
                fontSize: '24px',
                fontWeight: '600',
                color: '#334155',
              },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (val: number) => `${val} productos` },
        style: { fontFamily: 'Geist Variable, sans-serif' },
      },
      stroke: { width: 1, colors: ['#F8FAFC'] },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
