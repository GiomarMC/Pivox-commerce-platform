import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ServicioService } from '../../servicio.service';
import { ResumenServicioService } from '../../resumen-servicio.service';
import { ServicioFormService } from '../../servicio-form.service';
import { ClienteModel } from '../../../venta/models/cliente.model';
import { ServicioFlowHeaderComponent } from '../../components/servicio-flow-header/servicio-flow-header.component';
import { ClienteSearchComponent } from '../../../venta/components/cliente-search/cliente-search.component';
import { TIPO_VENTA_VALUES, getTipoVentaLabel } from '../../../venta/constants/tipo-venta';
import { METODO_PAGO_VALUES, getMetodoPagoLabel } from '../../../venta/constants/metodo-pago';
import { TIPO_COMPROBANTE_VALUES, getTipoComprobanteLabel } from '../../../venta/constants/tipo-comprobante';
import { rucValidator, noRucEnBoletaValidator } from '../../../venta/validators/venta.validators';

@Component({
  selector: 'app-resumen-servicio',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ServicioFlowHeaderComponent, ClienteSearchComponent],
  styles: [`
    .srs-toggle { display:flex; border:1.5px solid #EEF1F6; border-radius: 14px; overflow:hidden; margin-bottom:0.875rem; }
    .srs-toggle-btn { flex:1; padding:0.5rem 0.75rem; font-size:0.8rem; font-weight:600; border:none; cursor:pointer; transition:background 0.12s; font-family:inherit; background:#fff; color:#64748B; }
    .srs-toggle-btn-active { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: #fff; }
    .srs-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #EEF1F6; padding:1rem; z-index:20; }
    .srs-layout { display:flex; flex-direction:column; gap:0.875rem; }
    .srs-left { display:flex; flex-direction:column; gap:0.875rem; }
    .srs-desktop-btn { display:none; }

    @media (min-width: 1024px) {
      .srs-wrap { max-width:1100px; padding-bottom:2rem; }
      .srs-layout { display:grid; grid-template-columns:360px 1fr; gap:1.5rem; align-items:start; }
      .srs-left { position:sticky; top:1rem; }
      .srs-footer { display:none; }
      .srs-desktop-btn { display:block; margin-top:0.5rem; }
    }
  `],
  template: `
    <app-servicio-flow-header [currentStep]="2" />

    <div class="page-content srs-wrap pb-32" style="display:flex;flex-direction:column;gap:0.875rem">

      <div class="srs-layout">

      <!-- Left: service summary -->
      <div class="srs-left">
      <a routerLink="/servicios" class="btn-back" style="display:inline-flex;align-self:flex-start">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Datos del servicio
      </a>

      <!-- Resumen del servicio -->
      <div class="card" style="border-left:3px solid #334155">
        <p style="font-size:0.68rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 0.4rem">Período</p>
        <p style="font-size:0.875rem;font-weight:700;color:#334155;margin:0 0 0.2rem">{{ formSvc.state().fechaInicio }} — {{ formSvc.state().fechaFin }}</p>
        @if (formSvc.state().descripcion) {
          <p style="font-size:0.75rem;color:#94A3B8;margin:0 0 0.625rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ formSvc.state().descripcion }}</p>
        }
        <div style="border-top:1px solid #EEF1F6;padding-top:0.625rem;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.82rem;font-weight:600;color:#334155">Total</span>
          <span style="font-size:1.1rem;font-weight:800;color:#334155;letter-spacing:-0.01em">S/ {{ formSvc.state().total }}</span>
        </div>
      </div>
      </div><!-- /srs-left -->

      <!-- Right: payment form -->
      <div>
      <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:0.875rem">

        <!-- Tipo de servicio -->
        <div class="card">
          <p class="section-title" style="margin-bottom:0.75rem">Tipo de servicio</p>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
            @for (v of tipoVentaValues; track v) {
              <button type="button" (click)="seleccionarTipoVenta(v)" [class]="chipClass(tipoVenta() === v)">
                {{ getTipoVentaLabel(v) }}
              </button>
            }
          </div>
        </div>

        <!-- Método de pago (no aplica para crédito) -->
        @if (!isCredito()) {
          <div class="card">
            <p class="section-title" style="margin-bottom:0.75rem">Método de pago</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
              @for (v of metodoPagoValues; track v) {
                <button type="button" (click)="form.patchValue({ metodoPago: v })" [class]="chipClass(metodoPago() === v)">
                  {{ getMetodoPagoLabel(v) }}
                </button>
              }
            </div>
          </div>
        }

        <!-- Tipo de comprobante (solo SUNAT) -->
        @if (isSunat()) {
          <div class="card">
            <p class="section-title" style="margin-bottom:0.75rem">Tipo de comprobante</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
              @for (v of tipoComprobanteValues; track v) {
                <button type="button" (click)="form.patchValue({ tipoComprobante: v })" [class]="chipClass(tipoComprobante() === v)">
                  {{ getTipoComprobanteLabel(v) }}
                </button>
              }
            </div>
            @if (form.get('tipoComprobante')?.invalid && form.get('tipoComprobante')?.touched) {
              <p style="font-size:0.75rem;color:#EF4444;margin:0.5rem 0 0">Requerido para SUNAT</p>
            }
          </div>
        }

        <!-- Sección cliente -->
        @if (isCredito() || isSunat()) {
          <div class="card">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.875rem">
              <div style="width:28px;height:28px;border-radius: 14px;background:#F3E8FF;color:#7C3AED;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <span style="font-size:0.875rem;font-weight:700;color:#334155">Cliente</span>
              <span style="font-size:0.72rem;color:#94A3B8">{{ clienteObligatorio() ? '(obligatorio)' : '(opcional)' }}</span>
            </div>

            <div class="srs-toggle">
              <button type="button"
                (click)="setUsarClienteNuevo(false)"
                [class]="'srs-toggle-btn' + (!form.get('usarClienteNuevo')?.value ? ' srs-toggle-btn-active' : '')"
              >Cliente existente</button>
              <button type="button"
                (click)="setUsarClienteNuevo(true)"
                [class]="'srs-toggle-btn' + (form.get('usarClienteNuevo')?.value ? ' srs-toggle-btn-active' : '')"
              >Nuevo cliente</button>
            </div>

            @if (!form.get('usarClienteNuevo')?.value) {
              <app-cliente-search
                [tipoComprobante]="tipoComprobante()"
                (clienteSeleccionado)="onClienteSeleccionado($event)"
                (limpiar)="onLimpiarCliente()"
              />
            } @else {
              <div formGroupName="clienteNuevo" style="display:flex;flex-direction:column;gap:0.75rem">
                <div class="field-group">
                  <label class="field-label">Tipo documento</label>
                  <select formControlName="tipoDocumento" class="field-select">
                    <option value="1">DNI</option>
                    <option value="6">RUC</option>
                    <option value="7">Pasaporte</option>
                  </select>
                </div>
                <div class="field-group">
                  <label class="field-label">N° documento</label>
                  <input formControlName="numeroDocumento" type="text" class="field-input" />
                  @if (form.get('clienteNuevo.numeroDocumento')?.errors?.['invalidRuc']) {
                    <p style="font-size:0.72rem;color:#EF4444;margin:0.25rem 0 0">RUC debe tener 11 dígitos</p>
                  }
                </div>
                <div class="field-group">
                  <label class="field-label">Nombre / Razón social</label>
                  <input formControlName="nombre" type="text" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Teléfono <span style="font-weight:400;color:#94A3B8">(opcional)</span></label>
                  <input formControlName="telefono" type="tel" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Email <span style="font-weight:400;color:#94A3B8">(opcional)</span></label>
                  <input formControlName="email" type="email" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Dirección <span style="font-weight:400;color:#94A3B8">(opcional)</span></label>
                  <input formControlName="direccion" type="text" class="field-input" />
                </div>
              </div>
            }
          </div>
        }

        <!-- Errores de validación -->
        @if (form.errors?.['clienteRequerido'] && form.touched) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            Se requiere un cliente para servicios a crédito.
          </div>
        }
        @if (form.errors?.['clienteFacturaRequerido'] && form.touched) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            La Factura requiere un cliente con RUC.
          </div>
        }
        @if (servicioSvc.state().errorMessage) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            {{ servicioSvc.state().errorMessage }}
          </div>
        }

      </form>

        <!-- Desktop submit button (inline in right column) -->
        <div class="srs-desktop-btn">
          <button type="button" (click)="submit()" [disabled]="servicioSvc.state().isSaving" class="btn-primary w-full">
            @if (servicioSvc.state().isSaving) {
              <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
              Enviando...
            } @else {
              Registrar servicio
            }
          </button>
        </div>

      </div><!-- /right -->
      </div><!-- /srs-layout -->
    </div>

    <div class="srs-footer">
      <button type="button" (click)="submit()" [disabled]="servicioSvc.state().isSaving" class="btn-primary w-full">
        @if (servicioSvc.state().isSaving) {
          <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
          Enviando...
        } @else {
          Registrar servicio
        }
      </button>
    </div>
  `,
})
export class ResumenServicioComponent implements OnInit, OnDestroy {
  readonly servicioSvc = inject(ServicioService);
  readonly resumenSvc = inject(ResumenServicioService);
  readonly formSvc = inject(ServicioFormService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly tipoVentaValues = TIPO_VENTA_VALUES;
  readonly metodoPagoValues = METODO_PAGO_VALUES;
  readonly tipoComprobanteValues = TIPO_COMPROBANTE_VALUES;
  readonly getTipoVentaLabel = getTipoVentaLabel;
  readonly getMetodoPagoLabel = getMetodoPagoLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;

  private readonly _tipoVenta = signal('NORMAL');
  private readonly _metodoPago = signal('EFECTIVO');
  private readonly _tipoComprobante = signal('');

  readonly tipoVenta = this._tipoVenta.asReadonly();
  readonly metodoPago = this._metodoPago.asReadonly();
  readonly tipoComprobante = this._tipoComprobante.asReadonly();

  readonly isSunat = computed(() => this._tipoVenta() === 'SUNAT');
  readonly isCredito = computed(() => this._tipoVenta() === 'CREDITO');
  readonly clienteObligatorio = computed(() =>
    this.isCredito() || (this.isSunat() && this._tipoComprobante() === '01'),
  );

  form = this.fb.group(
    {
      tipoVenta: ['NORMAL', Validators.required],
      metodoPago: ['EFECTIVO', Validators.required],
      tipoComprobante: [''],
      clienteId: [null as number | null],
      usarClienteNuevo: [false],
      clienteNuevo: this.fb.group({
        tipoDocumento: ['1'],
        numeroDocumento: [''],
        nombre: [''],
        telefono: [''],
        email: [''],
        direccion: [''],
      }),
    },
    { validators: this.servicioFormValidator },
  );

  private subs: Subscription[] = [];

  ngOnInit(): void {
    const saved = this.resumenSvc.state();

    this._tipoVenta.set(saved.tipoVenta);
    this._metodoPago.set(saved.metodoPago);
    this._tipoComprobante.set(saved.tipoComprobante ?? '');

    this.form.patchValue({
      tipoVenta: saved.tipoVenta,
      metodoPago: saved.metodoPago,
      tipoComprobante: saved.tipoComprobante ?? '',
      clienteId: saved.clienteId,
      usarClienteNuevo: saved.usarClienteNuevo,
    });

    const tipoDocCtrl = this.form.get('clienteNuevo.tipoDocumento')!;
    const numDocCtrl = this.form.get('clienteNuevo.numeroDocumento')!;
    const tipoCompCtrl = this.form.get('tipoComprobante')!;

    this.subs.push(
      this.form.get('tipoVenta')!.valueChanges.subscribe(v => {
        this._tipoVenta.set(v ?? 'NORMAL');
      }),
    );
    this.subs.push(
      this.form.get('metodoPago')!.valueChanges.subscribe(v => {
        this._metodoPago.set(v ?? 'EFECTIVO');
      }),
    );
    this.subs.push(
      tipoCompCtrl.valueChanges.subscribe(v => {
        this._tipoComprobante.set(v ?? '');
      }),
    );

    this.subs.push(
      tipoDocCtrl.valueChanges.subscribe(tipo => {
        numDocCtrl.setValidators(tipo === '6' ? [rucValidator()] : []);
        numDocCtrl.updateValueAndValidity();
      }),
    );

    this.subs.push(
      this.form.get('tipoVenta')!.valueChanges.subscribe(tipo => {
        if (tipo === 'SUNAT') {
          tipoCompCtrl.setValidators([Validators.required]);
        } else {
          tipoCompCtrl.clearValidators();
          this.form.patchValue({ tipoComprobante: '' });
        }
        tipoCompCtrl.updateValueAndValidity();
      }),
    );

    this.subs.push(
      tipoCompCtrl.valueChanges.subscribe(() => {
        tipoDocCtrl.setValidators([noRucEnBoletaValidator(tipoCompCtrl)]);
        tipoDocCtrl.updateValueAndValidity();
      }),
    );

    this.subs.push(
      this.form.valueChanges.subscribe(val => {
        const cnVal = val['clienteNuevo'] as Record<string, string> | null;
        this.resumenSvc.actualizar({
          tipoVenta: val['tipoVenta'] ?? 'NORMAL',
          metodoPago: val['metodoPago'] ?? 'EFECTIVO',
          tipoComprobante: val['tipoComprobante'] || null,
          clienteId: val['clienteId'] ?? null,
          usarClienteNuevo: val['usarClienteNuevo'] ?? false,
          clienteNuevo: {
            tipoDocumento: cnVal?.['tipoDocumento'] ?? '1',
            numeroDocumento: cnVal?.['numeroDocumento'] ?? '',
            nombre: cnVal?.['nombre'] ?? '',
            telefono: cnVal?.['telefono'] ?? '',
            email: cnVal?.['email'] ?? '',
            direccion: cnVal?.['direccion'] ?? '',
          },
        });
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  chipClass(activo: boolean): string {
    return activo ? 'chip chip-active' : 'chip';
  }

  seleccionarTipoVenta(v: string): void {
    this.form.patchValue({ tipoVenta: v, tipoComprobante: '' });
  }

  private servicioFormValidator(group: import('@angular/forms').AbstractControl): import('@angular/forms').ValidationErrors | null {
    const tipo = group.get('tipoVenta')?.value as string;
    const tipoComprobante = group.get('tipoComprobante')?.value as string;
    const clienteId = group.get('clienteId')?.value as number | null;
    const usarNuevo = group.get('usarClienteNuevo')?.value as boolean;
    const nombre = group.get('clienteNuevo.nombre')?.value as string;
    const tieneCliente = clienteId != null || (usarNuevo && nombre?.trim());

    if (tipo === 'CREDITO' && !tieneCliente) {
      return { clienteRequerido: true };
    }
    if (tipo === 'SUNAT' && tipoComprobante === '01' && !tieneCliente) {
      return { clienteFacturaRequerido: true };
    }
    return null;
  }

  setUsarClienteNuevo(value: boolean): void {
    this.form.patchValue({ usarClienteNuevo: value });
    if (!value) this.form.patchValue({ clienteId: null });
  }

  onClienteSeleccionado(cliente: ClienteModel): void {
    this.resumenSvc.seleccionarCliente(cliente);
    this.form.patchValue({ clienteId: cliente.id, usarClienteNuevo: false });
  }

  onLimpiarCliente(): void {
    this.form.patchValue({ clienteId: null });
    this.resumenSvc.actualizar({ clienteId: null, clienteNombre: null });
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.servicioSvc.clearMessages();
    const servicio = await this.servicioSvc.crearServicio();
    if (servicio) {
      void this.router.navigate(['/servicios/comprobante']);
    }
  }
}
