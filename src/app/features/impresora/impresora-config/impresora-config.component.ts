import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { ImpresoraService, TipoConexionImpresora } from '../impresora.service';

@Component({
  selector: 'app-impresora-config',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-content max-w-lg pb-8" style="display:flex;flex-direction:column;gap:0.875rem">
      <div class="page-header">
        <button type="button" (click)="location.back()" class="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver
        </button>
        <h1 class="page-title">Configurar Impresora</h1>
      </div>

      @if (svc.estaConfigurada()) {
        <div style="background:#ECFDF5;border:1px solid #10B981;border-radius: 16px;padding:0.875rem;display:flex;align-items:center;gap:0.75rem">
          <div style="width:32px;height:32px;background:#10B981;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p style="font-size:0.8rem;font-weight:600;color:#10B981;margin:0">Impresora configurada</p>
            @if (svc.config().tipoConexion === 'wifi') {
              <p style="font-size:0.72rem;color:#10B981;margin:0">WiFi · {{ svc.config().ip }}:{{ svc.config().puerto }}</p>
            } @else {
              <p style="font-size:0.72rem;color:#10B981;margin:0">USB / Sistema (CUPS)</p>
            }
          </div>
        </div>
      }

      <!-- Tipo conexión -->
      <div class="card">
        <p class="section-title" style="margin-bottom:0.75rem">Tipo de conexión</p>
        <div style="display:flex;gap:0.5rem">
          <button type="button" (click)="setTipo('wifi')" [class]="tipoSeleccionado() === 'wifi' ? 'chip chip-active' : 'chip'" style="flex:1;justify-content:center;gap:0.4rem">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            WiFi
          </button>
          <button type="button" (click)="setTipo('usb_cups')" [class]="tipoSeleccionado() === 'usb_cups' ? 'chip chip-active' : 'chip'" style="flex:1;justify-content:center;gap:0.4rem">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            USB / Sistema
          </button>
        </div>
      </div>

      @if (tipoSeleccionado() === 'wifi') {
        <div class="card">
          <form [formGroup]="formWifi" style="display:flex;flex-direction:column;gap:0.75rem">
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

      @if (tipoSeleccionado() === 'usb_cups') {
        <div class="info-banner">
          <strong>Impresión por sistema (CUPS)</strong><br>
          Se usará un servidor bridge local (<code>localhost:3000</code>) que gestiona la
          comunicación con la impresora USB. La impresora debe estar configurada en CUPS.
        </div>
      }

      @if (mensaje()) {
        <div [class]="esError() ? 'error-banner' : 'success-banner'">{{ mensaje() }}</div>
      }

      <div style="display:flex;flex-direction:column;gap:0.5rem">
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
  `,
})
export class ImpresoraConfigComponent implements OnInit {
  readonly svc = inject(ImpresoraService);
  readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);

  readonly tipoSeleccionado = signal<TipoConexionImpresora>('wifi');
  readonly probando = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly esError = signal(false);

  formWifi = this.fb.group({
    ip: ['', Validators.required],
    puerto: [9100, [Validators.required, Validators.min(1), Validators.max(65535)]],
  });

  ngOnInit(): void {
    const cfg = this.svc.config();
    this.tipoSeleccionado.set(cfg.tipoConexion);
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

    this.svc.guardarConfiguracion(ip, puerto, 'wifi');
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

  guardarUsbCups(): void {
    this.svc.guardarConfiguracion('', 0, 'usb_cups');
    this.mostrar('Configuración USB/CUPS guardada.', false);
  }

  limpiar(): void {
    if (!confirm('¿Eliminar la configuración de impresora?')) return;
    this.svc.limpiar();
    this.tipoSeleccionado.set('wifi');
    this.formWifi.reset({ ip: '', puerto: 9100 });
    this.mostrar('Configuración eliminada.', false);
  }

  private mostrar(msg: string, error: boolean): void {
    this.mensaje.set(msg);
    this.esError.set(error);
  }
}
