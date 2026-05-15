import { Injectable, signal } from '@angular/core';

export type TipoConexionImpresora = 'wifi' | 'usb_cups';

export interface ImpresoraConfig {
  ip: string;
  puerto: number;
  tipoConexion: TipoConexionImpresora;
}

const IP_KEY = 'impresora_ip';
const PORT_KEY = 'impresora_puerto';
const TIPO_KEY = 'impresora_tipo_conexion';
const BRIDGE_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ImpresoraService {
  private readonly _config = signal<ImpresoraConfig>(this.cargarConfig());
  readonly config = this._config.asReadonly();

  estaConfigurada(): boolean {
    const c = this._config();
    return c.tipoConexion === 'usb_cups' || c.ip.trim() !== '';
  }

  private cargarConfig(): ImpresoraConfig {
    return {
      ip: localStorage.getItem(IP_KEY) ?? '',
      puerto: parseInt(localStorage.getItem(PORT_KEY) ?? '9100', 10),
      tipoConexion: (localStorage.getItem(TIPO_KEY) ?? 'wifi') as TipoConexionImpresora,
    };
  }

  guardarConfiguracion(ip: string, puerto: number, tipoConexion: TipoConexionImpresora): void {
    localStorage.setItem(IP_KEY, ip.trim());
    localStorage.setItem(PORT_KEY, String(puerto));
    localStorage.setItem(TIPO_KEY, tipoConexion);
    this._config.set({ ip: ip.trim(), puerto, tipoConexion });
  }

  async probarConexion(): Promise<boolean> {
    const cfg = this._config();
    try {
      const resp = await fetch(`${BRIDGE_URL}/test-printer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cfg.ip, puerto: cfg.puerto }),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async imprimirTicket(contenidoEscPos: string): Promise<void> {
    const cfg = this._config();
    const resp = await fetch(`${BRIDGE_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: cfg.ip, puerto: cfg.puerto, contenido: contenidoEscPos }),
    });
    if (!resp.ok) {
      throw new Error(`Error al imprimir: ${resp.statusText}`);
    }
  }

  async imprimirPdfUrl(pdfUrl: string): Promise<void> {
    const cfg = this._config();
    const resp = await fetch(`${BRIDGE_URL}/print-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pdfUrl, ip: cfg.ip, puerto: cfg.puerto }),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: string };
      throw new Error((body as { error?: string }).error ?? `Error al imprimir PDF: ${resp.statusText}`);
    }
  }

  async imprimirPdfBlob(blob: Blob): Promise<void> {
    const cfg = this._config();
    const base64 = await blobToBase64(blob);
    const resp = await fetch(`${BRIDGE_URL}/print-pdf-raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, ip: cfg.ip, puerto: cfg.puerto }),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `Error al imprimir PDF: ${resp.statusText}`);
    }
  }

  limpiar(): void {
    [IP_KEY, PORT_KEY, TIPO_KEY].forEach(k => localStorage.removeItem(k));
    this._config.set({ ip: '', puerto: 9100, tipoConexion: 'wifi' });
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
