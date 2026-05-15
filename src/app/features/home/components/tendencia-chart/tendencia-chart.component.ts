import {
  Component, input, viewChild, ElementRef,
  effect, untracked, afterNextRender, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type ApexCharts from 'apexcharts';
import type { TendenciaDia } from '../../home-stats.service';

@Component({
  selector: 'app-tendencia-chart',
  standalone: true,
  template: `<div #chartEl></div>`,
})
export class TendenciaChartComponent implements OnDestroy {
  readonly tendencia = input.required<TendenciaDia[]>();

  private readonly chartEl    = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.tendencia()));
      await this.chart.render();
    });

    effect(() => {
      const t = this.tendencia();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateOptions(this.buildOptions(t), false, false);
        }
      });
    });
  }

  private buildOptions(tendencia: TendenciaDia[]): ApexCharts.ApexOptions {
    return {
      chart: {
        type: 'area',
        height: 280,
        toolbar: { show: false },
        background: 'transparent',
        animations: { enabled: true, speed: 600 },
      },
      series: [
        {
          name: 'Ventas',
          data: tendencia.map(t => t.totalVentas),
        },
        {
          name: 'Servicios',
          data: tendencia.map(t => t.totalServicios),
        },
      ],
      xaxis: {
        categories: tendencia.map(t => t.fecha),
        labels: {
          style: { fontFamily: 'inherit', fontSize: '11px', colors: Array(7).fill('#6B7280') },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontFamily: 'inherit', fontSize: '11px', colors: ['#9CA3AF'] },
          formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`,
        },
      },
      colors: ['#4F46E5', '#059669'],
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.02,
          stops: [0, 100],
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '11px',
        fontFamily: 'inherit',
        markers: { size: 6 },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => `S/ ${val.toFixed(2)}`,
        },
      },
      grid: {
        borderColor: '#F0F2F5',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 8, right: 8 },
      },
      dataLabels: { enabled: false },
      markers: {
        size: 4,
        hover: { size: 6 },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
