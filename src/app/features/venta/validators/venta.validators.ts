import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function rucValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) return null;
    if (!/^\d{11}$/.test(value)) return { rucInvalido: true };
    return null;
  };
}

export function noRucEnBoletaValidator(tipoComprobanteControl: AbstractControl): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (tipoComprobanteControl.value === '03' && control.value === '6') {
      return { rucEnBoleta: true };
    }
    return null;
  };
}

export function ventaFormValidator(group: AbstractControl): ValidationErrors | null {
  const tipoVenta: string = group.get('tipoVenta')?.value ?? '';
  const tipoComprobante: string = group.get('tipoComprobante')?.value ?? '';
  const clienteId: number | null = group.get('clienteId')?.value ?? null;
  const usarClienteNuevo: boolean = group.get('usarClienteNuevo')?.value ?? false;
  const clienteNuevo = group.get('clienteNuevo');
  const tipoDocumento: string = clienteNuevo?.get('tipoDocumento')?.value ?? '';
  const numeroDocumento: string = clienteNuevo?.get('numeroDocumento')?.value ?? '';
  const nombre: string = clienteNuevo?.get('nombre')?.value ?? '';

  if (tipoVenta === 'CREDITO') {
    const tieneClienteExistente = clienteId != null;
    const tieneClienteNuevo = usarClienteNuevo && nombre.trim().length > 0 && numeroDocumento.trim().length > 0;
    if (!tieneClienteExistente && !tieneClienteNuevo) {
      return { clienteRequeridoCredito: true };
    }
  }

  if (tipoVenta === 'SUNAT' && tipoComprobante === '01') {
    const tieneRucExistente = clienteId != null;
    const tieneRucNuevo = usarClienteNuevo && tipoDocumento === '6' && /^\d{11}$/.test(numeroDocumento);
    if (!tieneRucExistente && !tieneRucNuevo) {
      return { facturaRequiereRuc: true };
    }
  }

  if (tipoVenta === 'SUNAT' && tipoComprobante === '03') {
    if (usarClienteNuevo && tipoDocumento === '6') {
      return { boletaNoAdmiteRuc: true };
    }
  }

  return null;
}
