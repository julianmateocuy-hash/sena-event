import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * supabase-js sólo da un mensaje genérico ("Edge Function returned a
 * non-2xx status code") cuando una función invoke() falla — el mensaje
 * real que la función devolvió en su body JSON (`{ error: "..." }`)
 * queda dentro de `error.context` (la Response cruda). Esta función lo
 * extrae para poder mostrárselo al usuario tal cual.
 */
export async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      // el body no era JSON válido — seguimos con el mensaje genérico
    }
  }
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
