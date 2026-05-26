// ⚠️  TODO PRE-DEPLOY ────────────────────────────────────────────────
// Reemplaza 'tu-dominio.com' por el dominio real de producción antes
// del primer build prod. Sin este cambio, todas las llamadas API
// fallarán o serán enviadas a un dominio que no controlamos
// (riesgo crítico: interceptación de tokens).
// Ver "Pre-deploy checklist" en CLAUDE.md.
// ────────────────────────────────────────────────────────────────────
export const environment = {
  production: true,
  apiBaseUrl: 'https://tu-dominio.com/api/',     // TODO PRE-DEPLOY
  inviteBaseUrl: 'https://tu-dominio.com/invite', // TODO PRE-DEPLOY
};
