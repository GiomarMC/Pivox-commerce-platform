import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
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
  selector: 'app-servicio',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet, ServicioFlowHeaderComponent, ClienteSearchComponent],
  styles: [`
    /* ── Desktop: host llena .main-content via flexbox ── */
    @media (min-width: 1024px) {
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      app-servicio-flow-header { flex-shrink: 0; }
    }

    /* ── Wrap ── */
    .sv-wrap { max-width: 1400px; padding-bottom: 7rem; }
    .sv-layout { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }

    /* ── Panel (solo desktop) ── */
    .sv-panel { display: none; }

    @media (min-width: 1024px) {
      .sv-wrap {
        flex: 1; min-height: 0; overflow: hidden;
        display: flex; flex-direction: column; padding-bottom: 1rem;
      }
      .sv-layout {
        grid-template-columns: 1fr 360px;
        gap: 1.5rem; align-items: stretch; flex: 1; min-height: 0;
      }
      .sv-panel {
        display: flex; flex-direction: column; overflow: hidden;
        background: #F4F6FB; border: 1px solid #E2E6F0;
        border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.06);
      }
      .sv-catalog {
        overflow-y: auto; min-height: 0;
        scrollbar-width: thin; scrollbar-color: #E2E6F0 transparent;
      }
    }

    /* ── Card body (padding interno para columna izquierda) ── */
    .sv-card-body { padding: 1.25rem 1.5rem; }

    /* ── Card Total (horizontal: label izq / input der) ── */
    .sv-total-card {
      background: #fff;
      border: 1px solid #D1D5DB;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    /* ── 3 zonas del panel ── */
    .panel-zone-top { flex-shrink: 0; padding: 0.875rem 1rem 0; }
    .panel-zone-middle { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
    .panel-step-content {
      flex: 1; min-height: 0; overflow-y: auto;
      padding: 0.625rem 0.875rem 1rem;
      display: flex; flex-direction: column; gap: 1rem;
      scrollbar-width: thin; scrollbar-color: #E2E6F0 transparent;
    }
    .panel-zone-bottom { flex-shrink: 0; padding: 0 0.875rem 1rem; }

    /* ── Panel cards (blancas) ── */
    .panel-card { background: #fff; border: 1px solid #E2E6F0; border-radius: 14px; }

    /* ── Panel section header ── */
    .panel-section { padding: 1rem 1.125rem 0.875rem; }
    .panel-section-title {
      font-size: 0.68rem; font-weight: 700; color: #6B7280;
      text-transform: uppercase; letter-spacing: 0.06em;
      margin: 0 0 0.625rem; display: flex; align-items: center; gap: 0.35rem;
    }

    /* ── Total y botón registrar ── */
    .panel-total-section { padding: 1rem 1rem 0.875rem; }
    .panel-total-row {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 0.75rem;
    }
    .panel-total-label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .panel-total-value { font-size: 1.4rem; font-weight: 800; color: #1F2A7C; letter-spacing: -0.02em; }

    /* ── Toggle cliente ── */
    .rv-toggle { display: flex; border: 1.5px solid #E2E6F0; border-radius: 9px; overflow: hidden; background: #F9FAFB; }
    .rv-toggle-btn { flex: 1; padding: 0.4rem 0; font-size: 0.78rem; font-weight: 600; color: #6B7280; background: none; border: none; cursor: pointer; transition: background 0.15s, color 0.15s; font-family: inherit; }
    .rv-toggle-btn-active { background: #1F2A7C; color: #fff; border-radius: 7px; }

    /* ── Float bar (móvil) ── */
    .sv-float-bar {
      position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%);
      width: calc(100% - 2rem); max-width: 480px;
      background: #1F2A7C; color: #fff;
      border-radius: 14px; padding: 0.875rem 1.25rem;
      display: flex; justify-content: space-between; align-items: center;
      z-index: 20; cursor: pointer;
      box-shadow: 0 4px 20px rgba(31,42,124,0.35);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .sv-float-bar:hover { transform: translateX(-50%) translateY(-2px); box-shadow: 0 6px 24px rgba(31,42,124,0.4); }
    @media (min-width: 1024px) { .sv-float-bar { display: none; } }

    /* ── Bottom sheet (móvil) ── */
    .sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 49; }
    .sheet-panel {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
      height: 85dvh; background: #F4F6FB;
      border-radius: 20px 20px 0 0; display: flex; flex-direction: column; overflow: hidden;
    }
    .sheet-handle {
      width: 36px; height: 4px; background: #D1D5DB; border-radius: 2px;
      margin: 0.625rem auto 0; flex-shrink: 0;
    }
    @media (min-width: 1024px) { .sheet-backdrop, .sheet-panel { display: none; } }

    /* ── Chips (overrides del global para usar paleta navy de la app) ── */
    .chip {
      padding: 0.35rem 0.875rem;
      border-radius: 8px;
      border: 1.5px solid #E2E6F0;
      background: #fff;
      font-size: 0.78rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }
    .chip:not(.chip-active):hover { border-color: #1F2A7C; color: #1F2A7C; }
    .chip-active:hover { background: #17206a; border-color: #17206a; }
    .chip-active { background: #1F2A7C; color: #fff; border-color: #1F2A7C; }
  `],
  template: `
    <app-servicio-flow-header [currentStep]="1" />

    <div class="page-content sv-wrap">
      <div class="sv-layout">

        <!-- Columna izquierda: Detalles del servicio -->
        <div class="sv-catalog">
          <form [formGroup]="formDetalle" style="display:flex;flex-direction:column;gap:1.25rem">

            <div class="card">
              <div class="sv-card-body">
                <p class="section-title">Nuevo servicio</p>
                <div class="field-group">
                  <label class="field-label">Descripción</label>
                  <textarea
                    formControlName="descripcion"
                    rows="4"
                    placeholder="Describe el servicio realizado..."
                    class="field-textarea"
                  ></textarea>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="sv-card-body">
                <p class="section-title">Período del servicio</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                  <div class="field-group">
                    <label class="field-label">Fecha inicio <span style="color:#DC2626">*</span></label>
                    <input type="date" formControlName="fechaInicio" class="field-input" />
                    @if (formDetalle.get('fechaInicio')?.invalid && formDetalle.get('fechaInicio')?.touched) {
                      <p class="field-error">Requerido</p>
                    }
                  </div>
                  <div class="field-group">
                    <label class="field-label">Fecha fin <span style="color:#DC2626">*</span></label>
                    <input type="date" formControlName="fechaFin" class="field-input" />
                    @if (formDetalle.get('fechaFin')?.invalid && formDetalle.get('fechaFin')?.touched) {
                      <p class="field-error">Requerido</p>
                    }
                  </div>
                </div>
                @if (formDetalle.errors?.['fechaFinAnterior'] && formDetalle.touched) {
                  <p class="field-error" style="margin-top:0.5rem">La fecha fin debe ser posterior a la fecha inicio</p>
                }
              </div>
            </div>

            <div class="sv-total-card">
              <div>
                <label class="field-label">Total del servicio <span style="color:#DC2626">*</span></label>
                @if (formDetalle.get('total')?.errors?.['required'] && formDetalle.get('total')?.touched) {
                  <p class="field-error">Requerido</p>
                }
                @if (formDetalle.get('total')?.errors?.['min'] && formDetalle.get('total')?.touched) {
                  <p class="field-error">Debe ser mayor a 0</p>
                }
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0">
                <span style="font-size:1rem;font-weight:600;color:#6B7280">S/</span>
                <input type="number" formControlName="total" step="0.01" min="0.01" placeholder="0.00"
                  class="field-input" style="width:130px;text-align:right;font-size:1.1rem;font-weight:700;color:#111827" />
              </div>
            </div>

          </form>
        </div>

        <!-- Columna derecha: Panel desktop -->
        <div class="sv-panel">
          <ng-container *ngTemplateOutlet="panelContent" />
        </div>

      </div>
    </div>

    <!-- Float bar móvil -->
    <div class="sv-float-bar" (click)="mostrarSheet.set(true)">
      <div style="display:flex;flex-direction:column">
        <span style="font-size:0.8rem;font-weight:600;opacity:0.85">Configurar servicio</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem">
        @if (formDetalle.get('total')?.value) {
          <span style="font-size:1.05rem;font-weight:800">S/ {{ formDetalle.get('total')?.value }}</span>
        }
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>

    <!-- Bottom sheet móvil -->
    @if (mostrarSheet()) {
      <div class="sheet-backdrop" (click)="mostrarSheet.set(false)">
        <div class="sheet-panel" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>
          <ng-container *ngTemplateOutlet="panelContent" />
        </div>
      </div>
    }

    <!-- ng-template compartido: panel desktop + bottom sheet -->
    <ng-template #panelContent>

      <!-- ZONA TOP: Tipo de servicio -->
      <div class="panel-zone-top">
        <div class="panel-card">
          <div class="panel-section">
            <p class="panel-section-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Tipo de servicio
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:0.625rem">
              @for (v of tipoVentaValues; track v) {
                <button type="button" (click)="seleccionarTipoVenta(v)" [class]="chipClass(tipoVenta() === v)">
                  {{ getTipoVentaLabel(v) }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- ZONA MIDDLE: scrollable -->
      <div class="panel-zone-middle">
        <div class="panel-step-content">
          <form [formGroup]="formConfig" style="display:flex;flex-direction:column;gap:1rem">

            <!-- Método de pago -->
            @if (!isCredito()) {
              <div class="panel-card">
                <div class="panel-section">
                  <p class="panel-section-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
                      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Método de pago
                  </p>
                  <div style="display:flex;flex-wrap:wrap;gap:0.625rem">
                    @for (v of metodoPagoValues; track v) {
                      <button type="button" (click)="formConfig.patchValue({ metodoPago: v })" [class]="chipClass(metodoPago() === v)">
                        {{ getMetodoPagoLabel(v) }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Tipo de comprobante -->
            @if (isSunat()) {
              <div class="panel-card">
                <div class="panel-section">
                  <p class="panel-section-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Tipo de comprobante
                  </p>
                  <div style="display:flex;flex-wrap:wrap;gap:0.625rem">
                    @for (v of tipoComprobanteValues; track v) {
                      <button type="button" (click)="formConfig.patchValue({ tipoComprobante: v })" [class]="chipClass(tipoComprobante() === v)">
                        {{ getTipoComprobanteLabel(v) }}
                      </button>
                    }
                  </div>
                  @if (formConfig.get('tipoComprobante')?.invalid && formConfig.get('tipoComprobante')?.touched) {
                    <p style="font-size:0.75rem;color:#DC2626;margin:0.5rem 0 0">Requerido para SUNAT</p>
                  }
                </div>
              </div>
            }

            <!-- Cliente -->
            @if (isCredito() || isSunat()) {
              <div class="panel-card">
                <div style="padding:1rem 1.125rem 0.5rem;display:flex;align-items:center;gap:0.5rem">
                  <div style="width:28px;height:28px;border-radius:8px;background:#F3E8FF;color:#7C3AED;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <span style="font-size:0.82rem;font-weight:700;color:#111827">Cliente</span>
                  <span style="font-size:0.72rem;color:#9CA3AF">{{ clienteObligatorio() ? '(obligatorio)' : '(opcional)' }}</span>
                </div>
                <div class="panel-section">
                  <div class="rv-toggle" style="margin-bottom:1rem">
                    <button type="button"
                      [class]="'rv-toggle-btn' + (!formConfig.get('usarClienteNuevo')?.value ? ' rv-toggle-btn-active' : '')"
                      (click)="setUsarClienteNuevo(false)"
                    >Cliente existente</button>
                    <button type="button"
                      [class]="'rv-toggle-btn' + (formConfig.get('usarClienteNuevo')?.value ? ' rv-toggle-btn-active' : '')"
                      (click)="setUsarClienteNuevo(true)"
                    >Nuevo cliente</button>
                  </div>

                  @if (!formConfig.get('usarClienteNuevo')?.value) {
                    <app-cliente-search
                      [tipoComprobante]="tipoComprobante()"
                      (clienteSeleccionado)="onClienteSeleccionado($event)"
                      (limpiar)="onLimpiarCliente()"
                    />
                  } @else {
                    <div formGroupName="clienteNuevo" style="display:flex;flex-direction:column;gap:0.875rem">
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
                        @if (formConfig.get('clienteNuevo.numeroDocumento')?.errors?.['invalidRuc']) {
                          <p style="font-size:0.72rem;color:#DC2626;margin:0.25rem 0 0">RUC debe tener 11 dígitos</p>
                        }
                      </div>
                      <div class="field-group">
                        <label class="field-label">Nombre / Razón social</label>
                        <input formControlName="nombre" type="text" class="field-input" />
                      </div>
                      <div class="field-group">
                        <label class="field-label">Teléfono <span style="font-weight:400;color:#9CA3AF">(opcional)</span></label>
                        <input formControlName="telefono" type="tel" class="field-input" />
                      </div>
                      <div class="field-group">
                        <label class="field-label">Email <span style="font-weight:400;color:#9CA3AF">(opcional)</span></label>
                        <input formControlName="email" type="email" class="field-input" />
                      </div>
                      <div class="field-group">
                        <label class="field-label">Dirección <span style="font-weight:400;color:#9CA3AF">(opcional)</span></label>
                        <input formControlName="direccion" type="text" class="field-input" />
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Error banners -->
            @if (formConfig.errors?.['clienteRequerido'] && formConfig.touched) {
              <div class="error-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                </svg>
                Se requiere un cliente para servicios a crédito.
              </div>
            }
            @if (formConfig.errors?.['clienteFacturaRequerido'] && formConfig.touched) {
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
        </div>
      </div>

      <!-- ZONA BOTTOM: Total + Registrar -->
      <div class="panel-zone-bottom">
        <div class="panel-total-section">
          <div class="panel-total-row">
            <span class="panel-total-label">Total</span>
            <span class="panel-total-value">S/ {{ formDetalle.get('total')?.value ?? '0.00' }}</span>
          </div>
          <button type="button" (click)="registrar()" [disabled]="servicioSvc.state().isSaving" class="btn-primary w-full">
            @if (servicioSvc.state().isSaving) {
              <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
              Enviando...
            } @else {
              Registrar servicio
            }
          </button>
        </div>
      </div>

    </ng-template>
  `,
})
export class ServicioComponent implements OnInit, OnDestroy {
  readonly servicioSvc = inject(ServicioService);
  readonly resumenSvc  = inject(ResumenServicioService);
  readonly formSvc     = inject(ServicioFormService);
  private readonly fb  = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly tipoVentaValues       = TIPO_VENTA_VALUES;
  readonly metodoPagoValues      = METODO_PAGO_VALUES;
  readonly tipoComprobanteValues = TIPO_COMPROBANTE_VALUES;
  readonly getTipoVentaLabel     = getTipoVentaLabel;
  readonly getMetodoPagoLabel    = getMetodoPagoLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;

  private readonly _tipoVenta       = signal('NORMAL');
  private readonly _metodoPago      = signal('EFECTIVO');
  private readonly _tipoComprobante = signal('');

  readonly tipoVenta       = this._tipoVenta.asReadonly();
  readonly metodoPago      = this._metodoPago.asReadonly();
  readonly tipoComprobante = this._tipoComprobante.asReadonly();

  readonly isSunat  = computed(() => this._tipoVenta() === 'SUNAT');
  readonly isCredito = computed(() => this._tipoVenta() === 'CREDITO');
  readonly clienteObligatorio = computed(() =>
    this.isCredito() || (this.isSunat() && this._tipoComprobante() === '01'),
  );

  readonly mostrarSheet = signal(false);

  formDetalle = this.fb.group(
    {
      descripcion: [''],
      fechaInicio: ['', Validators.required],
      fechaFin:    ['', Validators.required],
      total: [null as number | null, [Validators.required, Validators.min(0.01)]],
    },
    { validators: this.fechaFinValidator },
  );

  formConfig = this.fb.group(
    {
      tipoVenta:       ['NORMAL', Validators.required],
      metodoPago:      ['EFECTIVO', Validators.required],
      tipoComprobante: [''],
      clienteId:       [null as number | null],
      usarClienteNuevo: [false],
      clienteNuevo: this.fb.group({
        tipoDocumento:   ['1'],
        numeroDocumento: [''],
        nombre:          [''],
        telefono:        [''],
        email:           [''],
        direccion:       [''],
      }),
    },
    { validators: this.servicioFormValidator },
  );

  private subs: Subscription[] = [];

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.mostrarSheet.set(false);
  }

  ngOnInit(): void {
    const savedDetalle = this.formSvc.state();
    this.formDetalle.patchValue({
      descripcion: savedDetalle.descripcion,
      fechaInicio: savedDetalle.fechaInicio,
      fechaFin:    savedDetalle.fechaFin,
      total: savedDetalle.total ? (parseFloat(savedDetalle.total) || null) : null,
    });

    const savedConfig = this.resumenSvc.state();
    this._tipoVenta.set(savedConfig.tipoVenta);
    this._metodoPago.set(savedConfig.metodoPago);
    this._tipoComprobante.set(savedConfig.tipoComprobante ?? '');
    this.formConfig.patchValue({
      tipoVenta:        savedConfig.tipoVenta,
      metodoPago:       savedConfig.metodoPago,
      tipoComprobante:  savedConfig.tipoComprobante ?? '',
      clienteId:        savedConfig.clienteId,
      usarClienteNuevo: savedConfig.usarClienteNuevo,
    });

    const tipoDocCtrl  = this.formConfig.get('clienteNuevo.tipoDocumento')!;
    const numDocCtrl   = this.formConfig.get('clienteNuevo.numeroDocumento')!;
    const tipoCompCtrl = this.formConfig.get('tipoComprobante')!;

    this.subs.push(
      this.formDetalle.valueChanges.subscribe(val => {
        this.formSvc.actualizar({
          descripcion: val['descripcion'] ?? '',
          fechaInicio: val['fechaInicio'] ?? '',
          fechaFin:    val['fechaFin'] ?? '',
          total:       val['total'] != null ? String(val['total']) : '',
        });
      }),
    );

    this.subs.push(
      this.formConfig.get('tipoVenta')!.valueChanges.subscribe(v => {
        this._tipoVenta.set(v ?? 'NORMAL');
      }),
    );
    this.subs.push(
      this.formConfig.get('metodoPago')!.valueChanges.subscribe(v => {
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
      this.formConfig.get('tipoVenta')!.valueChanges.subscribe(tipo => {
        if (tipo === 'SUNAT') {
          tipoCompCtrl.setValidators([Validators.required]);
        } else {
          tipoCompCtrl.clearValidators();
          this.formConfig.patchValue({ tipoComprobante: '' });
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
      this.formConfig.valueChanges.subscribe(val => {
        const cnVal = val['clienteNuevo'] as Record<string, string> | null;
        this.resumenSvc.actualizar({
          tipoVenta:        val['tipoVenta'] ?? 'NORMAL',
          metodoPago:       val['metodoPago'] ?? 'EFECTIVO',
          tipoComprobante:  val['tipoComprobante'] || null,
          clienteId:        val['clienteId'] ?? null,
          usarClienteNuevo: val['usarClienteNuevo'] ?? false,
          clienteNuevo: {
            tipoDocumento:   cnVal?.['tipoDocumento'] ?? '1',
            numeroDocumento: cnVal?.['numeroDocumento'] ?? '',
            nombre:          cnVal?.['nombre'] ?? '',
            telefono:        cnVal?.['telefono'] ?? '',
            email:           cnVal?.['email'] ?? '',
            direccion:       cnVal?.['direccion'] ?? '',
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
    this.formConfig.patchValue({ tipoVenta: v, tipoComprobante: '' });
  }

  setUsarClienteNuevo(value: boolean): void {
    this.formConfig.patchValue({ usarClienteNuevo: value });
    if (!value) this.formConfig.patchValue({ clienteId: null });
  }

  onClienteSeleccionado(cliente: ClienteModel): void {
    this.resumenSvc.seleccionarCliente(cliente);
    this.formConfig.patchValue({ clienteId: cliente.id, usarClienteNuevo: false });
  }

  onLimpiarCliente(): void {
    this.formConfig.patchValue({ clienteId: null });
    this.resumenSvc.actualizar({ clienteId: null, clienteNombre: null });
  }

  private fechaFinValidator(group: import('@angular/forms').AbstractControl): import('@angular/forms').ValidationErrors | null {
    const inicio = group.get('fechaInicio')?.value as string;
    const fin    = group.get('fechaFin')?.value as string;
    if (inicio && fin && fin < inicio) return { fechaFinAnterior: true };
    return null;
  }

  private servicioFormValidator(group: import('@angular/forms').AbstractControl): import('@angular/forms').ValidationErrors | null {
    const tipo           = group.get('tipoVenta')?.value as string;
    const tipoComprobante = group.get('tipoComprobante')?.value as string;
    const clienteId      = group.get('clienteId')?.value as number | null;
    const usarNuevo      = group.get('usarClienteNuevo')?.value as boolean;
    const nombre         = group.get('clienteNuevo.nombre')?.value as string;
    const tieneCliente   = clienteId != null || (usarNuevo && nombre?.trim());

    if (tipo === 'CREDITO' && !tieneCliente) return { clienteRequerido: true };
    if (tipo === 'SUNAT' && tipoComprobante === '01' && !tieneCliente) return { clienteFacturaRequerido: true };
    return null;
  }

  async registrar(): Promise<void> {
    this.formDetalle.markAllAsTouched();
    if (this.formDetalle.invalid) return;
    this.formConfig.markAllAsTouched();
    if (this.formConfig.invalid) return;
    this.servicioSvc.clearMessages();
    const servicio = await this.servicioSvc.crearServicio();
    if (servicio) {
      this.mostrarSheet.set(false);
      void this.router.navigate(['/servicios/comprobante']);
    }
  }
}
