import { Component, Input } from '@angular/core';

interface FlowStep {
  label: string;
  step: number;
}

const STEPS: FlowStep[] = [
  { label: 'Servicio', step: 1 },
  { label: 'Comprobante', step: 2 },
];

@Component({
  selector: 'app-servicio-flow-header',
  standalone: true,
  styles: [`
    :host { display: block; }
    .sf-nav {
      display: flex;
      align-items: center;
      padding: 1rem 2rem;
      gap: 0;
      max-width: 88rem;
      margin: 0 auto;
      border-bottom: 1px solid var(--color-rule);
      background: var(--color-bg);
    }
    .sf-step-wrap { display: flex; align-items: center; flex-shrink: 0; }
    .sf-step { display: flex; align-items: center; gap: 0.625rem; }
    .sf-num {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-ink-3);
      letter-spacing: 0.05em;
    }
    .sf-label {
      font-family: var(--font-display);
      font-style: normal;
      font-weight: 500;
      font-size: 1rem;
      color: var(--color-ink-3);
      letter-spacing: -0.005em;
      transition: color 200ms;
      
    }
    .sf-current .sf-num { color: var(--color-ink); }
    .sf-current .sf-label { color: var(--color-ink); }
    .sf-done .sf-num { color: var(--color-success); }
    .sf-done .sf-label { color: var(--color-ink-2); text-decoration: line-through; text-decoration-color: var(--color-ink-3); text-decoration-thickness: 0.5px; }
    .sf-connector {
      width: 2rem;
      height: 1px;
      background: var(--color-rule-bold);
      margin: 0 1rem;
      flex-shrink: 0;
    }
    .sf-done + .sf-connector,
    .sf-current + .sf-connector { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); }
  `],
  template: `
    <nav class="sf-nav">
      @for (step of steps; track step.step; let last = $last) {
        <div class="sf-step-wrap">
          <div class="sf-step" [class.sf-done]="currentStep > step.step" [class.sf-current]="currentStep === step.step">
            <span class="sf-num">
              @if (currentStep > step.step) { ✓ } @else { 0{{ step.step }} }
            </span>
            <span class="sf-label">{{ step.label }}</span>
          </div>
          @if (!last) { <div class="sf-connector"></div> }
        </div>
      }
    </nav>
  `,
})
export class ServicioFlowHeaderComponent {
  @Input() currentStep = 1;
  readonly steps = STEPS;
}
