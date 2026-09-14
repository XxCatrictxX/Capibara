import { getDatabaseDiagnostics } from './databaseService.js';

/** Diagnóstico de solo lectura; no muestra claves ni crea filas. */
export async function runDatabaseDiagnostics() {
  const result = await getDatabaseDiagnostics();
  const logger = result.ok ? console.info : console.error;
  logger('[Capibara · diagnóstico Supabase]', result);
  return result;
}
