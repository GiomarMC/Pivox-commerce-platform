import { TestBed } from '@angular/core/testing';
import { CarritoService } from './carrito.service';
import { ProductoCatalogoModel } from '../inventario/models/producto.model';

function makeProducto(id: number, precio: string): ProductoCatalogoModel {
  return {
    productoId: id,
    nombre: `Producto ${id}`,
    codigo: `COD${id}`,
    imagen: null,
    tipoIgv: 'GRAVADO',
    unidadMedida: 'UND',
    precioVentaMercado: precio,
    precioVentaBase: null,
    stock: 10,
  } as unknown as ProductoCatalogoModel;
}

describe('CarritoService', () => {
  let svc: CarritoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(CarritoService);
    svc.limpiar();
  });

  it('inicia con carrito vacío', () => {
    expect(svc.items().length).toBe(0);
    expect(svc.total()).toBe(0);
    expect(svc.count()).toBe(0);
  });

  it('calcula el total correctamente al agregar ítems', () => {
    svc.agregarItem(makeProducto(1, '10.00'), false); // 1 × 10.00
    svc.agregarItem(makeProducto(2, '25.50'), false); // 1 × 25.50
    expect(svc.total()).toBeCloseTo(35.5, 2);
    expect(svc.count()).toBe(2);
  });

  it('incrementa cantidad al agregar el mismo producto', () => {
    const prod = makeProducto(1, '10.00');
    svc.agregarItem(prod, false);
    svc.agregarItem(prod, false);
    expect(svc.items().length).toBe(1);
    expect(svc.items()[0].cantidad).toBe(2);
    expect(svc.total()).toBeCloseTo(20, 2);
  });

  it('elimina un ítem por productoId y devuelve el recuento correcto', () => {
    svc.agregarItem(makeProducto(1, '10.00'), false);
    svc.agregarItem(makeProducto(2, '5.00'), false);
    svc.eliminarItem(1, false);
    expect(svc.items().length).toBe(1);
    expect(svc.items()[0].productoId).toBe(2);
    expect(svc.total()).toBeCloseTo(5, 2);
  });

  it('limpiar vacía el carrito', () => {
    svc.agregarItem(makeProducto(1, '10.00'), false);
    svc.limpiar();
    expect(svc.items().length).toBe(0);
    expect(svc.total()).toBe(0);
  });
});
