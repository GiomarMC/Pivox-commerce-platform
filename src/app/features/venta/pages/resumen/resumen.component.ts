import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { CarritoService } from '../../carrito.service';
import { ResumenVentaService } from '../../resumen-venta.service';
import { VentaService } from '../../venta.service';
import { ClienteModel } from '../../models/cliente.model';
import { FlowHeaderComponent } from '../../components/flow-header/flow-header.component';
import { ClienteSearchComponent } from '../../components/cliente-search/cliente-search.component';
import { TIPO_VENTA_VALUES, getTipoVentaLabel } from '../../constants/tipo-venta';
import { METODO_PAGO_VALUES, getMetodoPagoLabel } from '../../constants/metodo-pago';
import { TIPO_COMPROBANTE_VALUES, getTipoComprobanteLabel } from '../../constants/tipo-comprobante';
import { ventaFormValidator, rucValidator, noRucEnBoletaValidator } from '../../validators/venta.validators';

@Component({
  selector: 'app-resumen-venta',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FlowHeaderComponent, ClienteSearchComponent, DecimalPipe],
  styles: [`
    .rv-section { background:#fff; border:1px solid #E2E6F0; border-radius:14px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .rv-section-header { display:flex; align-items:center; gap:0.625rem; padding:0.875rem 1rem; border-bottom:1px solid #E2E6F0; }
    .rv-section-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .rv-section-body { padding:1rem; }
    .rv-collapse-btn { width:100%; display:flex; align-items:center; justify-content:space-between; padding:0.875rem 1rem; background:none; border:none; cursor:pointer; font-family:inherit; }
    .rv-item-row { display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid #F4F6FB; }
    .rv-item-row:last-child { border-bottom:none; }
    .rv-num { width:22px; height:22px; border-radius:50%; background:#1F2A7C; color:#fff; font-size:0.68rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .rv-toggle { display:flex; border:1.5px solid #E2E6F0; border-radius:8px; overflow:hidden; margin-bottom:0.875rem; }
    .rv-toggle-btn { flex:1; padding:0.5rem 0.75rem; font-size:0.8rem; font-weight:600; border:none; cursor:pointer; transition:background 0.12s, color 0.12s; font-family:inherit; background:#fff; color:#6B7280; }
    .rv-toggle-btn-active { background:#1F2A7C; color:#fff; }
    .rv-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #E2E6F0; padding:1rem; z-index:20; }
  `],
  template: `
    <app-flow-header [currentStep]="4" [showSunatStep]="isSunat()" />

    <div class="page-content max-w-2xl pb-32" style="display:flex;flex-direction:column;gap:0.875rem">

      <!-- Resumen del carrito (collapsible) -->
      <div class="rv-section">
        <button type="button" class="rv-collapse-btn" (click)="resumenExpandido.set(!resumenExpandido())">
          <div style="display:flex;align-items:center;gap:0.625rem">
            <div class="rv-section-icon" style="background:#EFF6FF;color:#1F2A7C">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </div>
            <span style="font-size:0.875rem;font-weight:700;color:#111827">Productos</span>
            <span style="font-size:0.72rem;color:#9CA3AF">({{ carritoSvc.items().length }})</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.625rem">
            <span style="font-size:0.95rem;font-weight:800;color:#1F2A7C">S/ {{ carritoSvc.total() | number:'1.2-2' }}</span>
            <svg [style]="'transition:transform 0.2s;transform:' + (resumenExpandido() ? 'rotate(180deg)' : 'rotate(0deg)')" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </button>
        @if (resumenExpandido()) {
          <div style="padding:0 1rem 0.75rem">
            @for (item of carritoSvc.items(); track item.productoId + '-' + item.esAveriado; let i = $index) {
              <div class="rv-item-row">
                <div style="display:flex;align-items:center;gap:0.5rem;min-width:0">
                  <div class="rv-num">{{ i + 1 }}</div>
                  <span style="font-size:0.82rem;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">{{ item.nombre }}</span>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <p style="font-size:0.7rem;color:#9CA3AF;margin:0">{{ item.cantidad }} × S/ {{ item.precioUnitario | number:'1.2-2' }}</p>
                  <p style="font-size:0.82rem;font-weight:700;color:#1F2A7C;margin:0">S/ {{ (item.cantidad * item.precioUnitario) | number:'1.2-2' }}</p>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:0.875rem">

        <!-- Tipo de venta (readonly, fue seleccionado en paso 1) -->
        <div class="rv-section">
          <div class="rv-section-header">
            <div class="rv-section-icon" style="background:#DCFCE7;color:#15803D">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="1"/>
              </svg>
            </div>
            <span style="font-size:0.875rem;font-weight:700;color:#111827">Tipo de venta</span>
            <span style="font-size:0.72rem;color:#9CA3AF;margin-left:auto">
              <a routerLink="/ventas" style="color:#1F2A7C;font-size:0.72rem;font-weight:600;text-decoration:none">Cambiar</a>
            </span>
          </div>
          <div class="rv-section-body">
            <span class="chip chip-active" style="pointer-events:none">{{ getTipoVentaLabel(tipoVenta()) }}</span>
          </div>
        </div>

        <!-- Método de pago (no aplica para crédito) -->
        @if (!isCredito()) {
          <div class="rv-section">
            <div class="rv-section-header">
              <div class="rv-section-icon" style="background:#FEF3C7;color:#D97706">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <span style="font-size:0.875rem;font-weight:700;color:#111827">Método de pago</span>
            </div>
            <div class="rv-section-body">
              <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
                @for (v of metodoPagoValues; track v) {
                  <button type="button" (click)="form.patchValue({ metodoPago: v })" [class]="chipClass(metodoPago() === v)">
                    {{ getMetodoPagoLabel(v) }}
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Tipo de comprobante (solo SUNAT) -->
        @if (isSunat()) {
          <div class="rv-section">
            <div class="rv-section-header">
              <div class="rv-section-icon" style="background:#FEE2E2;color:#DC2626">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span style="font-size:0.875rem;font-weight:700;color:#111827">Tipo de comprobante</span>
            </div>
            <div class="rv-section-body">
              <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
                @for (v of tipoComprobanteValues; track v) {
                  <button type="button" (click)="form.patchValue({ tipoComprobante: v })" [class]="chipClass(tipoComprobante() === v)">
                    {{ getTipoComprobanteLabel(v) }}
                  </button>
                }
              </div>
              @if (form.get('tipoComprobante')?.touched && !tipoComprobante()) {
                <p style="font-size:0.75rem;color:#DC2626;margin:0.5rem 0 0">Selecciona un tipo de comprobante</p>
              }
            </div>
          </div>
        }

        <!-- Sección cliente -->
        <div class="rv-section" style="overflow:visible">
          <div class="rv-section-header">
            <div class="rv-section-icon" style="background:#F3E8FF;color:#7C3AED">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span style="font-size:0.875rem;font-weight:700;color:#111827">Cliente</span>
            <span style="font-size:0.72rem;color:#9CA3AF;margin-left:0.25rem">
              {{ clienteObligatorio() ? '(obligatorio)' : '(opcional)' }}
            </span>
          </div>
          <div class="rv-section-body">

            <!-- Toggle existente / nuevo -->
            <div class="rv-toggle">
              <button
                type="button"
                (click)="setUsarClienteNuevo(false)"
                [class]="'rv-toggle-btn' + (!form.get('usarClienteNuevo')?.value ? ' rv-toggle-btn-active' : '')"
              >Cliente existente</button>
              <button
                type="button"
                (click)="setUsarClienteNuevo(true)"
                [class]="'rv-toggle-btn' + (form.get('usarClienteNuevo')?.value ? ' rv-toggle-btn-active' : '')"
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
                  @if (form.get('clienteNuevo.numeroDocumento')?.errors?.['rucInvalido']) {
                    <p style="font-size:0.75rem;color:#DC2626;margin:0.3rem 0 0">RUC debe tener 11 dígitos</p>
                  }
                </div>
                <div class="field-group">
                  <label class="field-label">Nombre / Razón social</label>
                  <input formControlName="nombre" type="text" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Teléfono{{ isCredito() ? ' *' : '' }} <span style="font-weight:400;color:#9CA3AF">{{ isCredito() ? '' : '(opcional)' }}</span></label>
                  <input formControlName="telefono" type="tel" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Email{{ isCredito() ? ' *' : '' }} <span style="font-weight:400;color:#9CA3AF">{{ isCredito() ? '' : '(opcional)' }}</span></label>
                  <input formControlName="email" type="email" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Dirección{{ isCredito() ? ' *' : '' }} <span style="font-weight:400;color:#9CA3AF">{{ isCredito() ? '' : '(opcional)' }}</span></label>
                  <input formControlName="direccion" type="text" class="field-input" />
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Error de stock (validación frontend) -->
        @if (stockError()) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            {{ stockError() }}
          </div>
        }

        <!-- Errores de validación -->
        @if (form.errors?.['clienteRequeridoCredito'] && form.touched) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            Se requiere un cliente para ventas a crédito.
          </div>
        }
        @if (form.errors?.['facturaRequiereRuc'] && form.touched) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            La Factura requiere un cliente con RUC (11 dígitos).
          </div>
        }
        @if (form.errors?.['boletaNoAdmiteRuc'] && form.touched) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            La Boleta no admite RUC como documento.
          </div>
        }
        @if (ventaSvc.state().errorMessage) {
          <div class="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            {{ ventaSvc.state().errorMessage }}
          </div>
        }
      </form>
    </div>

    <!-- Botón fijo -->
    <div class="rv-footer">
      <button
        type="button"
        (click)="submit()"
        [disabled]="ventaSvc.state().isSaving || carritoSvc.count() === 0"
        class="btn-primary w-full"
      >
        @if (ventaSvc.state().isSaving) {
          <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
          Enviando...
        } @else {
          Enviar venta
        }
      </button>
    </div>
  `,
})
export class ResumenComponent implements OnInit, OnDestroy {
  readonly carritoSvc = inject(CarritoService);
  readonly resumenSvc = inject(ResumenVentaService);
  readonly ventaSvc = inject(VentaService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly tipoVentaValues = TIPO_VENTA_VALUES;
  readonly metodoPagoValues = METODO_PAGO_VALUES;
  readonly tipoComprobanteValues = TIPO_COMPROBANTE_VALUES;
  readonly getTipoVentaLabel = getTipoVentaLabel;
  readonly getMetodoPagoLabel = getMetodoPagoLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;

  readonly resumenExpandido = signal(true);
  readonly stockError = signal<string | null>(null);

  // Señales que reflejan los valores del formulario reactivo
  // (computed() NO rastrea valores de ReactiveForm, solo signals)
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
    { validators: ventaFormValidator },
  );

  private subs: Subscription[] = [];

  ngOnInit(): void {
    const saved = this.resumenSvc.state();

    // Inicializar señales con el estado guardado
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

    // Actualizar señales cuando cambia el formulario
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

    // Validador RUC dinámico
    this.subs.push(
      tipoDocCtrl.valueChanges.subscribe(tipo => {
        if (tipo === '6') {
          numDocCtrl.setValidators([rucValidator()]);
        } else {
          numDocCtrl.clearValidators();
        }
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

    // Persistir estado mientras el usuario edita
    this.subs.push(
      this.form.valueChanges.subscribe(val => {
        const cn = val['clienteNuevo'] ?? {};
        this.resumenSvc.actualizar({
          tipoVenta: val['tipoVenta'] ?? 'NORMAL',
          metodoPago: val['metodoPago'] ?? 'EFECTIVO',
          tipoComprobante: val['tipoComprobante'] || null,
          clienteId: val['clienteId'] ?? null,
          usarClienteNuevo: val['usarClienteNuevo'] ?? false,
          clienteNuevo: {
            tipoDocumento: (cn['tipoDocumento'] as string) ?? '1',
            numeroDocumento: (cn['numeroDocumento'] as string) ?? '',
            nombre: (cn['nombre'] as string) ?? '',
            email: (cn['email'] as string) || undefined,
            telefono: (cn['telefono'] as string) || undefined,
            direccion: (cn['direccion'] as string) || undefined,
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

  setUsarClienteNuevo(value: boolean): void {
    this.form.patchValue({ usarClienteNuevo: value });
    if (!value) {
      this.form.patchValue({ clienteId: null });
    }
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
    if (this.form.invalid || this.carritoSvc.count() === 0) return;
    const insuficientes = this.carritoSvc.items().filter(i => i.cantidad > i.stockDisponible);
    if (insuficientes.length > 0) {
      this.stockError.set(
        `Stock insuficiente: ${insuficientes.map(i => `${i.nombre} (disp: ${i.stockDisponible})`).join(', ')}`,
      );
      return;
    }
    this.stockError.set(null);
    this.ventaSvc.clearMessages();
    const venta = await this.ventaSvc.crearVenta();
    if (!venta) return;
    if (venta.propuestaSunat.length > 0) {
      void this.router.navigate(['/ventas/propuesta-sunat']);
    } else {
      void this.router.navigate(['/ventas/comprobante']);
    }
  }
}
