import { supabase } from "@/lib/supabase";
import { todayInBogota } from "@/lib/date";

export interface HourlyPoint {
  hour: string; // "08:00"
  entries: number;
  exits: number;
}

export async function getHourlyAttendance(eventId?: string): Promise<HourlyPoint[]> {
  const today = todayInBogota();
  let query = supabase
    .from("attendance")
    .select("entry_time, exit_time")
    .eq("attendance_date", today);
  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error) throw error;

  const buckets = new Map<string, HourlyPoint>();
  for (let h = 0; h < 24; h++) {
    const label = `${String(h).padStart(2, "0")}:00`;
    buckets.set(label, { hour: label, entries: 0, exits: 0 });
  }

  (data ?? []).forEach((row) => {
    if (row.entry_time) {
      const label = hourLabel(row.entry_time);
      buckets.get(label)!.entries += 1;
    }
    if (row.exit_time) {
      const label = hourLabel(row.exit_time);
      buckets.get(label)!.exits += 1;
    }
  });

  // Sólo devolver el rango con actividad, con un margen de una hora a cada lado
  const active = [...buckets.values()].filter((p) => p.entries > 0 || p.exits > 0);
  if (active.length === 0) return [];
  const hours = [...buckets.keys()];
  const firstIdx = Math.max(0, hours.indexOf(active[0].hour) - 1);
  const lastIdx = Math.min(23, hours.indexOf(active[active.length - 1].hour) + 1);
  return hours.slice(firstIdx, lastIdx + 1).map((h) => buckets.get(h)!);
}

function hourLabel(iso: string) {
  const d = new Date(iso);
  const bogotaHour = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  }).format(d);
  return `${bogotaHour.padStart(2, "0")}:00`;
}
