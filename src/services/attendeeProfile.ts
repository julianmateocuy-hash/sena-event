import { supabase } from "@/lib/supabase";
import type { Attendance, Attendee, EventRow } from "@/types/database";

export interface AttendeeHistoryItem {
  event: EventRow;
  attendance: Attendance[];
}

export interface AttendeeProfileData {
  attendee: Attendee;
  history: AttendeeHistoryItem[];
}

export async function getAttendeeProfile(attendeeId: string): Promise<AttendeeProfileData | null> {
  const { data: attendee, error: attendeeError } = await supabase
    .from("attendees")
    .select("*")
    .eq("id", attendeeId)
    .single();
  if (attendeeError || !attendee) return null;

  const { data: registrations, error: regError } = await supabase
    .from("event_registrations")
    .select("event_id, events(*)")
    .eq("attendee_id", attendeeId);
  if (regError) throw regError;

  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("*")
    .eq("attendee_id", attendeeId);

  type RegRow = { event_id: string; events: EventRow };
  const history: AttendeeHistoryItem[] = ((registrations as unknown as RegRow[]) ?? []).map((r) => ({
    event: r.events,
    attendance: (attendanceRows as Attendance[] | null)?.filter((a) => a.event_id === r.event_id) ?? [],
  }));

  return { attendee: attendee as Attendee, history };
}
