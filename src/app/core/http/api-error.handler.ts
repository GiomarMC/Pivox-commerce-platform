import { HttpErrorResponse } from '@angular/common/http';

export function extractApiError(err: HttpErrorResponse): string {
  const data = err.error as unknown;
  if (!data) return 'Error en la operación';

  if (Array.isArray(data)) return String(data[0]) || 'Error en la operación';

  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length > 0) {
      const [key, value] = entries[0];
      const msg = Array.isArray(value) ? String(value[0]) : String(value);
      const genericKeys = new Set(['detail', 'non_field_errors', 'error', 'message']);
      return genericKeys.has(key) ? msg : `${key}: ${msg}`;
    }
  }

  return 'Error en la operación';
}
