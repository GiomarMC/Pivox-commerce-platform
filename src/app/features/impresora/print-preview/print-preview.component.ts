import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ImpresoraService } from '../impresora.service';
import { TicketConverter, TicketData } from '../ticket.converter';

@Component({
  selector: 'app-print-preview',
  standalone: true,
  styles: [`
    .pp-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:50; display:flex; align-items:center; justify-content:center; padding:1rem; }
    .pp-modal { background:#fff; border-radius: 16px; width:100%; max-width:40rem; box-shadow:0 8px 32px rgba(0,0,0,0.15); overflow:hidden; }
    .pp-header { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; border-bottom:1px solid #EEF1F6; }
    .pp-title { font-size:0.875rem; font-weight:600; color:#334155; margin:0; }
    .pp-close { width:28px; height:28px; border-radius: 14px; background:#F8FAFC; border:none; display:flex; align-items:center; justify-content:center; color:#64748B; cursor:pointer; }
    .pp-preview { overflow-y:auto; max-height:32rem; background:#F8FAFC; padding:0.75rem; display:flex; justify-content:center; }
    .pp-iframe { width:100%; border-radius: 14px; border:1px solid #EEF1F6; height:500px; }
    .pp-ticket { font-family:'Courier New',Courier,monospace; font-size:11px; width:260px; background:#fff; padding:12px 10px; border:1px dashed #ccc; line-height:1.5; white-space:pre; }
    .pp-error { margin:0.75rem 1rem 0; background:#FEF2F2; border:1px solid #EF4444; border-radius: 16px; padding:0.75rem; }
    .pp-error-title { font-size:0.75rem; font-weight:700; color:#EF4444; margin:0 0 0.2rem; }
    .pp-error-msg { font-size:0.75rem; color:#EF4444; margin:0; }
    .pp-error-hint { font-size:0.72rem; color:#EF4444; margin:0.25rem 0 0; }
    .pp-success { margin:0.75rem 1rem 0; background:#ECFDF5; border:1px solid #10B981; border-radius: 16px; padding:0.75rem; text-align:center; }
    .pp-success-msg { font-size:0.875rem; font-weight:700; color:#10B981; margin:0; }
    .pp-actions { padding:1rem; display:flex; flex-direction:column; gap:0.5rem; }
    .pp-spin { width:14px; height:14px; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; border-radius:50%; animation:pp-rotate 0.6s linear infinite; flex-shrink:0; }
    @keyframes pp-rotate { to { transform:rotate(360deg); } }
  `],
  template: `
    <div class="pp-backdrop" (click)="onOverlayClick($event)">
      <div class="pp-modal" (click)="$event.stopPropagation()">

        <div class="pp-header">
          <p class="pp-title">Vista previa del ticket</p>
          <button type="button" (click)="cerrar.emit()" class="pp-close" aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="pp-preview">
          @if (safePdfUrl()) {
            <iframe [src]="safePdfUrl()!" class="pp-iframe" title="Vista previa PDF"></iframe>
          } @else {
            <div class="pp-ticket" [innerHTML]="ticketHtml()"></div>
          }
        </div>

        @if (error()) {
          <div class="pp-error">
            <p class="pp-error-title">Error al imprimir</p>
            <p class="pp-error-msg">{{ error() }}</p>
            <p class="pp-error-hint">Verifica que el bridge esté corriendo: <code>node printer-bridge/server.js</code></p>
          </div>
        }
        @if (exito()) {
          <div class="pp-success">
            <p class="pp-success-msg">Enviado a la impresora</p>
          </div>
        }

        <div class="pp-actions">
          <button type="button" (click)="enviarAImpresora()" [disabled]="enviando() || exito()" class="btn-primary w-full">
            @if (enviando()) {
              <span class="pp-spin"></span>
              Enviando...
            } @else {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Enviar a impresora
            }
          </button>
          <button type="button" (click)="cerrar.emit()" class="btn-secondary w-full">Cancelar</button>
        </div>

      </div>
    </div>
  `,
})
export class PrintPreviewComponent {
  readonly pdfUrl     = input<string | null>(null);
  readonly pdfBlob    = input<Blob | null>(null);
  readonly ticketData = input<TicketData | null>(null);
  readonly cerrar     = output<void>();

  private readonly impresoraSvc = inject(ImpresoraService);
  private readonly sanitizer    = inject(DomSanitizer);

  readonly enviando = signal(false);
  readonly error    = signal<string | null>(null);
  readonly exito    = signal(false);

  readonly safePdfUrl = computed((): SafeResourceUrl | null => {
    const url = this.pdfUrl();
    if (url) return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    const blob = this.pdfBlob();
    if (blob) return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
    return null;
  });

  readonly ticketHtml = computed((): string => {
    const data = this.ticketData();
    if (!data) return '';
    return buildTicketHtml(data);
  });

  async enviarAImpresora(): Promise<void> {
    this.error.set(null);
    this.enviando.set(true);
    try {
      const url  = this.pdfUrl();
      const blob = this.pdfBlob();
      if (url) {
        await this.impresoraSvc.imprimirPdfUrl(url);
      } else if (blob) {
        await this.impresoraSvc.imprimirPdfBlob(blob);
      } else {
        const data = this.ticketData();
        if (!data) return;
        const escPos = new TicketConverter().toEscPos(data);
        await this.impresoraSvc.imprimirTicket(escPos);
      }
      this.exito.set(true);
      setTimeout(() => this.cerrar.emit(), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo conectar al bridge en localhost:3000';
      this.error.set(msg);
    } finally {
      this.enviando.set(false);
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar.emit();
    }
  }
}

function buildTicketHtml(data: TicketData): string {
  const W = 32;
  const lines: string[] = [];

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((W - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const row = (label: string, valor: string) => {
    const space = W - label.length - valor.length;
    return label + ' '.repeat(Math.max(1, space)) + valor;
  };

  lines.push(center(`<strong>${esc(data.nombreTienda)}</strong>`));
  if (data.ruc) lines.push(center(`RUC: ${esc(data.ruc)}`));
  if (data.direccion) lines.push(center(esc(data.direccion)));
  lines.push(center(esc(data.fecha)));

  if (data.tipoComprobante && data.numeroComprobante) {
    const tipo = data.tipoComprobante === '01' ? 'FACTURA' : data.tipoComprobante === '03' ? 'BOLETA' : 'COMPROBANTE';
    lines.push(center(tipo));
    lines.push(center(`N° ${data.numeroComprobante}`));
  }

  lines.push('-'.repeat(W));

  if (data.clienteNombre) {
    lines.push(`Cliente: ${esc(data.clienteNombre)}`);
  }

  for (const item of data.items) {
    const subtotalItem = (item.cantidad * item.precio).toFixed(2);
    const detalle = `  ${item.cantidad} x S/${item.precio.toFixed(2)}`;
    const pad = W - detalle.length - subtotalItem.length;
    lines.push(esc(item.nombre));
    lines.push(`${detalle}${' '.repeat(Math.max(0, pad))}${subtotalItem}`);
  }

  lines.push('-'.repeat(W));

  if (data.subtotal != null && data.igv != null) {
    lines.push(row('Subtotal', `S/${data.subtotal.toFixed(2)}`));
    lines.push(row('IGV (18%)', `S/${data.igv.toFixed(2)}`));
    lines.push('-'.repeat(W));
  }

  lines.push(`<strong>${row('TOTAL', `S/${data.total.toFixed(2)}`)}</strong>`);
  if (data.metodoPago) lines.push(`Pago: ${esc(data.metodoPago)}`);
  lines.push('');
  lines.push(center('Gracias por su preferencia'));

  return lines.join('\n');
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
