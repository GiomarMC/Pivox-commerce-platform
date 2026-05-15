import { FormControl, FormGroup } from '@angular/forms';
import { rucValidator, ventaFormValidator } from './venta.validators';

describe('rucValidator', () => {
  const validator = rucValidator();

  it('acepta RUC válido de 11 dígitos', () => {
    const control = new FormControl('20123456789');
    expect(validator(control)).toBeNull();
  });

  it('rechaza RUC con menos de 11 dígitos', () => {
    const control = new FormControl('2012345');
    expect(validator(control)).toEqual({ rucInvalido: true });
  });

  it('rechaza RUC con más de 11 dígitos', () => {
    const control = new FormControl('201234567890');
    expect(validator(control)).toEqual({ rucInvalido: true });
  });

  it('rechaza RUC con letras', () => {
    const control = new FormControl('2012345678A');
    expect(validator(control)).toEqual({ rucInvalido: true });
  });

  it('permite valor vacío (campo opcional)', () => {
    const control = new FormControl('');
    expect(validator(control)).toBeNull();
  });
});

describe('ventaFormValidator', () => {
  function makeGroup(overrides: Record<string, unknown> = {}): FormGroup {
    return new FormGroup(
      {
        tipoVenta: new FormControl(overrides['tipoVenta'] ?? 'CONTADO'),
        tipoComprobante: new FormControl(overrides['tipoComprobante'] ?? ''),
        clienteId: new FormControl(overrides['clienteId'] ?? null),
        usarClienteNuevo: new FormControl(overrides['usarClienteNuevo'] ?? false),
        clienteNuevo: new FormGroup({
          nombre: new FormControl(overrides['nombre'] ?? ''),
          tipoDocumento: new FormControl(overrides['tipoDocumento'] ?? ''),
          numeroDocumento: new FormControl(overrides['numeroDocumento'] ?? ''),
        }),
      },
      { validators: ventaFormValidator },
    );
  }

  it('no retorna error para venta CONTADO sin cliente', () => {
    const group = makeGroup({ tipoVenta: 'CONTADO' });
    expect(ventaFormValidator(group)).toBeNull();
  });

  it('retorna clienteRequeridoCredito si CREDITO sin cliente', () => {
    const group = makeGroup({ tipoVenta: 'CREDITO' });
    expect(ventaFormValidator(group)).toEqual({ clienteRequeridoCredito: true });
  });

  it('no retorna error si CREDITO con clienteId existente', () => {
    const group = makeGroup({ tipoVenta: 'CREDITO', clienteId: 1 });
    expect(ventaFormValidator(group)).toBeNull();
  });

  it('retorna facturaRequiereRuc si SUNAT factura sin cliente RUC', () => {
    const group = makeGroup({ tipoVenta: 'SUNAT', tipoComprobante: '01' });
    expect(ventaFormValidator(group)).toEqual({ facturaRequiereRuc: true });
  });

  it('retorna boletaNoAdmiteRuc si SUNAT boleta con cliente de tipo RUC', () => {
    const group = makeGroup({
      tipoVenta: 'SUNAT',
      tipoComprobante: '03',
      usarClienteNuevo: true,
      tipoDocumento: '6',
    });
    expect(ventaFormValidator(group)).toEqual({ boletaNoAdmiteRuc: true });
  });
});
