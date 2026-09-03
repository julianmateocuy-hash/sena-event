import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAttendeeProfile, type AttendeeProfileData } from "@/services/attendeeProfile";
import { AttendeeAvatar } from "@/avatar/AttendeeAvatar";

export default function AdminAttendeeProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AttendeeProfileData | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    getAttendeeProfile(id).then(setData);
  }, [id]);

  if (data === undefined) {
    return <p className="p-8 text-sm text-mist">Cargando…</p>;
  }
  if (data === null) {
    return <p className="p-8 text-sm text-mist">No se encontró este asistente.</p>;
  }

  const { attendee, history } = data;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link to="/admin/asistentes" className="text-xs text-mist underline">
        ← Volver a asistentes
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <AttendeeAvatar fullName={attendee.full_name} avatarUrl={attendee.avatar_url} size={72} />
        <div>
          <h1 className="font-display text-xl font-bold text-paper">{attendee.full_name}</h1>
          <p className="text-sm text-mist">
            {attendee.document_type} {attendee.document_number}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <Detail label="Correo" value={attendee.email} />
        <Detail label="Teléfono" value={attendee.phone} />
        {attendee.program && <Detail label="Programa" value={attendee.program} />}
        {attendee.institution && <Detail label="Institución" value={attendee.institution} />}
        {attendee.city && <Detail label="Ciudad" value={attendee.city} />}
      </dl>

      <h2 className="mt-8 mb-3 font-display text-lg font-bold text-paper">Historial de eventos</h2>
      <div className="flex flex-col gap-2">
        {history.map(({ event, attendance }) => (
          <div key={event.id} className="rounded-xl border border-base-700 bg-base-900 p-4">
            <p className="font-semibold text-paper">{event.name}</p>
            <p className="mb-2 text-xs text-mist">{event.start_date}</p>
            {attendance.length === 0 && <p className="text-xs text-mist">Sin registros de asistencia.</p>}
            {attendance.map((a) => (
              <div key={a.id} className="flex justify-between text-xs text-mist">
                <span>{a.attendance_date}</span>
                <span>
                  Entrada: {formatTime(a.entry_time)} · Salida: {formatTime(a.exit_time)}
                </span>
              </div>
            ))}
          </div>
        ))}
        {history.length === 0 && <p className="text-sm text-mist">No tiene inscripciones registradas.</p>}
      </div>
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

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
