import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

export interface MetodoPagoSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-metodos-pago-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class MetodosPagoChartComponent implements OnDestroy {
  readonly slices = input.required<MetodoPagoSlice[]>();

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
          void this.chart.updateOptions(this.buildOptions(slices), false, false);
        }
      });
    });
  }

  private buildOptions(slices: MetodoPagoSlice[]): ApexCharts.ApexOptions {
    return {
      chart: {
        type: 'donut',
        height: 260,
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
        fontFamily: 'Geist Variable, sans-serif',
        fontWeight: 500,
        labels: { colors: '#64748B' },
        markers: { size: 6, shape: 'circle' },
        itemMargin: { horizontal: 10, vertical: 4 },
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
            size: '72%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'TOTAL HOY',
                fontSize: '10px',
                fontFamily: 'Geist Variable, sans-serif',
                fontWeight: '700',
                color: '#94A3B8',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (w: any) => {
                  const total = (w.globals.seriesTotals as number[]).reduce((a, b) => a + b, 0);
                  return `S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                },
              },
              value: {
                fontFamily: 'Geist Variable, sans-serif',
                fontSize: '22px',
                fontWeight: '700',
                color: '#1E293B',
              },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        style: { fontFamily: 'Geist Variable, sans-serif' },
      },
      stroke: { width: 2, colors: ['#FFFFFF'] },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
