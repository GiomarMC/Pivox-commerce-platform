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
    .sf-nav { display:flex; align-items:center; padding:0.75rem 1rem; overflow-x:auto; scrollbar-width:none; gap:0; }
    .sf-nav::-webkit-scrollbar { display:none; }
    .sf-step-wrap { display:flex; align-items:center; flex-shrink:0; }
    .sf-step { display:flex; align-items:center; gap:0.4rem; }
    .sf-bubble { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; background:#E2E6F0; color:#9CA3AF; flex-shrink:0; transition:background 0.2s, color 0.2s; }
    .sf-label { font-size:0.75rem; font-weight:500; color:#9CA3AF; transition:color 0.2s; }
    .sf-current .sf-bubble { background:#1F2A7C; color:#fff; }
    .sf-current .sf-label { color:#1F2A7C; font-weight:700; }
    .sf-done .sf-bubble { background:#DCFCE7; color:#15803D; }
    .sf-done .sf-label { color:#6B7280; }
    .sf-connector { width:24px; height:1px; background:#E2E6F0; margin:0 0.35rem; flex-shrink:0; }

    @media (min-width: 768px) {
      .sf-nav { padding:0.875rem 2rem; max-width:1400px; margin:0 auto; }
      .sf-connector { width:40px; margin:0 0.5rem; }
      .sf-bubble { width:26px; height:26px; font-size:0.75rem; }
      .sf-label { font-size:0.8rem; }
    }
  `],
  template: `
    <nav class="sf-nav">
      @for (step of steps; track step.step; let last = $last) {
        <div class="sf-step-wrap">
          <div class="sf-step" [class.sf-done]="currentStep > step.step" [class.sf-current]="currentStep === step.step">
            <div class="sf-bubble">
              @if (currentStep > step.step) {
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              } @else {
                {{ step.step }}
              }
            </div>
            <span class="sf-label">{{ step.label }}</span>
          </div>
          @if (!last) {
            <div class="sf-connector"></div>
          }
        </div>
      }
    </nav>
  `,
})
export class ServicioFlowHeaderComponent {
  @Input() currentStep = 1;

  readonly steps = STEPS;

}
