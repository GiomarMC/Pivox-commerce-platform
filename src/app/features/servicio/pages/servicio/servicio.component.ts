import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Subscription } from 'rxjs';
import { ServicioService } from '../../servicio.service';
import { ResumenServicioService } from '../../resumen-servicio.service';
import { ServicioFormService } from '../../servicio-form.service';
import { TiendaService } from '../../../tienda/tienda.service';
import { ClienteModel } from '../../../venta/models/cliente.model';
import { ServicioReadModel } from '../../models/servicio-read.model';
import { ServicioFlowHeaderComponent } from '../../components/servicio-flow-header/servicio-flow-header.component';
import { ClienteSearchComponent } from '../../../venta/components/cliente-search/cliente-search.component';
import { TIPO_VENTA_VALUES, getTipoVentaLabel } from '../../../venta/constants/tipo-venta';
import { METODO_PAGO_VALUES, getMetodoPagoLabel } from '../../../venta/constants/metodo-pago';
import { TIPO_COMPROBANTE_VALUES, getTipoComprobanteLabel } from '../../../venta/constants/tipo-comprobante';
import { rucValidator, noRucEnBoletaValidator } from '../../../venta/validators/venta.validators';

@Component({
  selector: 'app-servicio',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet, RouterLink, DecimalPipe, ServicioFlowHeaderComponent, ClienteSearchComponent],
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
        background: #F8FAFC; border: 1px solid #EEF1F6;
        border-radius: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.06);
      }
      .sv-catalog {
        overflow-y: auto; min-height: 0;
        scrollbar-width: thin; scrollbar-color: #EEF1F6 transparent;
      }
    }

    /* ── Card body (padding interno para columna izquierda) ── */
    .sv-card-body { padding: 1.25rem 1.5rem; }

    /* ── Card Total (horizontal: label izq / input der) ── */
    .sv-total-card {
      background: #fff;
      border: 1px solid #CBD5E1;
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
      scrollbar-width: thin; scrollbar-color: #EEF1F6 transparent;
    }
    .panel-zone-bottom { flex-shrink: 0; padding: 0 0.875rem 1rem; }

    /* ── Panel cards (blancas) ── */
    .panel-card { background: #fff; border: 1px solid #EEF1F6; border-radius: 16px; }

    /* ── Panel section header ── */
    .panel-section { padding: 1rem 1.125rem 0.875rem; }
    .panel-section-title {
      font-size: 0.68rem; font-weight: 700; color: #64748B;
      text-transform: uppercase; letter-spacing: 0.06em;
      margin: 0 0 0.625rem; display: flex; align-items: center; gap: 0.35rem;
    }

    /* ── Total y botón registrar ── */
    .panel-total-section { padding: 1rem 1rem 0.875rem; }
    .panel-total-row {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 0.75rem;
    }
    .panel-total-label { font-size: 0.875rem; font-weight: 600; color: #334155; }
    .panel-total-value { font-size: 1.4rem; font-weight: 800; color: #334155; letter-spacing: -0.02em; }

    /* ── Toggle cliente ── */
    .rv-toggle { display: flex; border: 1.5px solid #EEF1F6; border-radius: 14px; overflow: hidden; background: #F8FAFC; }
    .rv-toggle-btn { flex: 1; padding: 0.4rem 0; font-size: 0.78rem; font-weight: 600; color: #64748B; background: none; border: none; cursor: pointer; transition: background 0.15s, color 0.15s; font-family: inherit; }
    .rv-toggle-btn-active { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: #fff; border-radius: 10px; }

    /* ── Float bar (móvil) ── */
    .sv-float-bar {
      position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%);
      width: calc(100% - 2rem); max-width: 480px;
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: #fff;
      border-radius: 16px; padding: 0.875rem 1.25rem;
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
      height: 85dvh; background: #F8FAFC;
      border-radius: 20px 20px 0 0; display: flex; flex-direction: column; overflow: hidden;
    }
    .sheet-handle {
      width: 36px; height: 4px; background: #CBD5E1; border-radius: 14px;
      margin: 0.625rem auto 0; flex-shrink: 0;
    }
    @media (min-width: 1024px) { .sheet-backdrop, .sheet-panel { display: none; } }

    /* ── Chips (overrides del global para usar paleta navy de la app) ── */
    .chip {
      padding: 0.35rem 0.875rem;
      border-radius: 14px;
      border: 1.5px solid #EEF1F6;
      background: #fff;
      font-size: 0.78rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }
    .chip:not(.chip-active):hover { border-color: #334155; color: #334155; }
    .chip-active:hover { background: #17206a; border-color: #17206a; }
    .chip-active { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: #fff; border-color: #334155; }

    /* ─── KPI strip (compacto) ─── */
    .sv-kpis {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.625rem;
      margin-bottom: 0.875rem;
    }
    .sv-kpi {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--color-rule-2);
      border-radius: var(--radius-lg);
      padding: 0.625rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      min-height: 3.25rem;
    }
    .sv-kpi-hero {
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      border-color: transparent;
      color: #FFFFFF;
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.25);
    }
    .sv-kpi-eyebrow {
      color: var(--color-ink-3);
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .sv-kpi-hero .sv-kpi-eyebrow { color: rgba(255, 255, 255, 0.78); }
    .sv-kpi-value {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.25rem;
      line-height: 1.05;
      letter-spacing: -0.025em;
      color: var(--color-ink-strong);
      font-feature-settings: 'tnum';
    }
    .sv-kpi-hero .sv-kpi-value { color: #FFFFFF; }
    .sv-kpi-pre {
      font-family: var(--font-mono);
      font-size: 0.6em;
      font-weight: 500;
      opacity: 0.55;
      margin-right: 0.25em;
      vertical-align: 0.4em;
    }
    @media (max-width: 539px) {
      .sv-kpi-value { font-size: 1.0625rem; }
      .sv-kpi { padding: 0.5rem 0.75rem; min-height: 2.875rem; }
    }

    /* ─── Card consolidada (detalle/config) ─── */
    .sv-detalle-card {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
    }
    .sv-detalle-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .sv-detalle-section .section-title {
      margin: 0;
    }
    .sv-detalle-section + .sv-detalle-section,
    .sv-detalle-grid {
      margin-top: 0.875rem;
      padding-top: 0.875rem;
      border-top: 1px solid var(--color-rule);
    }

    /* Grid interno: fecha-inicio, fecha-fin, total — 3 columnas en desktop */
    .sv-detalle-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.75rem;
    }
    @media (max-width: 600px) {
      .sv-detalle-grid {
        grid-template-columns: 1fr 1fr;
      }
      .sv-total-field { grid-column: span 2; }
    }
    .sv-total-field { display: flex; flex-direction: column; }
    .sv-total-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--color-surface);
      border: 1px solid var(--color-rule-2);
      border-radius: 12px;
      padding: 0 0.625rem 0 0.75rem;
      transition: border-color 160ms, box-shadow 160ms;
    }
    .sv-total-input-wrap:focus-within {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }
    .sv-total-prefix {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-ink-2);
      flex-shrink: 0;
    }
    .sv-total-input {
      flex: 1;
      border: none !important;
      background: transparent !important;
      padding: 0.625rem 0 !important;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-ink-strong);
      text-align: right;
      outline: none;
      box-shadow: none !important;
      min-width: 0;
    }

    /* Form config tras formDetalle */
    .sv-config-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    /* Chip row (denso) */
    .sv-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    /* ─── Recientes ─── */
    .sv-recent {
      margin-top: 1rem;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--color-rule-2);
      border-radius: var(--radius-lg);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      overflow: hidden;
    }
    .sv-recent-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-rule);
    }
    .sv-recent-title {
      color: var(--color-ink-3);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0;
    }
    .sv-recent-link {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-accent);
      text-decoration: none;
      transition: color 160ms;
    }
    .sv-recent-link:hover { color: var(--color-accent-hover); }
    .sv-recent-empty {
      padding: 1.25rem 1.125rem;
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      color: var(--color-ink-3);
      text-align: center;
      margin: 0;
    }
    .sv-recent-skel {
      padding: 0.875rem 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .sv-recent-skel-line {
      height: 10px;
      border-radius: 999px;
      background: var(--color-surface-3);
      animation: sv-pulse 1.5s ease-in-out infinite;
    }
    @keyframes sv-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.4; }
    }
    .sv-recent-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.875rem;
      padding: 0.625rem 1rem;
      border-bottom: 1px solid var(--color-rule);
      transition: background 160ms;
    }
    .sv-recent-item:last-child { border-bottom: none; }
    .sv-recent-item:hover { background: var(--color-surface-2); }
    .sv-recent-info { min-width: 0; flex: 1; }
    .sv-recent-desc {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-ink-strong);
      margin: 0 0 0.2rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sv-recent-meta {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-2);
      margin: 0;
      letter-spacing: 0.02em;
    }
    .sv-recent-meta-cliente {
      color: var(--color-ink-3);
    }
    .sv-recent-repeat {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-accent);
      background: var(--color-accent-tint);
      border: 1px solid var(--color-accent-tint-2);
      border-radius: 999px;
      cursor: pointer;
      transition: background 160ms, border-color 160ms, transform 100ms;
      flex-shrink: 0;
    }
    .sv-recent-repeat:hover {
      background: var(--color-accent-tint-2);
      border-color: var(--color-accent);
    }
    .sv-recent-repeat:active { transform: scale(0.97); }

    /* ─── Vista previa del comprobante (panel derecho) ─── */
    .sv-preview {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,250,252,0.94) 100%);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    @media (min-width: 1024px) {
      .sv-preview { box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.08); }
    }

    .sv-preview-head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.125rem;
      border-bottom: 1px dashed var(--color-rule-2);
    }
    .sv-preview-eyebrow {
      color: var(--color-ink-3);
      font-size: 0.6875rem;
      font-weight: 700;
    }
    .sv-preview-ready {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-success);
      background: var(--color-success-tint);
      border-radius: 999px;
    }
    .sv-preview-pending {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-ink-3);
      padding: 0.2rem 0.5rem;
      background: var(--color-surface-3);
      border-radius: 999px;
    }

    .sv-preview-brand {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 1rem 1.125rem 0.875rem;
      border-bottom: 1px solid var(--color-rule);
    }
    .sv-preview-brand-info { min-width: 0; }
    .sv-preview-brand-name {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1rem;
      color: var(--color-ink-strong);
      margin: 0;
      line-height: 1.1;
      letter-spacing: -0.015em;
    }
    .sv-preview-brand-tienda {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-2);
      margin: 0;
      letter-spacing: 0.02em;
    }

    .sv-preview-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.125rem 1.125rem 0.5rem;
      scrollbar-width: thin;
      scrollbar-color: var(--color-rule-2) transparent;
    }
    .sv-preview-section {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .sv-preview-label {
      color: var(--color-ink-3);
      font-size: 0.625rem;
    }
    .sv-preview-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, var(--color-rule-2) 30%, var(--color-rule-2) 70%, transparent 100%);
      margin: 1rem 0;
    }

    .sv-preview-desc {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 1rem;
      line-height: 1.3;
      color: var(--color-ink-strong);
      margin: 0;
      letter-spacing: -0.01em;
      word-break: break-word;
    }
    .sv-preview-desc-empty { color: var(--color-ink-3); font-style: italic; font-weight: 400; }
    .sv-preview-fecha {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-ink-2);
      margin: 0;
      letter-spacing: 0.02em;
    }

    .sv-preview-total {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 2.25rem;
      line-height: 1;
      letter-spacing: -0.035em;
      color: var(--color-ink-strong);
      margin: 0;
      font-feature-settings: 'tnum';
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 70%, #A855F7 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      -webkit-text-fill-color: transparent;
    }
    .sv-preview-total-pre {
      font-family: var(--font-mono);
      font-size: 0.5em;
      font-weight: 500;
      opacity: 0.55;
      margin-right: 0.2em;
      vertical-align: 0.5em;
      -webkit-text-fill-color: currentColor;
      color: var(--color-ink-2);
    }

    .sv-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .sv-preview-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.625rem;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: 999px;
      letter-spacing: 0.04em;
      align-self: flex-start;
    }
    .sv-preview-badge-method {
      color: var(--color-accent);
      background: var(--color-accent-tint);
      border: 1px solid var(--color-accent-tint-2);
    }
    .sv-preview-badge-credito {
      color: var(--color-warning);
      background: var(--color-warning-tint);
      border: 1px solid rgba(245, 158, 11, 0.25);
    }
    .sv-preview-badge-tipo {
      color: var(--color-ink-strong);
      background: var(--color-surface-3);
      border: 1px solid var(--color-rule-2);
    }
    .sv-preview-badge-sunat {
      color: #7C3AED;
      background: #F3E8FF;
      border: 1px solid #E9D5FF;
    }

    .sv-preview-cliente {
      font-family: var(--font-sans);
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--color-ink-strong);
      margin: 0;
    }
    .sv-preview-cliente-doc {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-ink-2);
      margin: 0;
      letter-spacing: 0.04em;
    }
    .sv-preview-cliente-empty {
      font-family: var(--font-sans);
      font-style: italic;
      font-size: 0.8125rem;
      color: var(--color-ink-3);
      margin: 0;
    }

    .sv-preview-foot {
      flex-shrink: 0;
      padding: 0.875rem 1.125rem 1.125rem;
      border-top: 1px dashed var(--color-rule-2);
    }
  `],
  template: `
    <app-servicio-flow-header [currentStep]="1" />

    <div class="page-content sv-wrap">
      <div class="sv-layout">

        <!-- Columna izquierda: Detalles del servicio -->
        <div class="sv-catalog">

          <!-- ═══ KPI strip — contexto del día ═══ -->
          <div class="sv-kpis">
            <div class="sv-kpi sv-kpi-hero">
              <span class="sv-kpi-eyebrow">Servicios hoy</span>
              <span class="sv-kpi-value">{{ kpiCount() }}</span>
            </div>
            <div class="sv-kpi">
              <span class="sv-kpi-eyebrow">Cobrado hoy</span>
              <span class="sv-kpi-value"><span class="sv-kpi-pre">S/</span>{{ kpiTotal() | number:'1.2-2' }}</span>
            </div>
            <div class="sv-kpi">
              <span class="sv-kpi-eyebrow">Ticket promedio</span>
              <span class="sv-kpi-value"><span class="sv-kpi-pre">S/</span>{{ kpiPromedio() | number:'1.2-2' }}</span>
            </div>
          </div>

          <form [formGroup]="formDetalle">

            <!-- Card unificada: descripción + período + total -->
            <div class="card sv-detalle-card">

              <!-- Descripción -->
              <div class="sv-detalle-section">
                <p class="section-title">Detalles del servicio</p>
                <div class="field-group" style="margin:0">
                  <label class="field-label">Descripción</label>
                  <textarea
                    formControlName="descripcion"
                    rows="3"
                    placeholder="Describe el servicio realizado..."
                    class="field-textarea"
                  ></textarea>
                </div>
              </div>

              <!-- Período + Total en 2 columnas -->
              <div class="sv-detalle-grid">
                <div class="field-group">
                  <label class="field-label">Fecha inicio <span style="color:#EF4444">*</span></label>
                  <input type="date" formControlName="fechaInicio" class="field-input" />
                  @if (formDetalle.get('fechaInicio')?.invalid && formDetalle.get('fechaInicio')?.touched) {
                    <p class="field-error">Requerido</p>
                  }
                </div>
                <div class="field-group">
                  <label class="field-label">Fecha fin <span style="color:#EF4444">*</span></label>
                  <input type="date" formControlName="fechaFin" class="field-input" />
                  @if (formDetalle.get('fechaFin')?.invalid && formDetalle.get('fechaFin')?.touched) {
                    <p class="field-error">Requerido</p>
                  }
                </div>
                <div class="field-group sv-total-field">
                  <label class="field-label">Total a cobrar <span style="color:#EF4444">*</span></label>
                  <div class="sv-total-input-wrap">
                    <span class="sv-total-prefix">S/</span>
                    <input type="number" formControlName="total" step="0.01" min="0.01" placeholder="0.00"
                      class="field-input sv-total-input" />
                  </div>
                  @if (formDetalle.get('total')?.errors?.['required'] && formDetalle.get('total')?.touched) {
                    <p class="field-error">Requerido</p>
                  }
                  @if (formDetalle.get('total')?.errors?.['min'] && formDetalle.get('total')?.touched) {
                    <p class="field-error">Debe ser mayor a 0</p>
                  }
                </div>
              </div>

              @if (formDetalle.errors?.['fechaFinAnterior'] && formDetalle.touched) {
                <p class="field-error" style="margin-top:0.5rem">La fecha fin debe ser posterior a la fecha inicio</p>
              }
            </div>

          </form>

          <!-- ═══ Configuración de pago (chips + cliente) — antes era panel derecho ═══ -->
          <form [formGroup]="formConfig" class="sv-config-form">

            <!-- Card unificada: Tipo + Método + Comprobante -->
            <div class="card sv-detalle-card">

              <div class="sv-detalle-section">
                <p class="section-title">Tipo de servicio</p>
                <div class="sv-chip-row">
                  @for (v of tipoVentaValues; track v) {
                    <button type="button" (click)="seleccionarTipoVenta(v)" [class]="chipClass(tipoVenta() === v)">
                      {{ getTipoVentaLabel(v) }}
                    </button>
                  }
                </div>
              </div>

              @if (!isCredito()) {
                <div class="sv-detalle-section">
                  <p class="section-title">Método de pago</p>
                  <div class="sv-chip-row">
                    @for (v of metodoPagoValues; track v) {
                      <button type="button" (click)="formConfig.patchValue({ metodoPago: v })" [class]="chipClass(metodoPago() === v)">
                        {{ getMetodoPagoLabel(v) }}
                      </button>
                    }
                  </div>
                </div>
              }

              @if (isSunat()) {
                <div class="sv-detalle-section">
                  <p class="section-title">Tipo de comprobante</p>
                  <div class="sv-chip-row">
                    @for (v of tipoComprobanteValues; track v) {
                      <button type="button" (click)="formConfig.patchValue({ tipoComprobante: v })" [class]="chipClass(tipoComprobante() === v)">
                        {{ getTipoComprobanteLabel(v) }}
                      </button>
                    }
                  </div>
                  @if (formConfig.get('tipoComprobante')?.invalid && formConfig.get('tipoComprobante')?.touched) {
                    <p style="font-size:0.75rem;color:#EF4444;margin:0.5rem 0 0">Requerido para SUNAT</p>
                  }
                </div>
              }
            </div>

            <!-- Cliente (si crédito o SUNAT) -->
            @if (isCredito() || isSunat()) {
              <div class="card">
                <div class="sv-card-body">
                  <p class="section-title">
                    Cliente
                    <span style="font-weight:400;color:#94A3B8;font-size:0.72rem;margin-left:0.25rem;text-transform:none;letter-spacing:0">
                      {{ clienteObligatorio() ? '(obligatorio)' : '(opcional)' }}
                    </span>
                  </p>

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

          <!-- ═══ Servicios recientes ═══ -->
          <div class="sv-recent">
            <div class="sv-recent-head">
              <p class="sv-recent-title">Servicios recientes</p>
              <a routerLink="/servicios/historial" class="sv-recent-link">Ver todo →</a>
            </div>

            @if (servicioSvc.historial().isLoading && serviciosRecientes().length === 0) {
              <div class="sv-recent-skel">
                <div class="sv-recent-skel-line" style="width:78%"></div>
                <div class="sv-recent-skel-line" style="width:55%"></div>
                <div class="sv-recent-skel-line" style="width:70%"></div>
              </div>
            } @else if (serviciosRecientes().length === 0) {
              <p class="sv-recent-empty">Aún no hay servicios registrados.</p>
            } @else {
              @for (s of serviciosRecientes(); track s.id) {
                <div class="sv-recent-item">
                  <div class="sv-recent-info">
                    <p class="sv-recent-desc">{{ s.descripcion || 'Servicio sin descripción' }}</p>
                    <p class="sv-recent-meta">
                      {{ fechaRelativa(s.fecha) }} · S/ {{ s.total | number:'1.2-2' }}
                      @if (s.cliente?.nombre) {
                        <span class="sv-recent-meta-cliente"> · {{ s.cliente!.nombre }}</span>
                      }
                    </p>
                  </div>
                  <button type="button" class="sv-recent-repeat" (click)="repetirServicio(s)" title="Pre-rellenar el formulario con este servicio">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M3 21v-5h5"/>
                    </svg>
                    Repetir
                  </button>
                </div>
              }
            }
          </div>

        </div>

        <!-- Columna derecha: Panel desktop -->
        <div class="sv-panel">
          <ng-container *ngTemplateOutlet="previewContent" />
        </div>

      </div>
    </div>

    <!-- Float bar móvil → abre la vista previa + Registrar -->
    <div class="sv-float-bar" (click)="mostrarSheet.set(true)">
      <div style="display:flex;flex-direction:column">
        <span style="font-size:0.7rem;font-weight:500;opacity:0.85;text-transform:uppercase;letter-spacing:0.06em">Vista previa</span>
        <span style="font-size:0.85rem;font-weight:600">Revisar y registrar</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem">
        <span style="font-size:1.05rem;font-weight:800">S/ {{ (previewTotal() ?? 0) | number:'1.2-2' }}</span>
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
          <ng-container *ngTemplateOutlet="previewContent" />
        </div>
      </div>
    }

    <!-- ng-template compartido: preview desktop + bottom sheet mobile -->
    <ng-template #previewContent>
      <div class="sv-preview">

        <!-- Header: VISTA PREVIA + status -->
        <div class="sv-preview-head">
          <span class="text-eyebrow sv-preview-eyebrow">Vista previa</span>
          @if (formDetalle.valid && formConfig.valid) {
            <span class="sv-preview-ready">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Listo
            </span>
          } @else {
            <span class="sv-preview-pending">Completa los datos</span>
          }
        </div>

        <!-- Brand + tienda -->
        <div class="sv-preview-brand">
          <span class="brand-dot brand-dot-sm"></span>
          <div class="sv-preview-brand-info">
            <p class="sv-preview-brand-name">Pivox</p>
            <p class="sv-preview-brand-tienda">{{ tiendaNombre() }}</p>
          </div>
        </div>

        <!-- Cuerpo del comprobante -->
        <div class="sv-preview-body">

          <!-- SERVICIO -->
          <div class="sv-preview-section">
            <span class="text-eyebrow sv-preview-label">Servicio</span>
            <p class="sv-preview-desc" [class.sv-preview-desc-empty]="!previewDescripcion()">
              {{ previewDescripcion() || 'Sin descripción' }}
            </p>
            @if (previewPeriodo()) {
              <p class="sv-preview-fecha">{{ previewPeriodo() }}</p>
            }
          </div>

          <div class="sv-preview-divider"></div>

          <!-- TOTAL (destacado) -->
          <div class="sv-preview-section">
            <span class="text-eyebrow sv-preview-label">Total a cobrar</span>
            <p class="sv-preview-total">
              <span class="sv-preview-total-pre">S/</span>{{ (previewTotal() ?? 0) | number:'1.2-2' }}
            </p>
            @if (!isCredito()) {
              <span class="sv-preview-badge sv-preview-badge-method">{{ previewMetodoPagoLabel() }}</span>
            } @else {
              <span class="sv-preview-badge sv-preview-badge-credito">A crédito · pendiente de cobro</span>
            }
          </div>

          <div class="sv-preview-divider"></div>

          <!-- TIPO -->
          <div class="sv-preview-section">
            <span class="text-eyebrow sv-preview-label">Operación</span>
            <div class="sv-preview-tags">
              <span class="sv-preview-badge sv-preview-badge-tipo">{{ previewTipoVentaLabel() }}</span>
              @if (isSunat() && previewTipoComprobanteLabel()) {
                <span class="sv-preview-badge sv-preview-badge-sunat">{{ previewTipoComprobanteLabel() }}</span>
              }
            </div>
          </div>

          @if (isCredito() || isSunat()) {
            <div class="sv-preview-divider"></div>
            <div class="sv-preview-section">
              <span class="text-eyebrow sv-preview-label">Cliente</span>
              @if (previewClienteDisplay()) {
                <p class="sv-preview-cliente">{{ previewClienteDisplay() }}</p>
                @if (previewClienteDoc()) {
                  <p class="sv-preview-cliente-doc">{{ previewClienteDoc() }}</p>
                }
              } @else {
                <p class="sv-preview-cliente-empty">
                  {{ clienteObligatorio() ? '— pendiente de seleccionar —' : 'Sin cliente asociado' }}
                </p>
              }
            </div>
          }

        </div>

        <!-- Botón Registrar -->
        <div class="sv-preview-foot">
          <button type="button" (click)="registrar()" [disabled]="servicioSvc.state().isSaving" class="btn-primary w-full" style="font-weight:700">
            @if (servicioSvc.state().isSaving) {
              <span class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px"></span>
              Enviando...
            } @else {
              Registrar servicio · S/ {{ (previewTotal() ?? 0) | number:'1.2-2' }}
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
  readonly tiendaSvc   = inject(TiendaService);
  private readonly fb  = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly tipoVentaValues       = TIPO_VENTA_VALUES;
  readonly metodoPagoValues      = METODO_PAGO_VALUES;
  readonly tipoComprobanteValues = TIPO_COMPROBANTE_VALUES;
  readonly getTipoVentaLabel     = getTipoVentaLabel;
  readonly getMetodoPagoLabel    = getMetodoPagoLabel;
  readonly getTipoComprobanteLabel = getTipoComprobanteLabel;

  readonly tipoVenta       = computed(() => this.resumenSvc.state().tipoVenta);
  readonly metodoPago      = computed(() => this.resumenSvc.state().metodoPago);
  readonly tipoComprobante = computed(() => this.resumenSvc.state().tipoComprobante ?? '');

  readonly isSunat  = computed(() => this.tipoVenta() === 'SUNAT');
  readonly isCredito = computed(() => this.tipoVenta() === 'CREDITO');
  readonly clienteObligatorio = computed(() =>
    this.isCredito() || (this.isSunat() && this.tipoComprobante() === '01'),
  );

  readonly mostrarSheet = signal(false);

  // ── KPIs del día + recientes ──
  private readonly hoyISO = new Date().toISOString().slice(0, 10);
  readonly serviciosRecientes = computed(() => this.servicioSvc.historial().servicios.slice(0, 5));
  private readonly serviciosHoy = computed(() =>
    this.servicioSvc.historial().servicios.filter(s =>
      typeof s.fecha === 'string' && s.fecha.startsWith(this.hoyISO),
    ),
  );
  readonly kpiCount    = computed(() => this.serviciosHoy().length);
  readonly kpiTotal    = computed(() => this.serviciosHoy().reduce((acc, s) => acc + (s.total || 0), 0));
  readonly kpiPromedio = computed(() => {
    const n = this.kpiCount();
    return n > 0 ? this.kpiTotal() / n : 0;
  });

  // ── Preview vivo del comprobante ──
  readonly tiendaNombre = computed(() => this.tiendaSvc.tiendaActiva()?.nombreSede ?? 'Tienda');
  readonly previewDescripcion = signal<string>('');
  readonly previewFechaInicio = signal<string>('');
  readonly previewFechaFin    = signal<string>('');
  readonly previewTotal       = signal<number | null>(null);

  readonly previewTipoVentaLabel = computed(() => getTipoVentaLabel(this.tipoVenta()));
  readonly previewMetodoPagoLabel = computed(() => getMetodoPagoLabel(this.metodoPago()));
  readonly previewTipoComprobanteLabel = computed(() => {
    const t = this.tipoComprobante();
    return t ? getTipoComprobanteLabel(t) : '';
  });
  readonly previewClienteNombre = computed(() => this.resumenSvc.state().clienteNombre);
  readonly previewClienteDoc = computed(() => {
    const r = this.resumenSvc.state();
    if (r.clienteId) return null;
    const cn = r.clienteNuevo;
    if (cn?.numeroDocumento && cn?.tipoDocumento) {
      const label = cn.tipoDocumento === '1' ? 'DNI' : cn.tipoDocumento === '6' ? 'RUC' : cn.tipoDocumento === '7' ? 'Pasaporte' : 'Doc';
      return `${label} ${cn.numeroDocumento}`;
    }
    return null;
  });
  readonly previewClienteDisplay = computed(() => {
    const r = this.resumenSvc.state();
    if (r.clienteNombre) return r.clienteNombre;
    if (r.usarClienteNuevo && r.clienteNuevo?.nombre) return r.clienteNuevo.nombre;
    return null;
  });
  readonly previewPeriodo = computed(() => {
    const i = this.previewFechaInicio();
    const f = this.previewFechaFin();
    if (!i && !f) return '';
    if (i && f && i === f) return this.fechaCorta(i);
    if (i && f) return `${this.fechaCorta(i)} → ${this.fechaCorta(f)}`;
    return this.fechaCorta(i || f);
  });

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

    // Inicializar signals del preview con valores cargados
    this.previewDescripcion.set(savedDetalle.descripcion ?? '');
    this.previewFechaInicio.set(savedDetalle.fechaInicio ?? '');
    this.previewFechaFin.set(savedDetalle.fechaFin ?? '');
    this.previewTotal.set(savedDetalle.total ? (parseFloat(savedDetalle.total) || null) : null);

    this.subs.push(
      this.formDetalle.valueChanges.subscribe(val => {
        this.formSvc.actualizar({
          descripcion: val['descripcion'] ?? '',
          fechaInicio: val['fechaInicio'] ?? '',
          fechaFin:    val['fechaFin'] ?? '',
          total:       val['total'] != null ? String(val['total']) : '',
        });
        // Update preview signals
        this.previewDescripcion.set(val['descripcion'] ?? '');
        this.previewFechaInicio.set(val['fechaInicio'] ?? '');
        this.previewFechaFin.set(val['fechaFin'] ?? '');
        this.previewTotal.set(typeof val['total'] === 'number' ? val['total'] : null);
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

    // Cargar recientes para KPIs + lista (no bloqueante)
    void this.servicioSvc.cargarServicios();
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

  /** Pre-rellena el formulario con un servicio previo (descripción + monto), fechas = hoy. Cliente queda sin tocar. */
  repetirServicio(s: ServicioReadModel): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.formDetalle.patchValue({
      descripcion: s.descripcion ?? '',
      total: s.total,
      fechaInicio: hoy,
      fechaFin: hoy,
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** "16 may 2026" — usado por previewPeriodo. */
  fechaCorta(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha + (fecha.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Formato corto para meta de servicios recientes: "Hoy 14:32" / "Ayer" / "12 may 2026". */
  fechaRelativa(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    const now = new Date();
    const yyyymmdd = (date: Date) => date.toISOString().slice(0, 10);
    const ayer = new Date(now); ayer.setDate(now.getDate() - 1);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (yyyymmdd(d) === yyyymmdd(now)) return `Hoy ${hh}:${mm}`;
    if (yyyymmdd(d) === yyyymmdd(ayer)) return `Ayer ${hh}:${mm}`;
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }
}
