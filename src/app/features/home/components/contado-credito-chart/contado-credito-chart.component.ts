import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

@Component({
  selector: 'app-contado-credito-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class ContadoCreditoChartComponent implements OnDestroy {
  readonly contado = input.required<number>();
  readonly credito = input.required<number>();

  private readonly chartEl    = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.contado(), this.credito()));
      await this.chart.render();
    });

    effect(() => {
      const c = this.contado();
      const cr = this.credito();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateSeries([c, cr], false);
        }
      });
    });
  }

  private buildOptions(contado: number, credito: number): ApexCharts.ApexOptions {
    return {
      chart: {
        type: 'donut',
        height: 220,
        animations: { enabled: true, speed: 600 },
        toolbar: { show: false },
        background: 'transparent',
      },
      series: [contado, credito],
      labels: ['Contado', 'Crédito'],
      colors: ['#10B981', '#6366F1'],
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
                label: 'COBRADO',
                fontSize: '10px',
                fontFamily: 'Geist Variable, sans-serif',
                fontWeight: '700',
                color: '#94A3B8',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (w: any) => {
                  const total = (w.globals.seriesTotals as number[]).reduce((a, b) => a + b, 0);
                  return `S/ ${total.toFixed(2)}`;
                },
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
        y: { formatter: (val: number) => `S/ ${val.toFixed(2)}` },
        style: { fontFamily: 'Geist Variable, sans-serif' },
      },
      stroke: { width: 1, colors: ['#F8FAFC'] },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
