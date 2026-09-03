import { createClient } from "@supabase/supabase-js";
import type { Database} from "@/types/supabase";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falla rápido y con claridad en vez de arrastrar un cliente inválido
  // por toda la app.
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env (ver README)."
  );
}

// Únicas credenciales permitidas en el frontend: URL pública + anon key.
// La service role key NUNCA debe importarse aquí — vive solo en Edge Functions.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
