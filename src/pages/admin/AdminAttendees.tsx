import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEvents } from "@/services/events";
import { listAttendeesForEvent, attendeeStatus, type AttendeeRow } from "@/services/attendees";
import { AttendeeAvatar } from "@/avatar/AttendeeAvatar";
import type { EventRow } from "@/types/database";

const STATUS_LABEL: Record<string, string> = {
  registered: "Registrado",
  inside: "Dentro",
  complete: "Completó asistencia",
};

export default function AdminAttendees() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  useEffect(() => {
    setLoading(true);
    listAttendeesForEvent(eventId || null, search)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [eventId, search]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-paper">Asistentes</h1>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          placeholder="Buscar por nombre, documento o correo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-paper placeholder:text-mist/50"
        />
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-paper sm:w-56"
        >
          <option value="">Todos los eventos</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-base-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-xs text-mist">
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.registration_id} className="border-b border-base-800">
                <td className="px-4 py-2">
                  <Link to={`/admin/asistentes/${r.attendee_id}`}>
                    <AttendeeAvatar fullName={r.full_name} avatarUrl={r.avatar_url} size={32} />
                  </Link>
                </td>
                <td className="px-4 py-2 text-paper">
                  <Link to={`/admin/asistentes/${r.attendee_id}`} className="hover:text-signal">
                    {r.full_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-mist">{r.document_number}</td>
                <td className="px-4 py-2 text-mist">{r.event_name}</td>
                <td className="px-4 py-2 text-mist">{formatTime(r.entry_time)}</td>
                <td className="px-4 py-2 text-mist">{formatTime(r.exit_time)}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={attendeeStatus(r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="p-6 text-center text-sm text-mist">No se encontraron asistentes.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "complete"
      ? "bg-mist/10 text-mist"
      : status === "inside"
        ? "bg-signal/15 text-signal"
        : "bg-signal-amber/15 text-signal-amber";
  return <span className={`rounded-full px-2.5 py-1 text-xs ${tone}`}>{STATUS_LABEL[status]}</span>;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
