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
    // Indigo para top, amber para bottom
    const colors: string[] = [
      ...top.map(   () => '#4F46E5'),
      ...bottom.map(() => '#F59E0B'),
    ];

    const totalBars = top.length + bottom.length;
    const height    = Math.max(200, totalBars * 36 + 60);

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
          borderRadius: 5,
          distributed: true,
          dataLabels: { position: 'end' },
        },
      },
      series: [{ data: values }],
      xaxis: {
        categories,
        labels: {
          style: { fontFamily: 'inherit', fontSize: '11px', colors: ['#6B7280'] },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontFamily: 'inherit', fontSize: '11px', colors: ['#374151'] },
          maxWidth: 180,
        },
      },
      colors,
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val} uds.`,
        style: {
          fontFamily: 'inherit',
          fontSize: '11px',
          fontWeight: '700',
          colors: ['#374151'],
        },
        offsetX: -4,
      },
      legend: { show: false },
      grid: {
        borderColor: '#F0F2F5',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { left: 0, right: 24 },
      },
      tooltip: {
        y: { formatter: (val: number) => `${val} unidades vendidas` },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
