import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { FinanzasService } from '../../finanzas.service';
import { FijoVariableChartComponent } from '../../components/fijo-variable-chart/fijo-variable-chart.component';
import { GastosPorTipoChartComponent, GastoTipoItem } from '../../components/gastos-por-tipo-chart/gastos-por-tipo-chart.component';

type PestanaActiva = 'fijos' | 'variables';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    FijoVariableChartComponent,
    GastosPorTipoChartComponent,
  ],
  styles: [`
    .gs-wrap { padding-top: 1.25rem; padding-bottom: 2rem; }
    .gs-header { margin-bottom: 1.5rem; }
    .gs-eyebrow { color: var(--color-ink-3); margin-bottom: 0.375rem; }
    .gs-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(1.5rem, 2.5vw, 2rem);
      line-height: 1.1;
      letter-spacing: -0.025em;
      color: var(--color-ink-strong);
      margin: 0 0 0.25rem;
    }
    .gs-meta {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-ink-2);
      margin: 0;
    }

    /* KPIs */
    .gs-kpis {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    @media (min-width: 540px) { .gs-kpis { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .gs-kpis { grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 0.875rem; } }

    .gs-kpi {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--color-rule-2);
      border-radius: var(--radius-lg);
      padding: 1rem 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      min-height: 6.25rem;
    }
    .gs-kpi-hero {
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%);
      border-color: transparent;
      color: #FFFFFF;
      box-shadow: 0 12px 28px rgba(99, 102, 241, 0.32);
    }
    .gs-kpi-label { color: var(--color-ink-3); font-size: 0.625rem; }
    .gs-kpi-hero .gs-kpi-label { color: rgba(255, 255, 255, 0.82); }
    .gs-kpi-value {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(1.5rem, 2.5vw, 2rem);
      line-height: 1.05;
      letter-spacing: -0.03em;
      margin: 0;
      color: #FFFFFF;
      font-feature-settings: 'tnum';
    }
    .gs-kpi-pre {
      font-family: var(--font-mono);
      font-size: 0.5em;
      font-weight: 500;
      opacity: 0.65;
      margin-right: 0.2em;
      vertical-align: 0.55em;
    }
    .gs-kpi-value-sm {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.375rem;
      line-height: 1.1;
      letter-spacing: -0.025em;
      margin: 0;
      color: var(--color-ink-strong);
      font-feature-settings: 'tnum';
    }
    .gs-kpi-pre-sm {
      font-family: var(--font-mono);
      font-size: 0.55em;
      font-weight: 500;
      color: var(--color-ink-2);
      margin-right: 0.2em;
      vertical-align: 0.5em;
    }
    .gs-kpi-pill {
      align-self: flex-start;
      display: inline-flex;
      padding: 0.2rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
    .gs-kpi-pill-success { color: var(--color-success); background: var(--color-success-tint); }
    .gs-kpi-pill-info    { color: var(--color-accent);  background: var(--color-accent-tint); }
    .gs-kpi-pill-violet  { color: #7C3AED; background: #F3E8FF; }
    .gs-kpi-pill-warn    { color: var(--color-warning); background: var(--color-warning-tint); }

    /* Charts */
    .gs-charts {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.875rem;
      margin-bottom: 1.25rem;
    }
    @media (min-width: 1024px) { .gs-charts { grid-template-columns: 1fr 1.4fr; } }

    .gs-card {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--color-rule-2);
      border-radius: var(--radius-lg);
      padding: 1.125rem 1.25rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .gs-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.875rem;
    }
    .gs-card-title { color: var(--color-ink-2); font-size: 0.6875rem; }
    .gs-chart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      padding: 2rem 1rem;
      text-align: center;
    }
    .gs-chart-empty p {
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      color: var(--color-ink-3);
      margin: 0;
    }

    /* Selector mes/año + tabs + content */
    .gs-controls {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--color-rule-2);
      border-radius: var(--radius-lg);
      padding: 1rem 1.125rem;
      margin-bottom: 1rem;
      box-shadow: var(--shadow-sm);
    }

    .gs-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .gs-tabs button { flex: 1; justify-content: center; }
  `],
  template: `
    <div class="page-content gs-wrap">

      <!-- Header -->
      <header class="gs-header">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
          <div>
            <p class="text-eyebrow gs-eyebrow">Finanzas</p>
            <h1 class="gs-title">Gastos · {{ mesLabel }} {{ anio }}</h1>
            <p class="gs-meta">
              @if (svc.state().gastosFijosResumen?.tiendas?.[0]?.mesCerrado) {
                Mes cerrado · solo lectura
              } @else {
                Mes abierto · puedes registrar gastos
              }
            </p>
          </div>
          <button type="button" (click)="cerrarMes()" [disabled]="svc.state().isSaving || svc.state().gastosFijosResumen?.tiendas?.[0]?.mesCerrado"
            class="btn-secondary" style="font-size:0.8125rem;padding:0.5rem 0.875rem">
            Cerrar mes
          </button>
        </div>
      </header>

      <!-- KPIs -->
      <section class="gs-kpis">
        <div class="gs-kpi gs-kpi-hero">
          <span class="text-eyebrow gs-kpi-label">Total del mes</span>
          <p class="gs-kpi-value">
            <span class="gs-kpi-pre">S/</span>{{ totalMes() | number:'1.2-2' }}
          </p>
          <span class="gs-kpi-pill" style="background:rgba(255,255,255,0.2);color:#FFFFFF">Egresos totales</span>
        </div>

        <div class="gs-kpi">
          <span class="text-eyebrow gs-kpi-label">Fijos</span>
          <p class="gs-kpi-value-sm">
            <span class="gs-kpi-pre-sm">S/</span>{{ totalFijos() | number:'1.2-2' }}
          </p>
          <span class="gs-kpi-pill gs-kpi-pill-info">{{ pctFijos() | number:'1.0-0' }}% del mes</span>
        </div>

        <div class="gs-kpi">
          <span class="text-eyebrow gs-kpi-label">Variables</span>
          <p class="gs-kpi-value-sm">
            <span class="gs-kpi-pre-sm">S/</span>{{ totalVariables() | number:'1.2-2' }}
          </p>
          <span class="gs-kpi-pill gs-kpi-pill-violet">{{ pctVariables() | number:'1.0-0' }}% del mes</span>
        </div>

        <div class="gs-kpi">
          <span class="text-eyebrow gs-kpi-label">Estado</span>
          <p class="gs-kpi-value-sm">{{ mesCerrado() ? 'Cerrado' : 'Abierto' }}</p>
          <span [class]="mesCerrado() ? 'gs-kpi-pill gs-kpi-pill-success' : 'gs-kpi-pill gs-kpi-pill-warn'">
            {{ mesCerrado() ? 'Solo lectura' : 'Editable' }}
          </span>
        </div>
      </section>

      <!-- Charts -->
      <section class="gs-charts">
        <article class="gs-card">
          <header class="gs-card-head">
            <p class="text-eyebrow gs-card-title">Fijo vs Variable</p>
          </header>
          @if (totalMes() > 0) {
            <app-fijo-variable-chart [fijo]="totalFijos()" [variable]="totalVariables()" />
          } @else {
            <div class="gs-chart-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <p>Sin gastos registrados este mes</p>
            </div>
          }
        </article>

        <article class="gs-card">
          <header class="gs-card-head">
            <p class="text-eyebrow gs-card-title">Por tipo de gasto · top 8</p>
          </header>
          @if (tipoItems().length > 0) {
            <app-gastos-por-tipo-chart [items]="tipoItems()" />
          } @else {
            <div class="gs-chart-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
              <p>Aún no hay gastos fijos por tipo</p>
            </div>
          }
        </article>
      </section>

      <!-- Selector mes/año + Tabs -->
      <div class="gs-controls">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem">
          <div class="field-group">
            <label class="field-label">Mes</label>
            <select [value]="mes" (change)="mes = +$any($event.target).value; recargar()" class="field-select">
              @for (m of meses; track m.valor) {
                <option [value]="m.valor">{{ m.label }}</option>
              }
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Año</label>
            <input type="number" [value]="anio" (change)="anio = +$any($event.target).value; recargar()" class="field-input" />
          </div>
        </div>

        <div class="gs-tabs">
          <button type="button" (click)="pestana = 'fijos'" [class]="pestana === 'fijos' ? 'chip chip-active' : 'chip'">
            Gastos fijos
          </button>
          <button type="button" (click)="pestana = 'variables'" [class]="pestana === 'variables' ? 'chip chip-active' : 'chip'">
            Gastos variables
          </button>
        </div>
      </div>

      @if (svc.state().isLoading) {
        <div class="empty-state">
          <div class="loading-spinner" style="margin-bottom:0.5rem"></div>
          Cargando...
        </div>
      }

      @if (svc.state().errorMessage) {
        <div class="error-banner" style="margin-bottom:0.875rem">{{ svc.state().errorMessage }}</div>
      }
      @if (svc.state().successMessage) {
        <div class="success-banner" style="margin-bottom:0.875rem">{{ svc.state().successMessage }}</div>
      }

      <!-- GASTOS FIJOS -->
      @if (pestana === 'fijos') {
        @if (svc.state().gastosFijosResumen; as gfr) {
          @for (tienda of gfr.tiendas; track tienda.tienda) {
            <div class="card" style="margin-bottom:0.875rem">
              <div style="padding:1rem 1.25rem">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
                  <p class="section-title" style="margin:0">{{ tienda.tienda }}</p>
                  @if (tienda.mesCerrado) {
                    <span class="badge badge-zinc">Mes cerrado</span>
                  }
                </div>
                @for (entry of detalleEntries(tienda.detalle); track entry.key) {
                  <div style="display:flex;justify-content:space-between;font-size:0.875rem;padding:0.3rem 0;border-bottom:1px solid var(--color-rule)">
                    <span style="color:var(--color-ink-2)">{{ entry.key }}</span>
                    <span style="font-family:var(--font-mono);font-feature-settings:'tnum'">S/ {{ entry.value | number:'1.2-2' }}</span>
                  </div>
                }
                <div style="display:flex;justify-content:space-between;font-weight:700;color:var(--color-ink-strong);margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid var(--color-rule-2)">
                  <span>Total</span>
                  <span style="font-family:var(--font-mono);font-feature-settings:'tnum'">S/ {{ +tienda.totalGeneral | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          }
        }

        @if (!mostrarFormFijo()) {
          <button type="button" (click)="mostrarFormFijo.set(true)" class="btn-secondary w-full" style="margin-top:0.5rem">
            + Agregar gasto fijo
          </button>
        } @else {
          <div class="card" style="margin-top:0.5rem">
            <div style="padding:1rem 1.25rem">
              <p class="section-title" style="margin-bottom:0.875rem">Nuevo gasto fijo</p>
              <form [formGroup]="formFijo" (ngSubmit)="guardarFijo()" style="display:flex;flex-direction:column;gap:0.75rem">
                <div class="field-group">
                  <label class="field-label">Tipo de gasto</label>
                  <select formControlName="tipoGasto" class="field-select">
                    <option value="">Selecciona...</option>
                    @for (t of svc.state().tiposGasto; track t.valor) {
                      <option [value]="t.valor">{{ t.etiqueta }}</option>
                    }
                  </select>
                </div>
                <div class="field-group">
                  <label class="field-label">Monto (S/)</label>
                  <input type="number" formControlName="monto" step="0.01" min="0.01" placeholder="0.00" class="field-input" />
                </div>
                <div style="display:flex;gap:0.5rem">
                  <button type="button" (click)="mostrarFormFijo.set(false)" class="btn-secondary" style="flex:1">Cancelar</button>
                  <button type="submit" [disabled]="svc.state().isSaving || formFijo.invalid" class="btn-primary" style="flex:1">
                    {{ svc.state().isSaving ? '...' : 'Guardar' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      }

      <!-- GASTOS VARIABLES -->
      @if (pestana === 'variables') {
        @if (svc.state().gastosVariablesResumen; as gvr) {
          <div class="card" style="margin-bottom:0.875rem">
            <div style="padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between">
              <div>
                <p class="section-title" style="margin:0">{{ gvr.tienda }}</p>
                @if (gvr.mesCerrado) {
                  <p style="font-size:0.72rem;color:var(--color-ink-3);margin:0.15rem 0 0">Mes cerrado</p>
                }
              </div>
              <div style="text-align:right">
                <p class="text-eyebrow" style="margin:0 0 0.15rem;color:var(--color-ink-3)">Total del mes</p>
                <p style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:var(--color-ink-strong);margin:0;font-feature-settings:'tnum'">
                  S/ {{ +gvr.totalMes | number:'1.2-2' }}
                </p>
              </div>
            </div>
          </div>
        }

        @if (!mostrarFormVariable()) {
          <button type="button" (click)="mostrarFormVariable.set(true)" class="btn-secondary w-full">
            + Agregar gasto variable
          </button>
        } @else {
          <div class="card">
            <div style="padding:1rem 1.25rem">
              <p class="section-title" style="margin-bottom:0.875rem">Nuevo gasto variable</p>
              <form [formGroup]="formVariable" (ngSubmit)="guardarVariable()" style="display:flex;flex-direction:column;gap:0.75rem">
                <div class="field-group">
                  <label class="field-label">Descripción</label>
                  <input type="text" formControlName="descripcion" placeholder="Ej: Materiales de limpieza..." class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Monto (S/)</label>
                  <input type="number" formControlName="monto" step="0.01" min="0.01" placeholder="0.00" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Fecha</label>
                  <input type="date" formControlName="fecha" class="field-input" />
                </div>
                <div style="display:flex;gap:0.5rem">
                  <button type="button" (click)="mostrarFormVariable.set(false)" class="btn-secondary" style="flex:1">Cancelar</button>
                  <button type="submit" [disabled]="svc.state().isSaving || formVariable.invalid" class="btn-primary" style="flex:1">
                    {{ svc.state().isSaving ? '...' : 'Guardar' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class GastosComponent implements OnInit {
  readonly svc = inject(FinanzasService);
  private readonly fb = inject(FormBuilder);

  pestana: PestanaActiva = 'fijos';
  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();

  readonly mostrarFormFijo = signal(false);
  readonly mostrarFormVariable = signal(false);

  readonly meses = [
    { valor: 1, label: 'Enero' }, { valor: 2, label: 'Febrero' }, { valor: 3, label: 'Marzo' },
    { valor: 4, label: 'Abril' }, { valor: 5, label: 'Mayo' }, { valor: 6, label: 'Junio' },
    { valor: 7, label: 'Julio' }, { valor: 8, label: 'Agosto' }, { valor: 9, label: 'Setiembre' },
    { valor: 10, label: 'Octubre' }, { valor: 11, label: 'Noviembre' }, { valor: 12, label: 'Diciembre' },
  ];

  get mesLabel(): string {
    return this.meses.find(m => m.valor === this.mes)?.label ?? '';
  }

  // KPIs computeds
  readonly totalFijos = computed(() =>
    parseFloat(this.svc.state().gastosFijosResumen?.totalGlobal ?? '0'),
  );
  readonly totalVariables = computed(() =>
    parseFloat(this.svc.state().gastosVariablesResumen?.totalMes ?? '0'),
  );
  readonly totalMes = computed(() => this.totalFijos() + this.totalVariables());
  readonly pctFijos = computed(() => {
    const t = this.totalMes();
    return t > 0 ? (this.totalFijos() / t) * 100 : 0;
  });
  readonly pctVariables = computed(() => {
    const t = this.totalMes();
    return t > 0 ? (this.totalVariables() / t) * 100 : 0;
  });
  readonly mesCerrado = computed(() =>
    !!this.svc.state().gastosFijosResumen?.tiendas?.[0]?.mesCerrado,
  );

  // Chart: por tipo de gasto
  readonly tipoItems = computed((): GastoTipoItem[] => {
    const tiendas = this.svc.state().gastosFijosResumen?.tiendas ?? [];
    if (tiendas.length === 0) return [];
    const detalle = tiendas[0].detalle ?? {};
    const items: GastoTipoItem[] = Object.entries(detalle)
      .map(([label, value]) => ({ label, value: parseFloat(value) }))
      .filter(i => i.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    return items;
  });

  formFijo = this.fb.group({
    tipoGasto: ['', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  formVariable = this.fb.group({
    descripcion: ['', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fecha: [new Date().toISOString().split('T')[0], Validators.required],
  });

  ngOnInit(): void {
    this.recargar();
    void this.svc.cargarTiposGasto();
  }

  recargar(): void {
    void this.svc.cargarGastosFijosResumen(this.mes, this.anio);
    void this.svc.cargarGastosVariablesResumen(this.mes, this.anio);
    this.svc.clearMessages();
  }

  detalleEntries(detalle: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(detalle).map(([key, value]) => ({ key, value }));
  }

  async guardarFijo(): Promise<void> {
    this.formFijo.markAllAsTouched();
    if (this.formFijo.invalid) return;
    this.svc.clearMessages();
    const ok = await this.svc.crearGastoFijo(
      this.formFijo.value['tipoGasto']!,
      this.mes,
      this.anio,
      String(this.formFijo.value['monto'] ?? '0'),
    );
    if (ok) {
      this.mostrarFormFijo.set(false);
      this.formFijo.reset();
    }
  }

  async guardarVariable(): Promise<void> {
    this.formVariable.markAllAsTouched();
    if (this.formVariable.invalid) return;
    this.svc.clearMessages();
    const ok = await this.svc.crearGastoVariable(
      this.formVariable.value['descripcion']!,
      String(this.formVariable.value['monto'] ?? '0'),
      this.formVariable.value['fecha']!,
    );
    if (ok) {
      this.mostrarFormVariable.set(false);
      this.formVariable.reset({ fecha: new Date().toISOString().split('T')[0] });
    }
  }

  async cerrarMes(): Promise<void> {
    if (!confirm(`¿Cerrar el mes ${this.mes}/${this.anio}? Esta acción no se puede deshacer.`)) return;
    this.svc.clearMessages();
    await this.svc.cerrarMesGastos(this.mes, this.anio);
  }
}
