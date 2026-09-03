import { useEffect, useState } from "react";
import { listEvents } from "@/services/events";
import { buildReport, exportReportToCsv, type ReportRow } from "@/services/reports";
import type { EventRow } from "@/types/database";

export default function AdminReports() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<"" | "registered" | "inside" | "complete">("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  async function runReport() {
    setLoading(true);
    try {
      const result = await buildReport({
        eventId: eventId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status || undefined,
      });
      setRows(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-paper">Reportes</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="col-span-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-paper sm:col-span-1"
        >
          <option value="">Todos los eventos</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-paper"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-paper"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-paper"
        >
          <option value="">Todos los estados</option>
          <option value="registered">Registrado</option>
          <option value="inside">Dentro</option>
          <option value="complete">Completó asistencia</option>
        </select>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={runReport}
          disabled={loading}
          className="rounded-full bg-signal px-5 py-2 text-sm font-semibold text-base-950 disabled:opacity-50"
        >
          {loading ? "Consultando…" : "Consultar"}
        </button>
        <button
          onClick={() => exportReportToCsv(rows)}
          disabled={rows.length === 0}
          className="rounded-full border border-signal/30 px-5 py-2 text-sm text-signal disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>

      <p className="mt-4 text-xs text-mist">{rows.length} filas</p>

      <div className="mt-2 max-h-[480px] overflow-auto rounded-xl border border-base-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-base-900">
            <tr className="border-b border-base-700 text-left text-mist">
              <th className="px-3 py-2">Evento</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Entrada</th>
              <th className="px-3 py-2">Salida</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-base-800 text-mist">
                <td className="px-3 py-2">{r.event_name}</td>
                <td className="px-3 py-2 text-paper">{r.full_name}</td>
                <td className="px-3 py-2">{r.document_number}</td>
                <td className="px-3 py-2">{r.attendance_date ?? "—"}</td>
                <td className="px-3 py-2">{formatTime(r.entry_time)}</td>
                <td className="px-3 py-2">{formatTime(r.exit_time)}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
