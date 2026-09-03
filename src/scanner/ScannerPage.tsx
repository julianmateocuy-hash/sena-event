import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { QrScanner } from "./QrScanner";
import { LiveIndicator } from "@/components/LiveIndicator";
import { getLiveCounts, subscribeToAttendance, type LiveCounts } from "@/services/attendance";
import type { EventRow } from "@/types/database";

export default function ScannerPage() {
  const { profile } = useAuth();
  const [assignedEvents, setAssignedEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [counts, setCounts] = useState<LiveCounts | null>(null);

  useEffect(() => {
    if (!profile) return;
    loadAssignedEvents(profile.id, profile.role).then(setAssignedEvents);
  }, [profile]);

  useEffect(() => {
    if (!selectedEvent) return;
    getLiveCounts(selectedEvent.id).then(setCounts);
    const unsubscribe = subscribeToAttendance(selectedEvent.id, () => {
      getLiveCounts(selectedEvent.id).then(setCounts);
    });
    return unsubscribe;
  }, [selectedEvent]);

  if (!profile) return null;

  if (!selectedEvent) {
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <h1 className="font-display text-xl font-bold text-paper">Selecciona un evento</h1>
        <div className="mt-5 flex flex-col gap-3">
          {assignedEvents.length === 0 && (
            <p className="text-sm text-mist">No tienes eventos asignados activos.</p>
          )}
          {assignedEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => setSelectedEvent(ev)}
              className="rounded-xl border border-base-700 bg-base-900 p-4 text-left transition hover:border-signal/40"
            >
              <p className="font-semibold text-paper">{ev.name}</p>
              <p className="text-xs text-mist">
                {ev.status === "active" ? "🟢 Evento activo" : ev.status}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-4">
        <p className="text-xs text-mist">Control de acceso</p>
        <LiveIndicator />
      </div>
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-4 pt-2 text-center">
        <Stat label="Registrados" value={counts?.registered} />
        <Stat label="Entradas" value={counts?.entries} />
        <Stat label="Salidas" value={counts?.exits} />
        <Stat label="Dentro" value={counts?.inside} />
      </div>
      <QrScanner eventId={selectedEvent.id} delegateId={profile.id} eventName={selectedEvent.name} />
      <div className="px-4 pb-6 text-center">
        <button onClick={() => setSelectedEvent(null)} className="text-sm text-mist underline">
          Cambiar de evento
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-base-700 bg-base-900 py-2">
      <p className="font-display text-lg font-bold text-signal">{value ?? "—"}</p>
      <p className="text-[10px] text-mist">{label}</p>
    </div>
  );
}

async function loadAssignedEvents(profileId: string, role: string): Promise<EventRow[]> {
  if (role === "super_admin" || role === "event_admin") {
    const { data } = await supabase.from("events").select("*").eq("status", "active");
    return (data as EventRow[]) ?? [];
  }

  const { data } = await supabase
    .from("event_delegates")
    .select("events(*)")
    .eq("delegate_id", profileId)
    .eq("active", true);

  return (
    (data as unknown as { events: EventRow }[])
      ?.map((row) => row.events)
      .filter((ev) => ev.status === "active") ?? []
  );
}
