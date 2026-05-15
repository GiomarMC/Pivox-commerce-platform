import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

interface FlowStep {
  label: string;
  step: number;
  route: string;
}

const BASE_STEPS: FlowStep[] = [
  { label: 'Venta',       step: 1, route: '/ventas' },
  { label: 'SUNAT',       step: 2, route: '/ventas/propuesta-sunat' },
  { label: 'Comprobante', step: 3, route: '/ventas/comprobante' },
];

@Component({
  selector: 'app-flow-header',
  standalone: true,
  template: `
    <nav class="flow-nav">
      @for (step of visibleSteps; track step.step; let last = $last) {
        <div class="flow-step-wrap">
          <button
            type="button"
            [class]="stepClass(step.step)"
            [disabled]="!canGoBack(step.step)"
            (click)="goTo(step)"
          >
            <div class="flow-bubble">
              @if (currentStep > step.step) {
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              } @else {
                {{ displayNum(step.step) }}
              }
            </div>
            <span class="flow-label">{{ step.label }}</span>
          </button>
          @if (!last) {
            <div class="flow-connector"></div>
          }
        </div>
      }
    </nav>
  `,
  styles: [`
    .flow-nav {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      overflow-x: auto;
      scrollbar-width: none;
      gap: 0;
    }
    .flow-nav::-webkit-scrollbar { display: none; }

    .flow-step-wrap {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .flow-step-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
      cursor: default;
    }

    .flow-step-btn-back {
      cursor: pointer;
    }
    .flow-step-btn-back:hover .flow-bubble {
      background: #BFDBFE;
      color: #1D4ED8;
    }
    .flow-step-btn-back:hover .flow-label {
      color: #1D4ED8;
    }

    .flow-bubble {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 700;
      background: #E2E6F0;
      color: #9CA3AF;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }

    .flow-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #9CA3AF;
      transition: color 0.15s;
    }

    .flow-step-btn.flow-current .flow-bubble { background: #1F2A7C; color: #fff; }
    .flow-step-btn.flow-current .flow-label  { color: #1F2A7C; font-weight: 700; }

    .flow-step-btn.flow-done .flow-bubble { background: #DCFCE7; color: #15803D; }
    .flow-step-btn.flow-done .flow-label  { color: #6B7280; }

    .flow-connector {
      width: 24px;
      height: 1px;
      background: #E2E6F0;
      margin: 0 0.35rem;
      flex-shrink: 0;
    }

    @media (min-width: 768px) {
      .flow-nav { padding: 0.875rem 2rem; max-width: 1400px; margin: 0 auto; }
      .flow-connector { width: 40px; margin: 0 0.5rem; }
      .flow-bubble { width: 26px; height: 26px; font-size: 0.75rem; }
      .flow-label { font-size: 0.8rem; }
    }
  `],
})
export class FlowHeaderComponent {
  @Input() currentStep = 1;
  @Input() showSunatStep = false;

  private readonly router = inject(Router);

  get visibleSteps(): FlowStep[] {
    return BASE_STEPS.filter(s => s.step !== 2 || this.showSunatStep);
  }

  displayNum(step: number): number {
    if (!this.showSunatStep && step > 2) return step - 1;
    return step;
  }

  stepClass(step: number): string {
    const base = 'flow-step-btn';
    if (step === this.currentStep) return `${base} flow-current`;
    if (step < this.currentStep) return `${base} flow-done${this.canGoBack(step) ? ' flow-step-btn-back' : ''}`;
    return base;
  }

  canGoBack(step: number): boolean {
    if (step >= this.currentStep) return false;
    // No permitir volver a propuesta-sunat desde comprobante
    if (step === 2) return false;
    return true;
  }

  goTo(step: FlowStep): void {
    if (!this.canGoBack(step.step)) return;
    void this.router.navigate([step.route]);
  }
}
