import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ServicioFormService } from '../../servicio-form.service';
import { ServicioFlowHeaderComponent } from '../../components/servicio-flow-header/servicio-flow-header.component';

@Component({
  selector: 'app-servicio-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, ServicioFlowHeaderComponent],
  styles: [`
    .sf-footer { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #EEF1F6; padding:1rem; z-index:20; }
    .sf-desktop-btn { display:none; }

    @media (min-width: 768px) {
      .sf-wrap { max-width:640px; padding-bottom:2rem; }
      .sf-footer { display:none; }
      .sf-desktop-btn { display:block; }
    }
  `],
  template: `
    <app-servicio-flow-header [currentStep]="1" />

    <div class="page-content sf-wrap pb-32" style="display:flex;flex-direction:column;gap:0.875rem">

      <form [formGroup]="form" (ngSubmit)="siguiente()" style="display:flex;flex-direction:column;gap:0.875rem">

        <!-- Descripción -->
        <div class="card">
          <p class="section-title" style="margin-bottom:0.875rem">Nuevo servicio</p>
          <div class="field-group">
            <label class="field-label">Descripción <span style="font-weight:400;color:#94A3B8">(opcional)</span></label>
            <textarea
              formControlName="descripcion"
              rows="3"
              placeholder="Describe el servicio realizado..."
              class="field-textarea"
            ></textarea>
          </div>
        </div>

        <!-- Fechas -->
        <div class="card">
          <p class="section-title" style="margin-bottom:0.875rem">Período del servicio</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="field-group">
              <label class="field-label">Fecha inicio <span style="color:#EF4444">*</span></label>
              <input type="date" formControlName="fechaInicio" class="field-input" />
              @if (form.get('fechaInicio')?.invalid && form.get('fechaInicio')?.touched) {
                <p style="font-size:0.72rem;color:#EF4444;margin:0.25rem 0 0">Requerido</p>
              }
            </div>
            <div class="field-group">
              <label class="field-label">Fecha fin <span style="color:#EF4444">*</span></label>
              <input type="date" formControlName="fechaFin" class="field-input" />
              @if (form.get('fechaFin')?.invalid && form.get('fechaFin')?.touched) {
                <p style="font-size:0.72rem;color:#EF4444;margin:0.25rem 0 0">Requerido</p>
              }
            </div>
          </div>
          @if (form.errors?.['fechaFinAnterior'] && form.touched) {
            <p style="font-size:0.75rem;color:#EF4444;margin:0.5rem 0 0">La fecha fin debe ser posterior a la fecha inicio</p>
          }
        </div>

        <!-- Total -->
        <div class="card">
          <div class="field-group">
            <label class="field-label">Total (S/) <span style="color:#EF4444">*</span></label>
            <input type="number" formControlName="total" step="0.01" min="0.01" placeholder="0.00" class="field-input" />
            @if (form.get('total')?.errors?.['required'] && form.get('total')?.touched) {
              <p style="font-size:0.72rem;color:#EF4444;margin:0.25rem 0 0">Requerido</p>
            }
            @if (form.get('total')?.errors?.['min'] && form.get('total')?.touched) {
              <p style="font-size:0.72rem;color:#EF4444;margin:0.25rem 0 0">El total debe ser mayor a 0</p>
            }
          </div>
        </div>

      </form>

      <!-- Desktop CTA (inline, replaces fixed footer on ≥768px) -->
      <div class="sf-desktop-btn">
        <button type="button" (click)="siguiente()" class="btn-primary w-full">
          Continuar al resumen
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="sf-footer">
      <button type="button" (click)="siguiente()" class="btn-primary w-full">
        Continuar al resumen
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>
  `,
})
export class FormularioComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly formSvc = inject(ServicioFormService);

  form = this.fb.group(
    {
      descripcion: [''],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      total: [null as number | null, [Validators.required, Validators.min(0.01)]],
    },
    { validators: this.fechaFinValidator },
  );

  private sub: Subscription | null = null;

  ngOnInit(): void {
    const saved = this.formSvc.state();
    this.form.patchValue({
      descripcion: saved.descripcion,
      fechaInicio: saved.fechaInicio,
      fechaFin: saved.fechaFin,
      total: saved.total ? (parseFloat(saved.total) || null) : null,
    });

    this.sub = this.form.valueChanges.subscribe(val => {
      this.formSvc.actualizar({
        descripcion: val['descripcion'] ?? '',
        fechaInicio: val['fechaInicio'] ?? '',
        fechaFin: val['fechaFin'] ?? '',
        total: val['total'] != null ? String(val['total']) : '',
      });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private fechaFinValidator(group: import('@angular/forms').AbstractControl): import('@angular/forms').ValidationErrors | null {
    const inicio = group.get('fechaInicio')?.value as string;
    const fin = group.get('fechaFin')?.value as string;
    if (inicio && fin && fin < inicio) {
      return { fechaFinAnterior: true };
    }
    return null;
  }

  siguiente(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    void this.router.navigate(['/servicios/resumen']);
  }
}
