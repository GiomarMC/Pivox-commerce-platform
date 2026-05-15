import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { VentaRepository } from '../../venta.repository';
import { ClienteModel } from '../../models/cliente.model';

@Component({
  selector: 'app-cliente-search',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .cs-wrap { position:relative; }
    .cs-selected { display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:#F9FAFB; border-radius:10px; border:1px solid #E2E6F0; }
    .cs-selected-info { flex:1; min-width:0; }
    .cs-selected-name { font-size:0.875rem; font-weight:600; color:#111827; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0; }
    .cs-selected-doc { font-size:0.75rem; color:#9CA3AF; margin:0; }
    .cs-change-btn { font-size:0.75rem; color:#DC2626; background:none; border:none; cursor:pointer; flex-shrink:0; font-family:inherit; padding:0; }
    .cs-change-btn:hover { text-decoration:underline; }
    .cs-hint { font-size:0.72rem; margin:0 0 0.375rem; }
    .cs-hint-warn { color:#D97706; }
    .cs-hint-muted { color:#9CA3AF; }
    .cs-dropdown { position:absolute; z-index:100; width:100%; top:calc(100% + 0.25rem); bottom:auto; background:#fff; border:1px solid #E2E6F0; border-radius:10px; box-shadow:0 4px 16px rgba(0,0,0,0.08); max-height:12rem; overflow-y:auto; }
    .cs-dropdown-btn { width:100%; text-align:left; padding:0.625rem 0.75rem; font-size:0.875rem; background:none; border:none; cursor:pointer; font-family:inherit; transition:background 0.1s; display:flex; align-items:center; gap:0.5rem; }
    .cs-dropdown-btn:hover { background:#F9FAFB; }
    .cs-dropdown-name { font-weight:600; color:#111827; }
    .cs-dropdown-doc { color:#9CA3AF; font-size:0.75rem; }
    .cs-no-results { font-size:0.75rem; color:#9CA3AF; margin:0.375rem 0 0; }
  `],
  template: `
    <div class="cs-wrap">
      @if (clienteSeleccionadoDisplay()) {
        <div class="cs-selected">
          <div class="cs-selected-info">
            <p class="cs-selected-name">{{ clienteSeleccionadoDisplay() }}</p>
            <p class="cs-selected-doc">{{ clienteDocumentoDisplay() }}</p>
          </div>
          <button type="button" (click)="limpiarSeleccion()" class="cs-change-btn">Cambiar</button>
        </div>
      } @else {
        <div>
          @if (tipoComprobante === '01') {
            <p class="cs-hint cs-hint-warn">Se requiere cliente con RUC (Factura)</p>
          } @else if (tipoComprobante === '03') {
            <p class="cs-hint cs-hint-muted">DNI u otro documento (no RUC en Boleta)</p>
          }
          <input
            type="text"
            [(ngModel)]="queryInput"
            (input)="onInput($any($event.target).value)"
            placeholder="Buscar cliente por nombre o documento..."
            class="field-input"
          />
          @if (isSearching()) {
            <p class="cs-no-results">Buscando...</p>
          }
          @if (mostrarDropdown() && resultados().length > 0) {
            <ul class="cs-dropdown" style="list-style:none;margin:0;padding:0">
              @for (c of resultados(); track c.id) {
                <li>
                  <button type="button" (click)="seleccionar(c)" class="cs-dropdown-btn">
                    <span class="cs-dropdown-name">{{ c.nombre }}</span>
                    <span class="cs-dropdown-doc">{{ c.numeroDocumento }}</span>
                  </button>
                </li>
              }
            </ul>
          }
          @if (mostrarDropdown() && resultados().length === 0 && !isSearching() && queryInput.length >= 2) {
            <p class="cs-no-results">Sin resultados para "{{ queryInput }}"</p>
          }
        </div>
      }
    </div>
  `,
})
export class ClienteSearchComponent implements OnInit {
  @Input() tipoComprobante: string | null = null;
  @Output() clienteSeleccionado = new EventEmitter<ClienteModel>();
  @Output() limpiar = new EventEmitter<void>();

  private readonly repo = inject(VentaRepository);
  private readonly auth = inject(AuthService);

  readonly resultados = signal<ClienteModel[]>([]);
  readonly isSearching = signal(false);
  readonly mostrarDropdown = signal(false);
  readonly clienteSeleccionadoDisplay = signal<string | null>(null);
  readonly clienteDocumentoDisplay = signal<string | null>(null);

  queryInput = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {}

  onInput(value: string): void {
    this.queryInput = value;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (value.length < 2) {
      this.resultados.set([]);
      this.mostrarDropdown.set(false);
      return;
    }
    this.debounceTimer = setTimeout(() => void this.buscar(value), 400);
  }

  private async buscar(query: string): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this.isSearching.set(true);
    this.mostrarDropdown.set(true);
    try {
      const clientes = await this.repo.getClientes(tiendaId, query);
      this.resultados.set(clientes);
    } catch {
      this.resultados.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  seleccionar(cliente: ClienteModel): void {
    this.clienteSeleccionadoDisplay.set(cliente.nombre);
    this.clienteDocumentoDisplay.set(`${cliente.tipoDocumento === '6' ? 'RUC' : 'DNI'}: ${cliente.numeroDocumento}`);
    this.mostrarDropdown.set(false);
    this.queryInput = '';
    this.clienteSeleccionado.emit(cliente);
  }

  limpiarSeleccion(): void {
    this.clienteSeleccionadoDisplay.set(null);
    this.clienteDocumentoDisplay.set(null);
    this.resultados.set([]);
    this.queryInput = '';
    this.mostrarDropdown.set(false);
    this.limpiar.emit();
  }
}
