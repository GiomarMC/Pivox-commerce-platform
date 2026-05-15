import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

export interface PaymentSlice {
  label: string;
  value: number;
  color: string;
  pct: number;
}

@Component({
  selector: 'app-cobros-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class CobrosChartComponent implements OnDestroy {
  readonly slices = input.required<PaymentSlice[]>();

  private readonly chartEl = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.slices()));
      await this.chart.render();
    });

    effect(() => {
      const slices = this.slices();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateSeries(slices.map(s => s.value), false);
        }
      });
    });
  }

  private buildOptions(slices: PaymentSlice[]): ApexCharts.ApexOptions {
    return {
      chart: {
        type: 'donut',
        height: 240,
        animations: { enabled: true, speed: 600 },
        toolbar: { show: false },
        background: 'transparent',
      },
      series: slices.map(s => s.value),
      labels: slices.map(s => s.label),
      colors: slices.map(s => s.color),
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
                label: 'Total',
                fontSize: '11px',
                fontFamily: 'inherit',
                fontWeight: '600',
                color: '#9CA3AF',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (w: any) => {
                  const total = (w.globals.seriesTotals as number[]).reduce((a, b) => a + b, 0);
                  return `S/ ${total.toFixed(2)}`;
                },
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `S/ ${val.toFixed(2)}`,
        },
      },
      stroke: { width: 2, colors: ['#FFFFFF'] },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
