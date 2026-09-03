import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEventBySlug } from "@/services/events";
import { registerAttendee } from "@/services/registration";
import { uploadAvatar, validateImageFile } from "@/avatar/avatar";
import { AutoAvatar } from "@/avatar/AttendeeAvatar";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/Button";
import type { EventRow } from "@/types/database";

const DOCUMENT_TYPES = ["CC", "TI", "CE", "PA"];

export default function PublicRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const [event, setEvent] = useState<EventRow | null | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!slug) return;
    getEventBySlug(slug).then(setEvent);
  }, [slug]);

  function handleAvatarChange(file: File | null) {
    setError(null);
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const documentNumber = String(form.get("document_number") ?? "").trim();

    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, documentNumber);
      }

      const { attendee, already_registered } = await registerAttendee({
        event_id: event.id,
        full_name: String(form.get("full_name") ?? "").trim(),
        document_type: String(form.get("document_type") ?? "CC"),
        document_number: documentNumber,
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        program: String(form.get("program") ?? "").trim() || undefined,
        institution: String(form.get("institution") ?? "").trim() || undefined,
        city: String(form.get("city") ?? "").trim() || undefined,
        avatar_url: avatarUrl,
      });

      navigate("/registro/exito", {
        state: {
          attendee,
          eventName: event.name,
          alreadyRegistered: already_registered,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible completar el registro.";
      setError(message);
      show(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (event === undefined) return <CenteredMessage text="Cargando evento…" />;
  if (event === null) return <CenteredMessage text="Este evento no existe o el enlace es incorrecto." />;
  if (event.status === "finished" || event.status === "cancelled") {
    return <CenteredMessage text="Este evento ya no acepta registros." />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-8">
      {event.banner_url && (
        <img
          src={event.banner_url}
          alt=""
          className="mb-5 h-40 w-full rounded-2xl object-cover"
        />
      )}
      <p className="font-mono text-xs tracking-wide text-signal">SENA · REGISTRO DE EVENTO</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-paper">{event.name}</h1>
      {event.description && <p className="mt-2 text-sm text-mist">{event.description}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Fecha" value={`${event.start_date} — ${event.end_date}`} />
        {event.location && <Detail label="Lugar" value={event.location} />}
      </dl>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <AutoAvatar fullName={fullName || "?"} size={64} />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="hidden"
              onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs text-mist">
            Toca para tomar o elegir una foto. Si no subes una, generamos un avatar automático.
          </p>
        </div>

        <Field
          label="Nombre completo"
          name="full_name"
          required
          onChange={(v) => setFullName(v)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-mist">Tipo de documento</label>
            <select
              name="document_type"
              required
              className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-paper"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Field label="Número de documento" name="document_number" required />
        </div>

        <Field label="Correo electrónico" name="email" type="email" required />
        <Field label="Teléfono" name="phone" type="tel" required />
        <Field label="Programa" name="program" />
        <Field label="Institución / área" name="institution" />
        <Field label="Ciudad" name="city" />

        <label className="mt-2 flex items-start gap-2 text-xs text-mist">
          <input type="checkbox" required className="mt-0.5" />
          Acepto el tratamiento de mis datos personales para fines del evento.
        </label>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full py-3">
          {submitting ? "Enviando…" : "Completar registro"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-mist">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-paper placeholder:text-mist/50"
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-mist">{label}</dt>
      <dd className="text-paper">{value}</dd>
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-mist">
      {text}
    </div>
  );
}
