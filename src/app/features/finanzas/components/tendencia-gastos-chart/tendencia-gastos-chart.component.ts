import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';
import type { TendenciaGastosPunto } from '../../finanzas.service';

@Component({
  selector: 'app-tendencia-gastos-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class TendenciaGastosChartComponent implements OnDestroy {
  readonly puntos = input.required<TendenciaGastosPunto[]>();

  private readonly chartEl = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.puntos()));
      await this.chart.render();
    });

    effect(() => {
      const p = this.puntos();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateOptions(this.buildOptions(p), false, false);
        }
      });
    });
  }

  private buildOptions(puntos: TendenciaGastosPunto[]): ApexCharts.ApexOptions {
    return {
      chart: {
        type: 'area',
        height: 260,
        toolbar: { show: false },
        background: 'transparent',
        animations: { enabled: true, speed: 600 },
        stacked: true,
      },
      series: [
        { name: 'Fijo',     data: puntos.map(p => p.fijo) },
        { name: 'Variable', data: puntos.map(p => p.variable) },
      ],
      xaxis: {
        categories: puntos.map(p => p.label),
        labels: {
          style: { fontFamily: 'Geist Mono Variable, monospace', fontSize: '10px', colors: Array(puntos.length).fill('#94A3B8') },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontFamily: 'Geist Mono Variable, monospace', fontSize: '10px', colors: ['#94A3B8'] },
          formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        },
      },
      colors: ['#6366F1', '#06B6D4'],
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.32,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '11px',
        fontFamily: 'Geist Variable, sans-serif',
        fontWeight: 600,
        labels: { colors: '#334155' },
        markers: { size: 6, shape: 'square' },
        itemMargin: { horizontal: 12 },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        style: { fontFamily: 'Geist Variable, sans-serif' },
      },
      grid: {
        borderColor: '#EEF1F6',
        strokeDashArray: 2,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 8, right: 8 },
      },
      dataLabels: { enabled: false },
      markers: {
        size: 0,
        strokeColors: '#FFFFFF',
        strokeWidth: 1,
        hover: { size: 5 },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
