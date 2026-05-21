import { Injectable, computed, signal } from '@angular/core';

export type TipoConexionImpresora = 'wifi' | 'usb_cups';

export interface ImpresoraConfig {
  ip: string;
  puerto: number;
  tipoConexion: TipoConexionImpresora;
  bridgeUrl: string;
}

const IP_KEY     = 'impresora_ip';
const PORT_KEY   = 'impresora_puerto';
const TIPO_KEY   = 'impresora_tipo_conexion';
const BRIDGE_KEY = 'impresora_bridge_url';
const DEFAULT_BRIDGE_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ImpresoraService {
  private readonly _config = signal<ImpresoraConfig>(this.cargarConfig());
  readonly config = this._config.asReadonly();

  estaConfigurada(): boolean {
    const c = this._config();
    return c.tipoConexion === 'usb_cups' || c.ip.trim() !== '';
  }

  readonly bridgeUrl = computed(() => this._config().bridgeUrl);
  readonly descubriendo = signal(false);

  async descubrirImpresora(): Promise<string | null> {
    this.descubriendo.set(true);
    try {
      const cfg = this._config();
      const resp = await fetch(`${cfg.bridgeUrl}/discover-printer`);
      if (!resp.ok) return null;
      const data = await resp.json() as { found: boolean; ip?: string; puerto?: number };
      if (data.found && data.ip) {
        this.guardarConfiguracion(data.ip, data.puerto ?? 9100, 'wifi', cfg.bridgeUrl);
        return data.ip;
      }
      return null;
    } catch {
      return null;
    } finally {
      this.descubriendo.set(false);
    }
  }

  private cargarConfig(): ImpresoraConfig {
    return {
      ip: localStorage.getItem(IP_KEY) ?? '',
      puerto: parseInt(localStorage.getItem(PORT_KEY) ?? '9100', 10),
      tipoConexion: (localStorage.getItem(TIPO_KEY) ?? 'wifi') as TipoConexionImpresora,
      bridgeUrl: localStorage.getItem(BRIDGE_KEY) ?? DEFAULT_BRIDGE_URL,
    };
  }

  guardarConfiguracion(ip: string, puerto: number, tipoConexion: TipoConexionImpresora, bridgeUrl: string): void {
    const url = bridgeUrl.trim() || DEFAULT_BRIDGE_URL;
    localStorage.setItem(IP_KEY, ip.trim());
    localStorage.setItem(PORT_KEY, String(puerto));
    localStorage.setItem(TIPO_KEY, tipoConexion);
    localStorage.setItem(BRIDGE_KEY, url);
    this._config.set({ ip: ip.trim(), puerto, tipoConexion, bridgeUrl: url });
  }

  async probarConexion(): Promise<boolean> {
    const cfg = this._config();
    try {
      const resp = await fetch(`${this._config().bridgeUrl}/test-printer`, {
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
    const resp = await fetch(`${this._config().bridgeUrl}/print`, {
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
    const proxyUrl = `${cfg.bridgeUrl}/proxy-pdf?url=${encodeURIComponent(pdfUrl)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) throw new Error(`No se pudo descargar el PDF: ${resp.statusText}`);
    return this.imprimirPdfBlob(await resp.blob());
  }

  async imprimirPdfBlob(blob: Blob): Promise<void> {
    const cfg    = this._config();
    const base64 = await this.pdfBlobToBase64Image(blob);
    const resp   = await fetch(`${cfg.bridgeUrl}/print-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, ip: cfg.ip, puerto: cfg.puerto }),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `Error al imprimir: ${resp.statusText}`);
    }
  }

  private async pdfBlobToBase64Image(blob: Blob): Promise<string> {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

    const data = await blob.arrayBuffer();
    const pdf  = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);

    const PRINTER_WIDTH = 576;
    const viewport       = page.getViewport({ scale: 1 });
    const scaledViewport = page.getViewport({ scale: PRINTER_WIDTH / viewport.width });

    const canvas  = document.createElement('canvas');
    canvas.width  = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport: scaledViewport }).promise;

    return canvas.toDataURL('image/png').split(',')[1];
  }

  limpiar(): void {
    [IP_KEY, PORT_KEY, TIPO_KEY, BRIDGE_KEY].forEach(k => localStorage.removeItem(k));
    this._config.set({ ip: '', puerto: 9100, tipoConexion: 'wifi', bridgeUrl: DEFAULT_BRIDGE_URL });
  }
}

