import { supabase } from "@/lib/supabase";
import { attendeeStatus } from "./attendees";

export interface ReportFilters {
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: "registered" | "inside" | "complete";
}

export interface ReportRow {
  event_name: string;
  full_name: string;
  document_number: string;
  email: string;
  attendance_date: string | null;
  entry_time: string | null;
  exit_time: string | null;
  entry_delegate: string | null;
  exit_delegate: string | null;
  status: string;
}

export async function buildReport(filters: ReportFilters): Promise<ReportRow[]> {
  let query = supabase
    .from("event_registrations")
    .select(
      `attendee_id, event_id,
       attendees ( full_name, document_number, email ),
       events!inner ( name ),
       attendance ( attendance_date, entry_time, exit_time,
         entry_delegate:entry_delegate_id ( full_name ),
         exit_delegate:exit_delegate_id ( full_name ) )`
    );

  if (filters.eventId) query = query.eq("event_id", filters.eventId);

  const { data, error } = await query;
  if (error) throw error;

  type Raw = {
    attendees: { full_name: string; document_number: string; email: string };
    events: { name: string };
    attendance: {
      attendance_date: string;
      entry_time: string | null;
      exit_time: string | null;
      entry_delegate: { full_name: string } | null;
      exit_delegate: { full_name: string } | null;
    }[];
  };

  let rows: ReportRow[] = ((data as unknown as Raw[]) ?? []).flatMap((r) => {
    const attendanceRows = r.attendance.length > 0 ? r.attendance : [null];
    return attendanceRows.map((a) => ({
      event_name: r.events.name,
      full_name: r.attendees.full_name,
      document_number: r.attendees.document_number,
      email: r.attendees.email,
      attendance_date: a?.attendance_date ?? null,
      entry_time: a?.entry_time ?? null,
      exit_time: a?.exit_time ?? null,
      entry_delegate: a?.entry_delegate?.full_name ?? null,
      exit_delegate: a?.exit_delegate?.full_name ?? null,
      status: attendeeStatus({ entry_time: a?.entry_time ?? null, exit_time: a?.exit_time ?? null }),
    }));
  });

  if (filters.dateFrom) rows = rows.filter((r) => !r.attendance_date || r.attendance_date >= filters.dateFrom!);
  if (filters.dateTo) rows = rows.filter((r) => !r.attendance_date || r.attendance_date <= filters.dateTo!);
  if (filters.status) rows = rows.filter((r) => r.status === filters.status);

  return rows;
}

const CSV_HEADERS: { key: keyof ReportRow; label: string }[] = [
  { key: "event_name", label: "Evento" },
  { key: "full_name", label: "Nombre" },
  { key: "document_number", label: "Documento" },
  { key: "email", label: "Email" },
  { key: "attendance_date", label: "Fecha" },
  { key: "entry_time", label: "Entrada" },
  { key: "exit_time", label: "Salida" },
  { key: "entry_delegate", label: "Delegado entrada" },
  { key: "exit_delegate", label: "Delegado salida" },
  { key: "status", label: "Estado" },
];

function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportReportToCsv(rows: ReportRow[], fileName = "reporte-asistencia.csv") {
  const header = CSV_HEADERS.map((h) => csvEscape(h.label)).join(",");
  const body = rows.map((row) => CSV_HEADERS.map((h) => csvEscape(row[h.key])).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
