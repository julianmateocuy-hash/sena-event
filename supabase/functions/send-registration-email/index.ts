// supabase/functions/send-registration-email/index.ts
// Envía el correo con el QR tras el registro. El proveedor de correo vive
// detrás de sendViaProvider() para poder cambiarlo (Resend, Postmark, SES...)
// sin tocar el resto del sistema. La API key vive solo en Secrets.
import { createClient } from "jsr:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { attendee_id, event_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: attendee }, { data: event }] = await Promise.all([
      supabaseAdmin.from("attendees").select("*").eq("id", attendee_id).single(),
      supabaseAdmin.from("events").select("*").eq("id", event_id).single(),
    ]);
    if (!attendee || !event) throw new Error("Asistente o evento no encontrado.");

    const qrDataUrl = await QRCode.toDataURL(`SENA-QR:${attendee.qr_token}`, {
      errorCorrectionLevel: "M",
      scale: 8,
    });
    const qrBase64 = qrDataUrl.split(",")[1];

    await sendViaProvider({
      to: attendee.email,
      subject: `Tu credencial para ${event.name}`,
      html: buildEmailHtml(attendee.full_name, event),
      attachments: [{ filename: "qr-acceso.png", contentBase64: qrBase64 }],
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error inesperado." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Único punto de contacto con el proveedor de correo transaccional.
 * Cambiar de proveedor implica editar solo esta función.
 */
async function sendViaProvider(params: {
  to: string;
  subject: string;
  html: string;
  attachments: { filename: string; contentBase64: string }[];
}) {
  const apiKey = Deno.env.get("EMAIL_API_KEY");
  if (!apiKey) throw new Error("EMAIL_API_KEY no configurada en Secrets.");

  // Mientras no tengas un dominio propio verificado en Resend, usa el
  // remitente de pruebas por defecto (sólo entrega a tu correo de cuenta).
  // Cuando verifiques tu dominio, agrega el Secret EMAIL_FROM con tu
  // remitente real (ej. "SENA Eventos <eventos@tudominio.com>").
  const from = Deno.env.get("EMAIL_FROM") ?? "SENA Eventos <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      attachments: params.attachments.map((a) => ({
        filename: a.filename,
        content: a.contentBase64,
        // Necesario para que <img src="cid:..."> resuelva la imagen incrustada:
        // sin content_id, Resend adjunta el archivo pero no lo vincula al cid
        // referenciado en el HTML, y la imagen llega rota.
        content_id: a.filename,
      })),
    }),
  });

  if (!res.ok) throw new Error(`Proveedor de correo respondió ${res.status}: ${await res.text()}`);
}

function buildEmailHtml(fullName: string, event: { name: string; location: string | null; start_date: string; start_time: string | null }) {
  return `
    <div style="font-family: sans-serif; color:#0B1B13;">
      <p>Hola ${fullName},</p>
      <p>Tu registro para <strong>${event.name}</strong> fue confirmado.</p>
      <p>
        Fecha: ${event.start_date}${event.start_time ? " · " + event.start_time : ""}<br/>
        ${event.location ? "Lugar: " + event.location : ""}
      </p>
      <p>Este código QR es personal. Preséntalo al momento de ingresar y salir del evento.</p>
      <img src="cid:qr-acceso.png" alt="Código QR" width="220" />
    </div>
  `;
}
