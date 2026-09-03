import { supabase } from "@/lib/supabase";
import { todayInBogota } from "@/lib/date";
import type { AttendanceResult } from "@/types/database";

/**
 * Único punto de escritura de asistencia en todo el frontend.
 * Llama a process_attendance() (SECURITY DEFINER, ver schema.sql §13),
 * que decide de forma atómica si corresponde entrada, salida o rechazo.
 * Nunca hacer SELECT + UPDATE manual desde React (regla #11 del prompt).
 */
export async function scanAttendance(params: {
  qrToken: string;
  eventId: string;
  delegateId: string;
}): Promise<AttendanceResult> {
  const { data, error } = await supabase.rpc("process_attendance", {
    p_qr_token: params.qrToken,
    p_event_id: params.eventId,
    p_delegate_id: params.delegateId,
  });
  if (error) throw error;
  return data as AttendanceResult;
}

export interface LiveCounts {
  registered: number;
  entries: number;
  exits: number;
  inside: number;
}

export async function getLiveCounts(eventId: string): Promise<LiveCounts> {
  const today = todayInBogota();

  const [{ count: registered }, { data: rows }] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "registered"),
    supabase
      .from("attendance")
      .select("entry_time, exit_time")
      .eq("event_id", eventId)
      .eq("attendance_date", today),
  ]);

  const entries = rows?.filter((r) => r.entry_time).length ?? 0;
  const exits = rows?.filter((r) => r.exit_time).length ?? 0;

  return {
    registered: registered ?? 0,
    entries,
    exits,
    inside: entries - exits,
  };
}

/** Suscripción en tiempo real a cambios de asistencia de un evento. */
export function subscribeToAttendance(eventId: string, onChange: () => void) {
  const channel = supabase
    .channel(`attendance-${eventId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "attendance", filter: `event_id=eq.${eventId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
