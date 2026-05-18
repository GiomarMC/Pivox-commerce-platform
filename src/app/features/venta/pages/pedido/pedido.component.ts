import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { CarritoService } from '../../carrito.service';
import { InventarioService } from '../../../inventario/inventario.service';
import { ResumenVentaService } from '../../resumen-venta.service';
import { VentaService } from '../../venta.service';
import { CarritoItem } from '../../models/carrito.model';
import { ClienteModel } from '../../models/cliente.model';
import { LoteProductoResponse } from '../../../inventario/models/lote.model';
import { FlowHeaderComponent } from '../../components/flow-header/flow-header.component';
import { ClienteSearchComponent } from '../../components/cliente-search/cliente-search.component';
import { METODO_PAGO_VALUES, getMetodoPagoLabel } from '../../constants/metodo-pago';
import { TIPO_COMPROBANTE_VALUES, getTipoComprobanteLabel } from '../../constants/tipo-comprobante';
import { ventaFormValidator, rucValidator, noRucEnBoletaValidator } from '../../validators/venta.validators';

interface ModalLoteData {
  item: CarritoItem;
  idx: number;
}

interface LoteOpcion {
  id: number | null;
  fecha: string;
  conFactura: boolean;
  stock: number;
}

@Component({
  selector: 'app-pedido',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FlowHeaderComponent, ClienteSearchComponent, DecimalPipe],
  styles: [`
    .cart-item { background:#fff; border:1px solid #EEF1F6; border-radius: 16px; padding:1rem; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .cart-item-averiado { background:#FFFBEB; border-color:#FCD34D; }
    .item-img { width:56px; height:56px; border-radius: 16px; object-fit:cover; flex-shrink:0; }
    .item-img-ph { width:56px; height:56px; border-radius: 16px; background:#F8FAFC; border:1px solid #EEF1F6; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .item-del { width:28px; height:28px; border-radius: 14px; background:#FEF2F2; border:none; display:flex; align-items:center; justify-content:center; color:#EF4444; cursor:pointer; flex-shrink:0; transition:background 0.12s; }
    .item-del:hover { background:#EF4444; }
    .lote-chip { display:inline-flex; align-items:center; gap:0.35rem; margin-top:0.35rem; padding:0.25rem 0.6rem; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:20px; font-size:0.7rem; font-weight:600; color:#6366F1; cursor:pointer; transition:background 0.12s; }
    .lote-chip:hover { background:#E0E7FF; }
    .averiado-chip { display:inline-flex; align-items:center; gap:0.35rem; margin-top:0.35rem; padding:0.2rem 0.6rem; background:#FFFBEB; border:1px solid #FCD34D; border-radius:20px; font-size:0.7rem; font-weight:600; color:#F59E0B; }
    .qty-btn { width:28px; height:28px; border-radius:50%; border:1px solid #EEF1F6; background:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; cursor:pointer; color:#334155; transition:border-color 0.12s, background 0.12s; line-height:1; }
    .qty-btn:hover { border-color:#334155; background:#F0F2FF; }
    .qty-input { width:60px; padding:0.35rem 0.25rem; font-size:0.85rem; border:1px solid #EEF1F6; border-radius: 14px; text-align:center; outline:none; }
    .qty-input:focus { border-color:#334155; }
    .price-input { width:90px; padding:0.35rem 0.5rem; font-size:0.85rem; border:1px solid #EEF1F6; border-radius: 14px; outline:none; }
    .price-input:focus { border-color:#334155; }
    .lote-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:60; display:flex; align-items:flex-end; justify-content:center; }
    .lote-modal-sheet { background:#fff; border-radius:20px 20px 0 0; width:100%; max-width:480px; padding:1.25rem; max-height:72dvh; overflow-y:auto; }
    .lote-option { width:100%; text-align:left; padding:0.875rem; border-radius: 16px; border:1.5px solid #EEF1F6; background:#fff; cursor:pointer; transition:border-color 0.12s, background 0.12s; margin-bottom:0.5rem; font-family:inherit; }
    .lote-option:hover { border-color:#334155; background:#F8FAFC; }
    .lote-option-active-green { border-color:#10B981; background:#ECFDF5; }
    .lote-option-active-navy { border-color:#334155; background:#EEF2FF; }
    .lote-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:3px; }
    .dot-green { background:#10B981; }
    .dot-navy { background:#334155; }
    .dot-zinc { background:#CBD5E1; border:1px solid #94A3B8; }
    .rv-section { background:#fff; border:1px solid #EEF1F6; border-radius: 16px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .rv-section-header { display:flex; align-items:center; gap:0.625rem; padding:0.875rem 1rem; border-bottom:1px solid #EEF1F6; }
    .rv-section-icon { width:32px; height:32px; border-radius: 14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .rv-section-body { padding:1rem; }
    .rv-toggle { display:flex; border:1.5px solid #EEF1F6; border-radius: 14px; overflow:hidden; margin-bottom:0.875rem; }
    .rv-toggle-btn { flex:1; padding:0.5rem 0.75rem; font-size:0.8rem; font-weight:600; border:none; cursor:pointer; transition:background 0.12s, color 0.12s; font-family:inherit; background:#fff; color:#64748B; }
    .rv-toggle-btn-active { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: #fff; }
    .pedido-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #EEF1F6; padding:1rem; z-index:20; }
    .pedido-page { max-width:1200px; }
    .pedido-layout { display:flex; flex-direction:column; gap:0.875rem; }
    .pedido-left { display:flex; flex-direction:column; gap:0.875rem; }
    .pedido-right { display:flex; flex-direction:column; gap:0.875rem; }
    .pedido-desktop-pagar { display:none; }

    @media (min-width:1024px) {
      .pedido-page { padding-bottom:2rem; }
      .pedido-layout { display:grid; grid-template-columns:1fr 380px; gap:1.5rem; align-items:start; }
      .pedido-footer { display:none; }
      .pedido-desktop-pagar { display:block; }
      .pedido-right { position:sticky; top:1rem; }
    }
  `],
  template: `
    <app-flow-header [currentStep]="3" />

    <div class="page-content pedido-page pb-32" style="display:flex;flex-direction:column;gap:0.875rem">

      @if (carritoSvc.items().length === 0) {
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5">
              <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
          </div>
          <p class="empty-title">Carrito vacío</p>
          <p class="empty-desc">Agrega productos desde el catálogo</p>
          <a routerLink="/ventas/catalogo" class="btn-primary" style="margin-top:1rem;text-decoration:none;display:inline-flex">
            Ir al catálogo
          </a>
        </div>
      } @else {

        <div class="pedido-layout">
        <div class="pedido-left">
        <!-- ── Sección Productos ── -->
        <div class="rv-section">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border-bottom:1px solid #EEF1F6">
            <div style="display:flex;align-items:center;gap:0.625rem">
              <div class="rv-section-icon" style="background:#EEF2FF;color:#334155">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                </svg>
              </div>
              <span style="font-size:0.875rem;font-weight:700;color:#334155">Productos</span>
              <span style="font-size:0.72rem;color:#94A3B8">({{ carritoSvc.items().length }})</span>
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem">
              <span style="font-size:0.95rem;font-weight:800;color:#334155">S/ {{ carritoSvc.total() | number:'1.2-2' }}</span>
              <a routerLink="/ventas/catalogo" style="font-size:0.75rem;font-weight:600;color:#334155;text-decoration:none;padding:0.3rem 0.75rem;border:1.5px solid #C7D2FE;border-radius: 14px;background:#EEF2FF">+ Agregar</a>
            </div>
          </div>
          <div style="padding:0.875rem;display:flex;flex-direction:column;gap:0.625rem">
            @for (item of carritoSvc.items(); track item.productoId + '-' + item.esAveriado; let idx = $index) {
              <div [class]="'cart-item' + (item.esAveriado ? ' cart-item-averiado' : '')">
                <div style="display:flex;align-items:flex-start;gap:0.75rem">
                  @if (item.imagen) {
                    <img [src]="item.imagen" [alt]="item.nombre" class="item-img" />
                  } @else {
                    <div class="item-img-ph">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5">
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                        <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
                      </svg>
                    </div>
                  }
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem">
                      <p style="font-size:0.875rem;font-weight:700;color:#334155;line-height:1.3;margin:0">{{ item.nombre }}</p>
                      <button type="button" (click)="eliminar(item)" class="item-del" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <p style="font-size:0.7rem;color:#94A3B8;margin:0.15rem 0 0">{{ item.codigo }} · {{ item.unidadMedida }}</p>

                    <button type="button" (click)="abrirModalLote(item, idx)" class="lote-chip">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                      </svg>
                      {{ fechaLlegadaDelLote(item) ?? 'Automático' }}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>

                    @if (item.esAveriado) {
                      <div class="averiado-chip">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                        </svg>
                        Averiado
                        <button type="button" (click)="toggleAveriado(item, false)" title="Cambiar a normal"
                          style="margin-left:2px;background:none;border:none;cursor:pointer;color:#F59E0B;display:flex;align-items:center;padding:0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                @if (item.cantidad > item.stockDisponible) {
                  <p style="font-size:0.7rem;color:#EF4444;margin:0.2rem 0 0">
                    Stock insuficiente. Disponible: {{ item.stockDisponible | number:'1.0-3' }}
                  </p>
                }
                @if ((stockPorTipo().get(item.productoId)?.sinFactura ?? 0) > 0 &&
                     (stockPorTipo().get(item.productoId)?.conFactura ?? 0) > 0) {
                  <p style="font-size:0.68rem;color:#64748B;margin:0.15rem 0 0">
                    {{ stockPorTipo().get(item.productoId)?.conFactura | number:'1.0-3' }} c/factura ·
                    {{ stockPorTipo().get(item.productoId)?.sinFactura | number:'1.0-3' }} s/factura
                  </p>
                }
                @if (esSunat() && loteEsSinFactura(item)) {
                  <p style="font-size:0.68rem;color:#F59E0B;margin:0.15rem 0 0">
                    ⚠ Lote sin factura — SUNAT puede requerir sustitución
                  </p>
                }

                <div style="margin-top:0.875rem;display:flex;align-items:flex-end;gap:0.75rem">
                  <div style="display:flex;flex-direction:column;gap:0.3rem">
                    <label style="font-size:0.65rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.05em">Cantidad</label>
                    <div style="display:flex;align-items:center;gap:0.375rem">
                      <button type="button" (click)="decrementar(item)" class="qty-btn">−</button>
                      <input type="number" [value]="item.cantidad" (change)="onCantidadChange(item, $event)" min="0.001" step="0.001" class="qty-input" />
                      <button type="button" (click)="incrementar(item)" class="qty-btn" style="color:#334155">+</button>
                    </div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:0.3rem">
                    <label style="font-size:0.65rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.05em">Precio unit.</label>
                    <input type="number" [value]="item.precioUnitario" (change)="onPrecioChange(item, $event)" min="0" step="0.01" class="price-input" />
                  </div>
                  <div style="flex:1;text-align:right">
                    <p style="font-size:0.65rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.2rem">Subtotal</p>
                    <p style="font-size:1rem;font-weight:800;color:#334155;margin:0;letter-spacing:-0.01em">
                      S/ {{ (item.cantidad * item.precioUnitario) | number:'1.2-2' }}
                    </p>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
        </div><!-- /pedido-left -->

        <div class="pedido-right">
        <!-- ── Sección Pago ── -->
        <form [formGroup]="form" style="display:flex;flex-direction:column;gap:0.875rem">

          <!-- Método de pago (no aplica para crédito) -->
          @if (!isCredito()) {
            <div class="rv-section">
              <div class="rv-section-header">
                <div class="rv-section-icon" style="background:#FFFBEB;color:#F59E0B">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                </div>
                <span style="font-size:0.875rem;font-weight:700;color:#334155">Método de pago</span>
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
                <div class="rv-section-icon" style="background:#FEF2F2;color:#EF4444">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <span style="font-size:0.875rem;font-weight:700;color:#334155">Tipo de comprobante</span>
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
                  <p style="font-size:0.75rem;color:#EF4444;margin:0.5rem 0 0">Selecciona un tipo de comprobante</p>
                }
              </div>
            </div>
          }

          <!-- Cliente -->
          <div class="rv-section" style="overflow:visible">
            <div class="rv-section-header">
              <div class="rv-section-icon" style="background:#F3E8FF;color:#6366F1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <span style="font-size:0.875rem;font-weight:700;color:#334155">Cliente</span>
              <span style="font-size:0.72rem;color:#94A3B8;margin-left:0.25rem">
                {{ clienteObligatorio() ? '(obligatorio)' : '(opcional)' }}
              </span>
            </div>
            <div class="rv-section-body">
              <div class="rv-toggle">
                <button type="button" (click)="setUsarClienteNuevo(false)"
                  [class]="'rv-toggle-btn' + (!form.get('usarClienteNuevo')?.value ? ' rv-toggle-btn-active' : '')">
                  Cliente existente
                </button>
                <button type="button" (click)="setUsarClienteNuevo(true)"
                  [class]="'rv-toggle-btn' + (form.get('usarClienteNuevo')?.value ? ' rv-toggle-btn-active' : '')">
                  Nuevo cliente
                </button>
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
                      <p style="font-size:0.75rem;color:#EF4444;margin:0.3rem 0 0">RUC debe tener 11 dígitos</p>
                    }
                  </div>
                  <div class="field-group">
                    <label class="field-label">Nombre / Razón social</label>
                    <input formControlName="nombre" type="text" class="field-input" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Teléfono{{ isCredito() ? ' *' : '' }} <span style="font-weight:400;color:#94A3B8">{{ isCredito() ? '' : '(opcional)' }}</span></label>
                    <input formControlName="telefono" type="tel" class="field-input" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Email{{ isCredito() ? ' *' : '' }} <span style="font-weight:400;color:#94A3B8">{{ isCredito() ? '' : '(opcional)' }}</span></label>
                    <input formControlName="email" type="email" class="field-input" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Dirección{{ isCredito() ? ' *' : '' }} <span style="font-weight:400;color:#94A3B8">{{ isCredito() ? '' : '(opcional)' }}</span></label>
                    <input formControlName="direccion" type="text" class="field-input" />
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Errores -->
          @if (stockError()) {
            <div class="error-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              </svg>
              {{ stockError() }}
            </div>
          }
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

          <!-- PAGAR button — desktop right column only -->
          <div class="pedido-desktop-pagar">
            <button
              type="button"
              (click)="pagar()"
              [disabled]="ventaSvc.state().isSaving || hayStockInsuficiente()"
              class="btn-primary w-full"
              style="font-size:1rem;font-weight:800;letter-spacing:-0.01em"
            >
              @if (ventaSvc.state().isSaving) {
                <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
                Procesando…
              } @else {
                Pagar  S/ {{ carritoSvc.total() | number:'1.2-2' }}
              }
            </button>
          </div>

        </div><!-- /pedido-right -->
        </div><!-- /pedido-layout -->
      }
    </div>

    <!-- Botón fijo PAGAR -->
    @if (carritoSvc.items().length > 0) {
      <div class="pedido-footer">
        <button
          type="button"
          (click)="pagar()"
          [disabled]="ventaSvc.state().isSaving || hayStockInsuficiente()"
          class="btn-primary w-full"
          style="font-size:1rem;font-weight:800;letter-spacing:-0.01em"
        >
          @if (ventaSvc.state().isSaving) {
            <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
            Procesando…
          } @else {
            Pagar  S/ {{ carritoSvc.total() | number:'1.2-2' }}
          }
        </button>
      </div>
    }

    <!-- Modal selector de lote -->
    @if (modalLoteData()) {
      <div class="lote-modal-backdrop" (click)="modalLoteData.set(null)">
        <div class="lote-modal-sheet" (click)="$event.stopPropagation()">
          <p style="font-size:0.9rem;font-weight:700;color:#334155;margin:0 0 1rem;text-align:center">
            Lote · {{ modalLoteData()!.item.nombre }}
          </p>

          <button
            type="button"
            (click)="seleccionarLote(null)"
            [class]="'lote-option ' + (modalLoteData()!.item.loteProductoId === null ? 'lote-option-active-green' : '')"
          >
            <div style="display:flex;align-items:flex-start;gap:0.75rem">
              <div [class]="'lote-dot ' + (modalLoteData()!.item.loteProductoId === null ? 'dot-green' : 'dot-zinc')"></div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
                  <p style="font-size:0.85rem;font-weight:700;color:#10B981;margin:0">Automático (FIFO)</p>
                  <span [style]="'font-size:0.68rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:20px;' + (loteFifaConFactura() ? 'background:#ECFDF5;color:#10B981' : 'background:#FFFBEB;color:#F59E0B')">
                    {{ loteFifaConFactura() ? 'Con factura' : 'Sin factura' }}
                  </span>
                </div>
                <p style="font-size:0.72rem;color:#94A3B8;margin:0.2rem 0 0">Llegada: {{ loteFifaFecha() ?? 'N/A' }}</p>
              </div>
            </div>
          </button>

          @if (otrosLotes().length > 0) {
            <p style="font-size:0.68rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;margin:0.25rem 0 0.5rem">Otros lotes disponibles</p>
            @for (lote of otrosLotes(); track lote.id) {
              <button
                type="button"
                (click)="seleccionarLote(lote.id)"
                [class]="'lote-option ' + (modalLoteData()!.item.loteProductoId === lote.id ? 'lote-option-active-navy' : '')"
              >
                <div style="display:flex;align-items:flex-start;gap:0.75rem">
                  <div [class]="'lote-dot ' + (modalLoteData()!.item.loteProductoId === lote.id ? 'dot-navy' : 'dot-zinc')"></div>
                  <div style="flex:1">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
                      <p style="font-size:0.85rem;font-weight:700;color:#334155;margin:0">Llegada: {{ lote.fecha }}</p>
                      <span [style]="'font-size:0.68rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:20px;' + (lote.conFactura ? 'background:#ECFDF5;color:#10B981' : 'background:#FFFBEB;color:#F59E0B')">
                        {{ lote.conFactura ? 'Con factura' : 'Sin factura' }}
                      </span>
                    </div>
                    <p style="font-size:0.72rem;color:#94A3B8;margin:0.2rem 0 0">Stock: {{ lote.stock }}</p>
                  </div>
                </div>
              </button>
            }
          } @else {
            <p style="font-size:0.82rem;color:#94A3B8;text-align:center;padding:1rem 0">Solo disponible el lote automático</p>
          }
        </div>
      </div>
    }
  `,
})
export class PedidoComponent implements OnInit, OnDestroy {
  readonly carritoSvc = inject(CarritoService);
  private readonly inventarioSvc = inject(InventarioService);
  private readonly resumenSvc = inject(ResumenVentaService);
  readonly ventaSvc = inject(VentaService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly metodoPagoValues = METODO_PAGO_VALUES;
  readonly tipoComprobanteValues = TIPO_COMPROBANTE_VALUES;
  readonly getMetodoPagoLabel = getMetodoPagoLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;

  readonly stockError = signal<string | null>(null);
  readonly modalLoteData = signal<ModalLoteData | null>(null);

  private readonly _metodoPago = signal('EFECTIVO');
  private readonly _tipoComprobante = signal('');

  readonly metodoPago = this._metodoPago.asReadonly();
  readonly tipoComprobante = this._tipoComprobante.asReadonly();

  readonly isSunat = computed(() => this.resumenSvc.state().tipoVenta === 'SUNAT');
  readonly isCredito = computed(() => this.resumenSvc.state().tipoVenta === 'CREDITO');
  readonly esSunat = this.isSunat;

  readonly clienteObligatorio = computed(() =>
    this.isCredito() || (this.isSunat() && this._tipoComprobante() === '01'),
  );

  readonly stockPorTipo = computed(() => {
    const lotes = this.inventarioSvc.state().lotes;
    const map = new Map<number, { conFactura: number; sinFactura: number }>();
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        const cur = map.get(lp.producto) ?? { conFactura: 0, sinFactura: 0 };
        if (lp.conFactura) cur.conFactura += lp.cantidadDisponible;
        else cur.sinFactura += lp.cantidadDisponible;
        map.set(lp.producto, { ...cur });
      }
    }
    return map;
  });

  form = this.fb.group(
    {
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
    if (this.inventarioSvc.state().lotes.length === 0) {
      void this.inventarioSvc.cargarLotes();
    }

    const saved = this.resumenSvc.state();
    this._metodoPago.set(saved.metodoPago);
    this._tipoComprobante.set(saved.tipoComprobante ?? '');

    this.form.patchValue({
      metodoPago: saved.metodoPago,
      tipoComprobante: saved.tipoComprobante ?? '',
      clienteId: saved.clienteId,
      usarClienteNuevo: saved.usarClienteNuevo,
    });

    const tipoDocCtrl = this.form.get('clienteNuevo.tipoDocumento')!;
    const numDocCtrl = this.form.get('clienteNuevo.numeroDocumento')!;
    const tipoCompCtrl = this.form.get('tipoComprobante')!;

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
        if (tipo === '6') {
          numDocCtrl.setValidators([rucValidator()]);
        } else {
          numDocCtrl.clearValidators();
        }
        numDocCtrl.updateValueAndValidity();
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
        const cn = val['clienteNuevo'] ?? {};
        this.resumenSvc.actualizar({
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

    if (this.isSunat()) {
      tipoCompCtrl.setValidators([Validators.required]);
      tipoCompCtrl.updateValueAndValidity();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  chipClass(activo: boolean): string {
    return activo ? 'chip chip-active' : 'chip';
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

  hayStockInsuficiente(): boolean {
    return this.carritoSvc.items().some(i => i.cantidad > i.stockDisponible);
  }

  async pagar(): Promise<void> {
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

  // ── Lote modal ──

  readonly lotesParaModal = computed((): LoteProductoResponse[] => {
    const data = this.modalLoteData();
    if (!data) return [];
    const lotes = this.inventarioSvc.state().lotes;
    const result: LoteProductoResponse[] = [];
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.producto === data.item.productoId && lp.isActive && lp.cantidadDisponible > 0) {
          result.push(lp);
        }
      }
    }
    return result;
  });

  readonly loteFifo = computed(() => {
    const data = this.modalLoteData();
    if (!data) return null;
    const lotes = this.inventarioSvc.state().lotes;
    const matches: { fecha: string; lp: LoteProductoResponse }[] = [];
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.producto === data.item.productoId && lp.isActive) {
          matches.push({ fecha: lote.fechaLlegada, lp });
        }
      }
    }
    if (matches.length === 0) return null;
    matches.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { fecha: matches[0].fecha, conFactura: matches[0].lp.conFactura };
  });

  readonly loteFifaFecha = computed(() => this.loteFifo()?.fecha ?? null);
  readonly loteFifaConFactura = computed(() => this.loteFifo()?.conFactura ?? false);

  readonly otrosLotes = computed((): LoteOpcion[] => {
    const data = this.modalLoteData();
    if (!data) return [];
    const lotes = this.inventarioSvc.state().lotes;
    const result: LoteOpcion[] = [];
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.producto === data.item.productoId && lp.isActive && lp.cantidadDisponible > 0) {
          result.push({ id: lp.id, fecha: lote.fechaLlegada, conFactura: lp.conFactura, stock: lp.cantidadDisponible });
        }
      }
    }
    result.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return result;
  });

  loteEsSinFactura(item: CarritoItem): boolean {
    const lotes = this.inventarioSvc.state().lotes;
    if (item.loteProductoId === null) {
      let oldest: { fecha: string; conFactura: boolean } | null = null;
      for (const lote of lotes) {
        for (const lp of lote.productos) {
          if (lp.producto === item.productoId && lp.isActive && lp.cantidadDisponible > 0) {
            if (!oldest || lote.fechaLlegada < oldest.fecha) {
              oldest = { fecha: lote.fechaLlegada, conFactura: lp.conFactura };
            }
          }
        }
      }
      return oldest !== null && !oldest.conFactura;
    }
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.id === item.loteProductoId) return !lp.conFactura;
      }
    }
    return false;
  }

  fechaLlegadaDelLote(item: CarritoItem): string | null {
    const lotes = this.inventarioSvc.state().lotes;
    if (item.loteProductoId === null) {
      const matches: string[] = [];
      for (const lote of lotes) {
        for (const lp of lote.productos) {
          if (lp.producto === item.productoId && lp.isActive) {
            matches.push(lote.fechaLlegada);
          }
        }
      }
      if (matches.length === 0) return null;
      matches.sort();
      return matches[0];
    }
    for (const lote of lotes) {
      for (const lp of lote.productos) {
        if (lp.id === item.loteProductoId) return lote.fechaLlegada;
      }
    }
    return null;
  }

  abrirModalLote(item: CarritoItem, idx: number): void {
    this.modalLoteData.set({ item, idx });
  }

  seleccionarLote(loteId: number | null): void {
    const data = this.modalLoteData();
    if (!data) return;
    this.carritoSvc.actualizarLote(data.item.productoId, data.item.esAveriado, loteId);
    this.modalLoteData.set(null);
  }

  toggleAveriado(item: CarritoItem, valor: boolean): void {
    this.carritoSvc.actualizarAveriado(item.productoId, item.esAveriado, valor);
  }

  onCantidadChange(item: CarritoItem, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) this.carritoSvc.actualizarCantidad(item.productoId, item.esAveriado, val);
  }

  onPrecioChange(item: CarritoItem, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 0) this.carritoSvc.actualizarPrecio(item.productoId, item.esAveriado, val);
  }

  decrementar(item: CarritoItem): void {
    const nueva = item.cantidad - 1;
    if (nueva <= 0) {
      this.carritoSvc.eliminarItem(item.productoId, item.esAveriado);
    } else {
      this.carritoSvc.actualizarCantidad(item.productoId, item.esAveriado, nueva);
    }
  }

  incrementar(item: CarritoItem): void {
    this.carritoSvc.actualizarCantidad(item.productoId, item.esAveriado, item.cantidad + 1);
  }

  eliminar(item: CarritoItem): void {
    this.carritoSvc.eliminarItem(item.productoId, item.esAveriado);
  }
}
