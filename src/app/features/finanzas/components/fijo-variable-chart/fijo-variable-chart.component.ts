import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

@Component({
  selector: 'app-fijo-variable-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class FijoVariableChartComponent implements OnDestroy {
  readonly fijo     = input.required<number>();
  readonly variable = input.required<number>();

  private readonly chartEl = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.fijo(), this.variable()));
      await this.chart.render();
    });

    effect(() => {
      const f = this.fijo();
      const v = this.variable();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateSeries([f, v], false);
        }
      });
    });
  }

  private buildOptions(fijo: number, variable: number): ApexCharts.ApexOptions {
    return {
      chart: {
        type: 'donut',
        height: 240,
        animations: { enabled: true, speed: 600 },
        toolbar: { show: false },
        background: 'transparent',
      },
      series: [fijo, variable],
      labels: ['Fijo', 'Variable'],
      colors: ['#6366F1', '#8B5CF6'],
      legend: {
        position: 'bottom',
        fontSize: '11px',
        fontFamily: 'Geist Variable, sans-serif',
        fontWeight: 500,
        labels: { colors: '#64748B' },
        markers: { size: 6, shape: 'circle' },
        itemMargin: { horizontal: 12, vertical: 4 },
      },
      dataLabels: {
        enabled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (val: any) => `${Number(val).toFixed(0)}%`,
        style: { fontSize: '11px', fontFamily: 'Geist Mono Variable, monospace', fontWeight: '500', colors: ['#FFFFFF'] },
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
                label: 'TOTAL',
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
