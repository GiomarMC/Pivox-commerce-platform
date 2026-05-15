import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PagoPdfService {
  private readonly _blob = signal<Blob | null>(null);
  readonly blob = this._blob.asReadonly();

  guardar(blob: Blob): void {
    this._blob.set(blob);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 15_000);
  }

  limpiar(): void {
    this._blob.set(null);
  }
}
