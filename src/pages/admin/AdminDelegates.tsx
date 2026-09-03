import { useEffect, useState } from "react";
import { listEvents } from "@/services/events";
import { listStaff, createStaffUser } from "@/services/users";
import { assignDelegateToEvent, listAssignmentsForEvent, setDelegateAssignmentActive } from "@/services/delegates";
import { useToast } from "@/components/Toast";
import type { EventRow, Profile } from "@/types/database";
import type { FormEvent } from "react";

export default function AdminDelegates() {
  const { show } = useToast();
  const [delegates, setDelegates] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [assignments, setAssignments] = useState<Record<string, { id: string; active: boolean }>>({});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshDelegates() {
    setDelegates((await listStaff()).filter((p) => p.role === "delegate"));
  }

  useEffect(() => {
    refreshDelegates();
    listEvents().then((evs) => {
      setEvents(evs);
      if (evs.length > 0) setSelectedEventId(evs[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    listAssignmentsForEvent(selectedEventId).then((rows) => {
      const map: Record<string, { id: string; active: boolean }> = {};
      rows.forEach((r) => (map[r.delegate_id] = { id: r.id, active: r.active }));
      setAssignments(map);
    });
  }, [selectedEventId]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await createStaffUser({
        full_name: String(form.get("full_name")),
        email: String(form.get("email")),
        role: "delegate",
      });
      show("Delegado creado — se le envió un correo para establecer su contraseña", "success");
      setShowForm(false);
      refreshDelegates();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible crear el delegado.";
      setError(message);
      show(message, "error");
    }
  }

  async function toggleAssignment(delegateId: string) {
    const current = assignments[delegateId];
    if (!current) {
      await assignDelegateToEvent(selectedEventId, delegateId);
    } else {
      await setDelegateAssignmentActive(current.id, !current.active);
    }
    const rows = await listAssignmentsForEvent(selectedEventId);
    const map: Record<string, { id: string; active: boolean }> = {};
    rows.forEach((r) => (map[r.delegate_id] = { id: r.id, active: r.active }));
    setAssignments(map);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-paper">Delegados</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-signal px-4 py-2 text-sm font-semibold text-base-950"
        >
          + Crear delegado
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-3 rounded-xl border border-base-700 bg-base-900 p-5">
          <div>
            <label className="mb-1 block text-xs text-mist">Nombre completo</label>
            <input name="full_name" required className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-paper" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mist">Correo</label>
            <input name="email" type="email" required className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-paper" />
          </div>
          {error && <p className="text-sm text-signal-red">{error}</p>}
          <p className="text-xs text-mist">
            Se le enviará un correo para establecer su contraseña.
          </p>
          <button type="submit" className="mt-2 rounded-full bg-signal py-2.5 font-semibold text-base-950">
            Crear delegado
          </button>
        </form>
      )}

      <div className="mt-8">
        <label className="mb-1 block text-xs text-mist">Asignar a evento</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-paper"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {delegates.map((d) => {
          const assigned = assignments[d.id]?.active;
          return (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-base-700 bg-base-900 p-4">
              <div>
                <p className="font-semibold text-paper">{d.full_name}</p>
                <p className="text-xs text-mist">{d.email}</p>
              </div>
              <button
                onClick={() => toggleAssignment(d.id)}
                disabled={!selectedEventId}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  assigned ? "bg-signal/20 text-signal" : "border border-base-700 text-mist"
                }`}
              >
                {assigned ? "Asignado" : "Asignar"}
              </button>
            </div>
          );
        })}
        {delegates.length === 0 && <p className="text-sm text-mist">No hay delegados creados aún.</p>}
      </div>
    </div>
  );
}
