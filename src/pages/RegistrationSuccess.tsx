import { useLocation, Navigate } from "react-router-dom";
import { Credential3D } from "@/qr/Credential3D";
import { downloadQr, generateQrDataUrl } from "@/qr/qr";
import type { Attendee } from "@/types/database";

interface LocationState {
  attendee: Attendee;
  eventName: string;
  alreadyRegistered: boolean;
}

export default function RegistrationSuccess() {
  const { state } = useLocation() as { state: LocationState | null };

  if (!state) return <Navigate to="/" replace />;

  const { attendee, eventName, alreadyRegistered } = state;

  async function handleDownload() {
    const dataUrl = await generateQrDataUrl(attendee.qr_token);
    downloadQr(dataUrl, `qr-${attendee.document_number}.png`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      {alreadyRegistered && (
        <p className="mb-4 rounded-lg bg-signal-amber/10 px-4 py-2 text-sm text-signal-amber">
          Ya estabas registrado en este evento — aquí tienes tu credencial de nuevo.
        </p>
      )}

      <Credential3D
        fullName={attendee.full_name}
        avatarUrl={attendee.avatar_url}
        eventName={eventName}
        qrToken={attendee.qr_token}
        onDownload={handleDownload}
      />

      <p className="mt-6 text-sm text-mist">
        Tu código QR también fue enviado a <span className="text-paper">{attendee.email}</span>.
        Preséntalo al ingresar y salir del evento.
      </p>
    </div>
  );
}
