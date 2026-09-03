import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/AuthContext";
import { createEvent, listEvents, publicRegistrationUrl, setEventStatus } from "@/services/events";
import { Button } from "@/components/Button";
import { SkeletonRows } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import type { EventRow } from "@/types/database";

export default function AdminEvents() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setEvents(await listEvents());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    try {
      const event = await createEvent({
        name: String(form.get("name")),
        description: String(form.get("description") ?? "") || undefined,
        location: String(form.get("location") ?? "") || undefined,
        start_date: String(form.get("start_date")),
        end_date: String(form.get("end_date")),
        capacity: form.get("capacity") ? Number(form.get("capacity")) : undefined,
        created_by: profile.id,
      });
      navigator.clipboard.writeText(publicRegistrationUrl(event.slug));
      show("Evento creado — URL copiada al portapapeles", "success");
      setShowForm(false);
      refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "No fue posible crear el evento.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(ev: EventRow, status: EventRow["status"]) {
    try {
      await setEventStatus(ev.id, status);
      show(`"${ev.name}" ahora está ${status}`, "success");
      refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "No fue posible cambiar el estado.", "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-paper">Eventos</h1>
        <Button onClick={() => setShowForm((v) => !v)}>+ Crear evento</Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-3 overflow-hidden rounded-xl border border-base-700 bg-base-900 p-5"
          >
            <Field label="Nombre" name="name" required />
            <Field label="Descripción" name="description" />
            <Field label="Ubicación" name="location" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha inicio" name="start_date" type="date" required />
              <Field label="Fecha fin" name="end_date" type="date" required />
            </div>
            <Field label="Capacidad (opcional)" name="capacity" type="number" />
            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Creando…" : "Crear evento"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-8">
        {loading ? (
          <SkeletonRows count={3} height={64} />
        ) : events.length === 0 ? (
          <EmptyState
            icon="🎫"
            title="No hay eventos todavía"
            description='Usa "+ Crear evento" para generar el primero y su URL pública.'
          />
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between rounded-xl border border-base-700 bg-base-900 p-4"
              >
                <div>
                  <p className="font-semibold text-paper">{ev.name}</p>
                  <p className="text-xs text-mist">{ev.status}</p>
                </div>
                <select
                  value={ev.status}
                  onChange={(e) => handleStatusChange(ev, e.target.value as EventRow["status"])}
                  className="rounded-lg border border-base-700 bg-base-800 px-2 py-1 text-xs text-paper"
                >
                  {["draft", "upcoming", "active", "finished", "cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-mist">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-paper transition focus:border-signal/50"
      />
    </div>
  );
}
