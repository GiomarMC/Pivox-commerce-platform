import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';

export interface RankedProduct {
  nombre: string;
  cantidadVendida: number;
}

export interface RankingsData {
  top: RankedProduct[];
  bottom: RankedProduct[];
}

function truncate(name: string, max = 25): string {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

@Component({
  selector: 'app-rankings-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class RankingsChartComponent implements OnDestroy {
  readonly data = input.required<RankingsData | null>();

  private readonly chartEl    = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.data()));
      await this.chart.render();
    });

    effect(() => {
      const d = this.data();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateOptions(this.buildOptions(d), false, false);
        }
      });
    });
  }

  private buildOptions(data: RankingsData | null): ApexCharts.ApexOptions {
    const top    = data?.top    ?? [];
    const bottom = data?.bottom ?? [];

    const categories: string[] = [
      ...top.map(p => truncate(p.nombre)),
      ...bottom.map(p => truncate(p.nombre)),
    ];
    const values: number[] = [
      ...top.map(p => p.cantidadVendida),
      ...bottom.map(p => p.cantidadVendida),
    ];
    // Indigo (top performers) + amber (bottom — needs attention)
    const colors: string[] = [
      ...top.map(   () => '#6366F1'),
      ...bottom.map(() => '#F59E0B'),
    ];

    const totalBars = top.length + bottom.length;
    const height    = Math.max(200, totalBars * 38 + 40);

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
          borderRadius: 0,
          distributed: true,
          dataLabels: { position: 'end' },
          barHeight: '55%',
        },
      },
      series: [{ data: values }],
      xaxis: {
        categories,
        labels: {
          style: { fontFamily: 'Geist Mono Variable, monospace', fontSize: '10px', colors: ['#94A3B8'] },
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
        formatter: (val: number) => `${val} uds.`,
        style: {
          fontFamily: 'Geist Mono Variable, monospace',
          fontSize: '11px',
          fontWeight: '500',
          colors: ['#334155'],
        },
        offsetX: -4,
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
        y: { formatter: (val: number) => `${val} unidades vendidas` },
        style: { fontFamily: 'Geist Variable, sans-serif' },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
