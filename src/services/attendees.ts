import { supabase } from "@/lib/supabase";

export interface AttendeeRow {
  registration_id: string;
  attendee_id: string;
  full_name: string;
  document_number: string;
  email: string;
  avatar_url: string | null;
  event_id: string;
  event_name: string;
  entry_time: string | null;
  exit_time: string | null;
}

/** Estado derivado, tal como lo define la sección 51 del prompt. */
export function attendeeStatus(row: Pick<AttendeeRow, "entry_time" | "exit_time">) {
  if (row.entry_time && row.exit_time) return "complete";
  if (row.entry_time) return "inside";
  return "registered";
}

export async function listAttendeesForEvent(eventId: string | null, search: string): Promise<AttendeeRow[]> {
  let query = supabase
    .from("event_registrations")
    .select(
      `id, event_id, attendee_id,
       attendees ( full_name, document_number, email, avatar_url ),
       events ( name ),
       attendance ( entry_time, exit_time )`
    )
    .order("registration_date", { ascending: false })
    .limit(200);

  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error) throw error;

  type Raw = {
    id: string;
    event_id: string;
    attendee_id: string;
    attendees: { full_name: string; document_number: string; email: string; avatar_url: string | null };
    events: { name: string };
    attendance: { entry_time: string | null; exit_time: string | null }[];
  };

  const rows: AttendeeRow[] = ((data as unknown as Raw[]) ?? []).map((r) => ({
    registration_id: r.id,
    attendee_id: r.attendee_id,
    full_name: r.attendees.full_name,
    document_number: r.attendees.document_number,
    email: r.attendees.email,
    avatar_url: r.attendees.avatar_url,
    event_id: r.event_id,
    event_name: r.events.name,
    entry_time: r.attendance[0]?.entry_time ?? null,
    exit_time: r.attendance[0]?.exit_time ?? null,
  }));

  if (!search.trim()) return rows;
  const q = search.trim().toLowerCase();
  return rows.filter(
    (r) =>
      r.full_name.toLowerCase().includes(q) ||
      r.document_number.includes(q) ||
      r.email.toLowerCase().includes(q)
  );
}
