// supabase/functions/register-attendee/index.ts
// Ejecuta el registro completo con la Service Role Key (nunca expuesta al frontend).
// Valida datos, crea/actualiza el attendee, crea la inscripción y dispara el correo.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const body = await req.json();
    const {
      event_id,
      full_name,
      document_type,
      document_number,
      email,
      phone,
      program,
      institution,
      city,
      avatar_url,
    } = body;

    // Validación de campos obligatorios
    for (const [key, value] of Object.entries({ event_id, full_name, document_type, document_number, email, phone })) {
      if (!value || String(value).trim() === "") {
        return jsonError(`Falta el campo requerido: ${key}`, 400);
      }
    }
    if (!EMAIL_REGEX.test(email)) return jsonError("Correo electrónico inválido.", 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Perfil único por documento
    const { data: attendee, error: attendeeError } = await supabaseAdmin.rpc(
      "find_or_create_attendee",
      {
        p_full_name: full_name,
        p_document_type: document_type,
        p_document_number: document_number,
        p_email: email,
        p_phone: phone,
        p_program: program ?? null,
        p_institution: institution ?? null,
        p_city: city ?? null,
        p_avatar_url: avatar_url ?? null,
      }
    );
    if (attendeeError) return jsonError(attendeeError.message, 400);

    // 2. Inscripción al evento (sin duplicados, respeta capacidad)
    const { data: regResult, error: regError } = await supabaseAdmin.rpc("register_for_event", {
      p_event_id: event_id,
      p_attendee_id: attendee.id,
    });
    if (regError) return jsonError(regError.message, 400);

    const registration = Array.isArray(regResult) ? regResult[0] : regResult;

    // 3. Correo con el QR (best-effort: no bloquea la respuesta al usuario)
    supabaseAdmin.functions
      .invoke("send-registration-email", {
        body: { attendee_id: attendee.id, event_id },
      })
      .catch((err) => console.error("send-registration-email failed:", err));

    return new Response(
      JSON.stringify({
        attendee,
        registration: registration.registration,
        already_registered: registration.already_registered,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
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
