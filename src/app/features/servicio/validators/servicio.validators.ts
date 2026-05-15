import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function servicioFormGroupValidator(group: AbstractControl): ValidationErrors | null {
  const tipo: string = group.get('tipoServicio')?.value ?? 'NORMAL';
  const clienteId: number | null = group.get('clienteId')?.value ?? null;

  if ((tipo === 'CREDITO' || tipo === 'SUNAT') && clienteId == null) {
    return { clienteRequerido: 'Se requiere un cliente para este tipo de servicio' };
  }
  return null;
}

export function fechaFinValidator(fechaInicioControl: AbstractControl): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const inicio = new Date(fechaInicioControl.value);
    const fin = new Date(control.value);
    return fin >= inicio ? null
      : { fechaFinAnterior: 'La fecha de fin no puede ser anterior a la de inicio' };
  };
}

export function totalPositivoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = parseFloat(control.value ?? '0');
    return val > 0 ? null : { totalInvalido: 'El total debe ser mayor a 0' };
  };
}
