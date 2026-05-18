import {
  Component, input, computed,
  viewChild, ElementRef, effect, untracked,
  afterNextRender, OnDestroy, inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import type ApexCharts from 'apexcharts';

export interface AlertaProducto {
  nombre: string;
  cantidadDisponible: string;
  unidadMedida: string;
}

function truncate(name: string, max = 26): string {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

@Component({
  selector: 'app-inventario-alertas',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (hayAlertas()) {
      <div class="ia-summary">
        @if (sinStock().length > 0) {
          <span class="badge badge-error">{{ sinStock().length }} sin stock</span>
        }
        @if (criticos().length > 0) {
          <span class="badge badge-warning">{{ criticos().length }} críticos</span>
        }
      </div>
    } @else {
      <p class="ia-subtitle">Stock más bajo del catálogo activo</p>
    }

    <div #chartEl></div>

    <a routerLink="/inventario/productos" class="ia-link link-edit">Ver inventario completo →</a>
  `,
  styles: [`
    :host { display: block; }
    .ia-summary {
      display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;
    }
    .ia-subtitle {
      font-family: var(--font-sans);
      font-size: 0.6875rem; font-weight: 700; color: var(--color-ink-3);
      text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 0.5rem;
    }
    .ia-link {
      display: inline-block; text-align: right; margin-top: 0.875rem;
      font-family: var(--font-sans);
      font-size: 0.75rem; font-weight: 600;
    }
  `],
})
export class InventarioAlertasComponent implements OnDestroy {
  readonly sinStock  = input.required<AlertaProducto[]>();
  readonly criticos  = input.required<AlertaProducto[]>();
  readonly bajoStock = input.required<AlertaProducto[]>();

  readonly hayAlertas = computed(() => this.sinStock().length > 0 || this.criticos().length > 0);

  private readonly allItems = computed(() => {
    const ss = this.sinStock().map(p  => ({ ...p, color: '#EF4444' }));
    const cr = this.criticos().map(p  => ({ ...p, color: '#F59E0B' }));
    const bs = this.bajoStock().map(p => ({ ...p, color: '#6366F1' }));
    return [...ss, ...cr, ...bs];
  });

  private readonly chartEl    = viewChild.required<ElementRef<HTMLElement>>('chartEl');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { default: ApexChartsClass } = await import('apexcharts');
      this.chart = new ApexChartsClass(this.chartEl().nativeElement, this.buildOptions(this.allItems()));
      await this.chart.render();
    });

    effect(() => {
      const items = this.allItems();
      untracked(() => {
        if (this.chart) {
          void this.chart.updateOptions(this.buildOptions(items), false, false);
        }
      });
    });
  }

  private buildOptions(items: { nombre: string; cantidadDisponible: string; unidadMedida: string; color: string }[]): ApexCharts.ApexOptions {
    const height = Math.max(160, items.length * 36 + 40);

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
          barHeight: '50%',
        },
      },
      series: [{
        data: items.map(p => ({
          x: truncate(p.nombre),
          y: +p.cantidadDisponible === 0 ? 0.2 : +p.cantidadDisponible,
          goals: [{ name: 'real', value: +p.cantidadDisponible }],
        })),
      }],
      colors: items.map(p => p.color),
      xaxis: {
        labels: {
          style: { fontFamily: 'Geist Mono Variable, monospace', fontSize: '10px', colors: ['#94A3B8'] },
          formatter: (val: string) => {
            const n = Number(val);
            return n < 1 ? '0' : String(Math.round(n));
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontFamily: 'Geist Variable, sans-serif', fontSize: '11px', colors: ['#334155'] },
          maxWidth: 190,
        },
      },
      dataLabels: {
        enabled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (_val: any, opts: any) => {
          const item = items[opts.dataPointIndex as number] as typeof items[number];
          const qty = +item.cantidadDisponible;
          return qty === 0 ? `0 ${item.unidadMedida}` : `${qty} ${item.unidadMedida}`;
        },
        style: {
          fontFamily: 'Geist Mono Variable, monospace',
          fontSize: '11px',
          fontWeight: '500',
          colors: ['#334155'],
        },
        offsetX: -6,
      },
      annotations: {
        xaxis: [{
          x: 5,
          borderColor: '#F59E0B',
          borderWidth: 1,
          strokeDashArray: 3,
          label: {
            text: 'CRÍTICO',
            position: 'top',
            orientation: 'horizontal',
            style: {
              fontFamily: 'Geist Variable, sans-serif',
              fontSize: '9px',
              fontWeight: '700',
              color: '#F59E0B',
              background: 'transparent',
            },
          },
        }],
      },
      legend: { show: false },
      grid: {
        borderColor: '#EEF1F6',
        strokeDashArray: 2,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { left: 0, right: 20 },
      },
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        custom: ({ dataPointIndex }: any) => {
          const item = items[dataPointIndex as number] as typeof items[number];
          const qty = +item.cantidadDisponible;
          return `<div style="padding:8px 12px;font-family:'Geist Variable',sans-serif;font-size:12px;font-weight:600;border:1px solid #334155;background:#FFFFFF">${item.nombre}<br><span style="color:#64748B;font-weight:400;font-family:'Geist Mono Variable',monospace;font-size:11px">${qty} ${item.unidadMedida}</span></div>`;
        },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
