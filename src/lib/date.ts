/**
 * Fecha de "hoy" en America/Bogota, como "YYYY-MM-DD".
 *
 * NUNCA usar `new Date().toISOString().slice(0, 10)` para esto: eso da la
 * fecha en UTC, que se adelanta un día respecto a Bogotá entre las 7pm y la
 * medianoche hora local (Colombia es UTC-5) — justo cuando más se usa el
 * scanner en eventos de tarde/noche. Ese desfase desincroniza cualquier
 * filtro `.eq("attendance_date", today)` del lado del cliente contra la
 * columna `attendance_date`, que el backend siempre calcula en hora de
 * Bogotá (ver process_attendance() en supabase/schema.sql, sección 13):
 * el registro se guarda bien, pero el frontend lo busca bajo la fecha
 * equivocada y parece que "no llegó".
 */
export function todayInBogota(): string {
  // El locale "en-CA" formatea como YYYY-MM-DD, que es justo lo que
  // necesita Postgres para comparar contra una columna `date`.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
