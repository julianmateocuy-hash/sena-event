// supabase/functions/process-attendance/index.ts
// Wrapper delgado sobre la RPC process_attendance(). Existe para permitir que
// dispositivos externos (lectores dedicados, kioscos) llamen con el JWT del
// delegado sin exponer lógica de negocio fuera de Postgres. El frontend web
// llama la RPC directamente vía supabase-js (ver src/services/attendance.ts);
// esta función cubre el mismo camino para integraciones no-browser.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No autenticado." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { qr_token, event_id } = await req.json();
    if (!qr_token || !event_id) {
      return new Response(JSON.stringify({ error: "Faltan qr_token o event_id." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Cliente con el JWT del delegado que llama: auth.uid() dentro de la RPC
    // será el delegado, y process_attendance() valida sus permisos por sí misma.
    const supabaseAsUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabaseAsUser.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabaseAsUser.rpc("process_attendance", {
      p_qr_token: qr_token,
      p_event_id: event_id,
      p_delegate_id: userData.user.id,
    });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error inesperado." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
