import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImpresoraService, TipoConexionImpresora } from '../impresora.service';

@Component({
  selector: 'app-impresora-config',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    .ic-wrap { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }

    .ic-hero {
      text-align: center;
      padding: 2rem 1rem 1.25rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    }
    .ic-hero-icon {
      width: 56px; height: 56px; border-radius: 16px;
      background: var(--color-surface-2, #F1F5F9);
      border: 1px solid var(--color-rule, #E2E8F0);
      display: flex; align-items: center; justify-content: center;
    }
    .ic-hero-title {
      font-family: var(--font-display); font-weight: 700;
      font-size: 1.5rem; letter-spacing: -0.03em;
      color: var(--color-ink-strong); margin: 0;
    }
    .ic-hero-sub {
      font-size: 0.8rem; color: var(--color-ink-3); margin: 0; line-height: 1.4;
    }

    .ic-status {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.875rem 1rem; border-radius: 14px;
      border: 1px solid;
    }
    .ic-status-ok  { background: #ECFDF5; border-color: #10B981; }
    .ic-status-off { background: var(--color-surface-2, #F8FAFC); border-color: var(--color-rule, #E2E8F0); }
    .ic-status-dot {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .ic-status-dot-ok  { background: #10B981; }
    .ic-status-dot-off { background: var(--color-ink-3, #94A3B8); }
    .ic-status-label { font-size: 0.8rem; font-weight: 600; margin: 0; }
    .ic-status-label-ok  { color: #10B981; }
    .ic-status-label-off { color: var(--color-ink-3); }
    .ic-status-meta { font-size: 0.72rem; margin: 0; }
    .ic-status-meta-ok  { color: #10B981; }
    .ic-status-meta-off { color: var(--color-ink-3); }

    .ic-section-label {
      font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--color-ink-3);
      margin: 0 0 0.5rem;
    }
    .ic-row { display: flex; gap: 0.5rem; }
    .ic-info { font-size: 0.78rem; color: var(--color-ink-3); margin: 0; line-height: 1.5; }
    .ic-actions { display: flex; flex-direction: column; gap: 0.5rem; }
  `],
  template: `
    <div class="page-content">
      <div class="ic-wrap">

        <!-- Hero header -->
        <div class="ic-hero">
          <div class="ic-hero-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-ink-2)">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
          </div>
          <div>
            <h1 class="ic-hero-title">Impresora</h1>
            <p class="ic-hero-sub">Conexión ESC/POS · Bridge local en puerto 3000</p>
          </div>
        </div>

        <!-- Estado actual -->
        @if (svc.estaConfigurada()) {
          <div class="ic-status ic-status-ok">
            <div class="ic-status-dot ic-status-dot-ok">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <p class="ic-status-label ic-status-label-ok">Impresora configurada</p>
              @if (svc.config().tipoConexion === 'wifi') {
                <p class="ic-status-meta ic-status-meta-ok">WiFi · {{ svc.config().ip }}:{{ svc.config().puerto }}</p>
              } @else {
                <p class="ic-status-meta ic-status-meta-ok">USB / Sistema (CUPS)</p>
              }
            </div>
          </div>
        } @else {
          <div class="ic-status ic-status-off">
            <div class="ic-status-dot ic-status-dot-off">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="4"/></svg>
            </div>
            <div>
              <p class="ic-status-label ic-status-label-off">Sin configurar</p>
              <p class="ic-status-meta ic-status-meta-off">Elige un tipo de conexión y guarda para activar.</p>
            </div>
          </div>
        }

        <!-- Tipo de conexión -->
        <div class="card">
          <p class="ic-section-label">Tipo de conexión</p>
          <div class="ic-row">
            <button type="button" (click)="setTipo('wifi')"
              [class]="tipoSeleccionado() === 'wifi' ? 'chip chip-active' : 'chip'"
              style="flex:1;justify-content:center;gap:0.4rem">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
              WiFi
            </button>
            <button type="button" (click)="setTipo('usb_cups')"
              [class]="tipoSeleccionado() === 'usb_cups' ? 'chip chip-active' : 'chip'"
              style="flex:1;justify-content:center;gap:0.4rem">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              USB / Sistema
            </button>
          </div>
        </div>

        <!-- WiFi: descubrimiento + IP/puerto -->
        @if (tipoSeleccionado() === 'wifi') {
          <div class="card" style="display:flex;flex-direction:column;gap:0.875rem">
            <div>
              <p class="ic-section-label">Descubrimiento automático</p>
              <p class="ic-info" style="margin-bottom:0.625rem">Escanea la red local para encontrar la impresora. Puede tardar 1–2 segundos.</p>
              <button type="button" (click)="buscarImpresora()" [disabled]="svc.descubriendo()" class="btn-primary w-full">
                {{ svc.descubriendo() ? 'Buscando...' : 'Buscar impresora en la red' }}
              </button>
            </div>
            <div style="height:1px;background:var(--color-rule)"></div>
            <form [formGroup]="formWifi" style="display:flex;flex-direction:column;gap:0.75rem">
              <p class="ic-section-label">Dirección manual</p>
              <div class="field-group">
                <label class="field-label">Dirección IP</label>
                <input type="text" formControlName="ip" placeholder="192.168.1.100" class="field-input" />
                @if (formWifi.get('ip')?.invalid && formWifi.get('ip')?.touched) {
                  <p style="font-size:0.72rem;color:#EF4444;margin:0.25rem 0 0">Ingresa la IP</p>
                }
              </div>
              <div class="field-group">
                <label class="field-label">Puerto</label>
                <input type="number" formControlName="puerto" placeholder="9100" class="field-input" />
              </div>
            </form>
          </div>
        }

        <!-- USB/CUPS -->
        @if (tipoSeleccionado() === 'usb_cups') {
          <div class="info-banner">
            <strong>Impresión por sistema (CUPS)</strong><br>
            El bridge local gestiona la comunicación con la impresora USB.
            La impresora debe estar configurada previamente en CUPS.
          </div>
        }

        <!-- Bridge URL -->
        <div class="card">
          <form [formGroup]="formWifi" style="display:flex;flex-direction:column;gap:0.625rem">
            <p class="ic-section-label">Bridge local</p>
            <div class="field-group">
              <label class="field-label">URL del Bridge</label>
              <input type="text" formControlName="bridgeUrl" placeholder="http://localhost:3000" class="field-input" />
            </div>
            <p class="ic-info">
              Usa <code>localhost:3000</code> si imprimes desde este equipo.
              Si el bridge está en otro dispositivo de la red, ingresa su IP (ej. <code>http://192.168.100.2:3000</code>).
            </p>
          </form>
        </div>

        @if (mensaje()) {
          <div [class]="esError() ? 'error-banner' : 'success-banner'">{{ mensaje() }}</div>
        }

        <!-- Acciones -->
        <div class="ic-actions">
          @if (tipoSeleccionado() === 'wifi') {
            <button type="button" (click)="probarYGuardar()" [disabled]="probando()" class="btn-primary w-full">
              {{ probando() ? 'Probando conexión...' : 'Probar y guardar' }}
            </button>
          } @else {
            <button type="button" (click)="guardarUsbCups()" class="btn-primary w-full">Guardar configuración</button>
          }
          @if (svc.estaConfigurada()) {
            <button type="button" (click)="limpiar()" class="btn-danger w-full">Eliminar configuración</button>
          }
        </div>

      </div>
    </div>
  `,
})
export class ImpresoraConfigComponent implements OnInit {
  readonly svc = inject(ImpresoraService);
  private readonly fb = inject(FormBuilder);

  readonly tipoSeleccionado = signal<TipoConexionImpresora>('wifi');
  readonly probando = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly esError = signal(false);

  formWifi = this.fb.group({
    ip: ['', Validators.required],
    puerto: [9100, [Validators.required, Validators.min(1), Validators.max(65535)]],
    bridgeUrl: ['http://localhost:3000', Validators.required],
  });

  ngOnInit(): void {
    const cfg = this.svc.config();
    this.tipoSeleccionado.set(cfg.tipoConexion);
    this.formWifi.patchValue({ bridgeUrl: cfg.bridgeUrl });
    if (cfg.tipoConexion === 'wifi' && cfg.ip) {
      this.formWifi.patchValue({ ip: cfg.ip, puerto: cfg.puerto });
    }
  }

  setTipo(tipo: TipoConexionImpresora): void {
    this.tipoSeleccionado.set(tipo);
    this.mensaje.set(null);
  }

  async probarYGuardar(): Promise<void> {
    this.formWifi.markAllAsTouched();
    if (this.formWifi.invalid) return;

    const ip = this.formWifi.value['ip']!;
    const puerto = this.formWifi.value['puerto']!;
    const bridgeUrl = this.formWifi.value['bridgeUrl'] ?? '';

    this.svc.guardarConfiguracion(ip, puerto, 'wifi', bridgeUrl);
    this.probando.set(true);
    this.mensaje.set(null);

    try {
      const ok = await this.svc.probarConexion();
      if (ok) {
        this.mostrar('Impresora conectada y configurada correctamente.', false);
      } else {
        this.mostrar('No se pudo conectar a la impresora. Configuración guardada de todas formas.', true);
      }
    } catch {
      this.mostrar('Error al probar la conexión. Configuración guardada.', true);
    } finally {
      this.probando.set(false);
    }
  }

  async buscarImpresora(): Promise<void> {
    this.mensaje.set(null);
    const ip = await this.svc.descubrirImpresora();
    if (ip) {
      this.formWifi.patchValue({ ip, puerto: 9100 });
      this.mostrar(`Impresora encontrada en ${ip}. Configuración guardada.`, false);
    } else {
      this.mostrar('No se encontró ninguna impresora en la red. Verifica que esté encendida y conectada.', true);
    }
  }

  guardarUsbCups(): void {
    const bridgeUrl = this.formWifi.value['bridgeUrl'] ?? '';
    this.svc.guardarConfiguracion('', 0, 'usb_cups', bridgeUrl);
    this.mostrar('Configuración USB/CUPS guardada.', false);
  }

  limpiar(): void {
    if (!confirm('¿Eliminar la configuración de impresora?')) return;
    this.svc.limpiar();
    this.tipoSeleccionado.set('wifi');
    this.formWifi.reset({ ip: '', puerto: 9100, bridgeUrl: 'http://localhost:3000' });
    this.mostrar('Configuración eliminada.', false);
  }

  private mostrar(msg: string, error: boolean): void {
    this.mensaje.set(msg);
    this.esError.set(error);
  }
}
