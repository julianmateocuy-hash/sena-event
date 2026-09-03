// supabase/functions/create-staff-user/index.ts
// Sólo invocable por un super_admin autenticado. Crea el usuario en Supabase
// Auth (con contraseña temporal aleatoria) y ajusta su rol en `profiles`.
// El trigger handle_new_auth_user ya crea la fila en profiles con rol
// 'delegate' por defecto; aquí la actualizamos si se pidió 'event_admin'.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("No autenticado.", 401);

  try {
    const { full_name, email, role } = await req.json();
    if (!full_name || !email || !["event_admin", "delegate"].includes(role)) {
      return jsonError("Datos inválidos.", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verificar que quien llama es super_admin
    const supabaseAsCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseAsCaller.auth.getUser();
    if (!userData?.user) return jsonError("Sesión inválida.", 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (callerProfile?.role !== "super_admin") return jsonError("No autorizado.", 403);

    // Crear el usuario con contraseña temporal — se le debe enviar un enlace
    // de restablecimiento aparte (no se expone la contraseña aquí).
    const tempPassword = crypto.randomUUID();
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) return jsonError(createError.message, 400);

    if (role === "event_admin") {
      await supabaseAdmin.from("profiles").update({ role: "event_admin" }).eq("id", created.user.id);
    }

    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${Deno.env.get("APP_URL") ?? "http://localhost:5173"}/reset-password`,
    });

    return new Response(JSON.stringify({ id: created.user.id, email }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error inesperado.", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
