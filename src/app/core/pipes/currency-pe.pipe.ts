import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyPe', standalone: true })
export class CurrencyPePipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    return `S/ ${(isNaN(num) ? 0 : num).toFixed(2)}`;
  }
}
