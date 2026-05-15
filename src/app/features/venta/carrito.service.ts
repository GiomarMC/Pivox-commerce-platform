import { Injectable, computed, signal } from '@angular/core';
import { CarritoItem } from './models/carrito.model';
import { ProductoCatalogoModel } from '../inventario/models/producto.model';

interface CarritoState {
  items: CarritoItem[];
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly _state = signal<CarritoState>({ items: [] });
  readonly state = this._state.asReadonly();

  readonly items = computed(() => this._state().items);
  readonly count = computed(() => this._state().items.reduce((acc, i) => acc + i.cantidad, 0));
  readonly total = computed(() =>
    this._state().items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0),
  );

  agregarItem(producto: ProductoCatalogoModel, esAveriado: boolean): void {
    this._state.update(s => {
      const idx = s.items.findIndex(
        i => i.productoId === producto.productoId && i.esAveriado === esAveriado,
      );
      if (idx >= 0) {
        const updated = [...s.items];
        updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + 1 };
        return { items: updated };
      }
      const precioVentaMercado = parseFloat(producto.precioVentaMercado);
      const newItem: CarritoItem = {
        productoId: producto.productoId,
        loteProductoId: null,
        nombre: producto.nombre,
        codigo: producto.codigo,
        imagen: producto.imagen,
        tipoIgv: producto.tipoIgv,
        unidadMedida: producto.unidadMedida,
        cantidad: 1,
        precioUnitario: precioVentaMercado,
        esAveriado,
        precioVentaMercado,
        precioVentaBase: producto.precioVentaBase,
        stockDisponible: esAveriado ? +producto.cantidadAveriada : +producto.cantidadDisponible,
      };
      return { items: [...s.items, newItem] };
    });
  }

  eliminarItem(productoId: number, esAveriado: boolean): void {
    this._state.update(s => ({
      items: s.items.filter(i => !(i.productoId === productoId && i.esAveriado === esAveriado)),
    }));
  }

  actualizarCantidad(productoId: number, esAveriado: boolean, cantidad: number): void {
    if (cantidad <= 0) {
      this.eliminarItem(productoId, esAveriado);
      return;
    }
    this._state.update(s => ({
      items: s.items.map(i =>
        i.productoId === productoId && i.esAveriado === esAveriado ? { ...i, cantidad } : i,
      ),
    }));
  }

  actualizarPrecio(productoId: number, esAveriado: boolean, precio: number): void {
    this._state.update(s => ({
      items: s.items.map(i =>
        i.productoId === productoId && i.esAveriado === esAveriado
          ? { ...i, precioUnitario: precio }
          : i,
      ),
    }));
  }

  actualizarAveriado(productoId: number, esAveriado: boolean, nuevoAveriado: boolean): void {
    this._state.update(s => ({
      items: s.items.map(i =>
        i.productoId === productoId && i.esAveriado === esAveriado
          ? { ...i, esAveriado: nuevoAveriado }
          : i,
      ),
    }));
  }

  actualizarLote(productoId: number, esAveriado: boolean, loteId: number | null): void {
    this._state.update(s => ({
      items: s.items.map(i =>
        i.productoId === productoId && i.esAveriado === esAveriado
          ? { ...i, loteProductoId: loteId }
          : i,
      ),
    }));
  }

  limpiar(): void {
    this._state.set({ items: [] });
  }
}
