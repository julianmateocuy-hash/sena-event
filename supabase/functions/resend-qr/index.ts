// supabase/functions/resend-qr/index.ts
// Reenvía el correo con el QR. El rate limiting real (máx. 3/hora) vive en
// Postgres (request_qr_resend RPC, ver schema.sql §14) — esta función solo
// orquesta la llamada y dispara send-registration-email si está permitido.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { attendee_id } = await req.json();
    if (!attendee_id) throw new Error("Falta attendee_id.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rateCheck, error: rateError } = await supabaseAdmin.rpc("request_qr_resend", {
      p_attendee_id: attendee_id,
    });
    if (rateError) throw rateError;

    if (!rateCheck.ok) {
      return new Response(JSON.stringify(rateCheck), {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Última inscripción del asistente, para saber a qué evento reenviar el QR.
    const { data: lastRegistration } = await supabaseAdmin
      .from("event_registrations")
      .select("event_id")
      .eq("attendee_id", attendee_id)
      .order("registration_date", { ascending: false })
      .limit(1)
      .single();

    if (!lastRegistration) throw new Error("El asistente no tiene inscripciones.");

    await supabaseAdmin.functions.invoke("send-registration-email", {
      body: { attendee_id, event_id: lastRegistration.event_id },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error inesperado." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
