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
          <span class="ia-badge ia-badge-red">{{ sinStock().length }} sin stock</span>
        }
        @if (criticos().length > 0) {
          <span class="ia-badge ia-badge-orange">{{ criticos().length }} críticos</span>
        }
      </div>
    } @else {
      <p class="ia-subtitle">Stock más bajo del catálogo activo</p>
    }

    <div #chartEl></div>

    <a routerLink="/inventario/productos" class="ia-link">Ver inventario completo →</a>
  `,
  styles: [`
    .ia-summary {
      display: flex; gap: 0.5rem; margin-bottom: 0.625rem; flex-wrap: wrap;
    }
    .ia-badge {
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; padding: 0.2rem 0.6rem; border-radius: 99px;
    }
    .ia-badge-red    { background: #FEE2E2; color: #991B1B; }
    .ia-badge-orange { background: #FEF3C7; color: #92400E; }

    .ia-subtitle {
      font-size: 0.68rem; font-weight: 700; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 0.5rem;
    }

    .ia-link {
      display: block; text-align: right; margin-top: 0.25rem;
      font-size: 0.75rem; font-weight: 700; color: #4F46E5; text-decoration: none;
    }
    .ia-link:hover { text-decoration: underline; }
  `],
})
export class InventarioAlertasComponent implements OnDestroy {
  readonly sinStock  = input.required<AlertaProducto[]>();
  readonly criticos  = input.required<AlertaProducto[]>();
  readonly bajoStock = input.required<AlertaProducto[]>();

  readonly hayAlertas = computed(() => this.sinStock().length > 0 || this.criticos().length > 0);

  // Lista combinada: sin stock (rojo) → crítico (naranja) → bajo stock (azul)
  // Ordenada de menor a mayor cantidad
  private readonly allItems = computed(() => {
    const ss = this.sinStock().map(p  => ({ ...p, color: '#DC2626' }));
    const cr = this.criticos().map(p  => ({ ...p, color: '#D97706' }));
    const bs = this.bajoStock().map(p => ({ ...p, color: '#0284C7' }));
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
    const height = Math.max(160, items.length * 34 + 40);

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
          barHeight: '60%',
        },
      },
      series: [{
        data: items.map(p => ({
          x: truncate(p.nombre),
          // Sin stock (0) se muestra con valor mínimo para que sea visible
          y: +p.cantidadDisponible === 0 ? 0.2 : +p.cantidadDisponible,
          // Valor real para tooltip
          goals: [{ name: 'real', value: +p.cantidadDisponible }],
        })),
      }],
      colors: items.map(p => p.color),
      xaxis: {
        labels: {
          style: { fontFamily: 'inherit', fontSize: '11px', colors: ['#9CA3AF'] },
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
          style: { fontFamily: 'inherit', fontSize: '11px', colors: ['#374151'] },
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
          fontFamily: 'inherit',
          fontSize: '11px',
          fontWeight: '700',
          colors: ['#374151'],
        },
        offsetX: -6,
      },
      // Línea de referencia en cantidad = 5 (umbral crítico)
      annotations: {
        xaxis: [{
          x: 5,
          borderColor: '#D97706',
          borderWidth: 1.5,
          strokeDashArray: 4,
          label: {
            text: 'límite crítico',
            position: 'top',
            orientation: 'horizontal',
            style: {
              fontFamily: 'inherit',
              fontSize: '10px',
              color: '#D97706',
              background: '#FEF3C7',
            },
          },
        }],
      },
      legend: { show: false },
      grid: {
        borderColor: '#F0F2F5',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { left: 0, right: 20 },
      },
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        custom: ({ dataPointIndex }: any) => {
          const item = items[dataPointIndex as number] as typeof items[number];
          const qty = +item.cantidadDisponible;
          return `<div style="padding:6px 10px;font-family:inherit;font-size:12px;font-weight:600">${item.nombre}<br><span style="color:#6B7280;font-weight:400">${qty} ${item.unidadMedida}</span></div>`;
        },
      },
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
