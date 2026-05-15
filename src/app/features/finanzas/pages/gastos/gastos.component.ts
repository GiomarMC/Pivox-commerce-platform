import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinanzasService } from '../../finanzas.service';

type PestanaActiva = 'fijos' | 'variables';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-content max-w-2xl pb-8" style="display:flex;flex-direction:column;gap:0.875rem">
      <div class="page-header">
        <h1 class="page-title">Gastos</h1>
      </div>

      <!-- Selector mes/año -->
      <div class="card">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
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
      </div>

      <!-- Pestañas chip -->
      <div style="display:flex;gap:0.5rem">
        <button type="button" (click)="pestana = 'fijos'" [class]="pestana === 'fijos' ? 'chip chip-active' : 'chip'" style="flex:1;justify-content:center">
          Gastos fijos
        </button>
        <button type="button" (click)="pestana = 'variables'" [class]="pestana === 'variables' ? 'chip chip-active' : 'chip'" style="flex:1;justify-content:center">
          Gastos variables
        </button>
      </div>

      @if (svc.state().isLoading) {
        <div class="empty-state">
          <div class="loading-spinner" style="margin-bottom:0.5rem"></div>
          Cargando...
        </div>
      }

      @if (svc.state().errorMessage) {
        <div class="error-banner">{{ svc.state().errorMessage }}</div>
      }
      @if (svc.state().successMessage) {
        <div class="success-banner">{{ svc.state().successMessage }}</div>
      }

      <!-- GASTOS FIJOS -->
      @if (pestana === 'fijos') {
        @if (svc.state().gastosFijosResumen; as gfr) {
          @for (tienda of gfr.tiendas; track tienda.tienda) {
            <div class="card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
                <p class="section-title" style="margin:0">{{ tienda.tienda }}</p>
                @if (tienda.mesCerrado) {
                  <span class="badge badge-zinc">Mes cerrado</span>
                }
              </div>
              @for (entry of detalleEntries(tienda.detalle); track entry.key) {
                <div style="display:flex;justify-content:space-between;font-size:0.875rem;padding:0.25rem 0;border-bottom:1px solid #F2F4FA">
                  <span style="color:#6B7280">{{ entry.key }}</span>
                  <span>S/ {{ entry.value }}</span>
                </div>
              }
              <div style="display:flex;justify-content:space-between;font-weight:700;color:#1F2A7C;margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid #E2E6F0">
                <span>Total</span><span>S/ {{ tienda.totalGeneral }}</span>
              </div>
            </div>
          }
          <div style="font-size:0.875rem;font-weight:700;text-align:right;color:#1F2A7C">
            Total global: S/ {{ gfr.totalGlobal }}
          </div>
        }

        @if (!mostrarFormFijo()) {
          <button type="button" (click)="mostrarFormFijo.set(true)" class="btn-secondary w-full">
            + Agregar gasto fijo
          </button>
        } @else {
          <div class="card">
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
        }

        <button type="button" (click)="cerrarMes()" [disabled]="svc.state().isSaving" class="btn-danger w-full">
          Cerrar mes de gastos
        </button>
      }

      <!-- GASTOS VARIABLES -->
      @if (pestana === 'variables') {
        @if (svc.state().gastosVariablesResumen; as gvr) {
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <p class="section-title" style="margin:0">{{ gvr.tienda }}</p>
                @if (gvr.mesCerrado) {
                  <p style="font-size:0.72rem;color:#9CA3AF;margin:0.15rem 0 0">Mes cerrado</p>
                }
              </div>
              <div style="text-align:right">
                <p style="font-size:0.72rem;color:#9CA3AF;margin:0 0 0.15rem">Total del mes</p>
                <p style="font-size:1.1rem;font-weight:800;color:#1F2A7C;margin:0">S/ {{ gvr.totalMes }}</p>
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
