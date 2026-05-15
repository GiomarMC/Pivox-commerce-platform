import { HttpErrorResponse } from '@angular/common/http';

export function extractApiError(err: HttpErrorResponse): string {
  const data = err.error as Record<string, unknown> | null;
  if (!data) return 'Error en la operación';

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length > 0) {
      const [key, value] = entries[0];
      const msg = Array.isArray(value) ? String(value[0]) : String(value);
      const genericKeys = new Set(['detail', 'non_field_errors', 'error', 'message']);
      return genericKeys.has(key) ? msg : `${key}: ${msg}`;
    }
  }

  return 'Error en la operación';
}
