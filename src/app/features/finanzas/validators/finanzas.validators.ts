import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function montoPositivoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = parseFloat(control.value ?? '0');
    return val > 0 ? null : { montoInvalido: 'El monto debe ser mayor a 0' };
  };
}

export function montoNoNegativoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = parseFloat(control.value ?? '0');
    return val >= 0 ? null : { montoNegativo: 'El monto no puede ser negativo' };
  };
}
