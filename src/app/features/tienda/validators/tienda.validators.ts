import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function nombreSedeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    return value.trim().length >= 3 ? null : { minLength: 'Mínimo 3 caracteres' };
  };
}

export function ubigeoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    return /^\d{6}$/.test(value) ? null
      : { formatoUbigeo: 'El ubigeo debe tener exactamente 6 dígitos numéricos (código INEI)' };
  };
}

export function serieValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    return /^[A-Z]\d{3}$/.test(value) ? null
      : { formatoSerie: 'Formato inválido. Ejemplo: F001, B001, T001' };
  };
}
