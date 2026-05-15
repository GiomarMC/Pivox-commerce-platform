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
      colors: ['#16A34A', '#D97706', '#DC2626', '#9CA3AF'],
      legend: {
        position: 'bottom',
        fontSize: '11px',
        fontFamily: 'inherit',
        markers: { size: 6 },
        itemMargin: { horizontal: 6 },
      },
      dataLabels: {
        enabled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (val: any) => `${Number(val).toFixed(0)}%`,
        style: { fontSize: '10px', fontFamily: 'inherit', fontWeight: '600' },
        dropShadow: { enabled: false },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total SKUs',
                fontSize: '10px',
                fontFamily: 'inherit',
                fontWeight: '600',
                color: '#9CA3AF',
                formatter: () => String(total),
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} productos`,
        },
      },
      stroke: { width: 2, colors: ['#FFFFFF'] },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
