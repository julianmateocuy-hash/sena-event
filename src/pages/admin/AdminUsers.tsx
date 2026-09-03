import { useEffect, useState, type FormEvent } from "react";
import { listStaff, createStaffUser, setStaffActive } from "@/services/users";
import { useToast } from "@/components/Toast";
import type { Profile } from "@/types/database";

export default function AdminUsers() {
  const { show } = useToast();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setStaff(await listStaff());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await createStaffUser({
        full_name: String(form.get("full_name")),
        email: String(form.get("email")),
        role: form.get("role") as "event_admin" | "delegate",
      });
      show("Usuario creado — se le envió un correo para establecer su contraseña", "success");
      setShowForm(false);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible crear el usuario.";
      setError(message);
      show(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-paper">Usuarios</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-signal px-4 py-2 text-sm font-semibold text-base-950"
        >
          + Crear usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 rounded-xl border border-base-700 bg-base-900 p-5">
          <div>
            <label className="mb-1 block text-xs text-mist">Nombre completo</label>
            <input name="full_name" required className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-paper" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mist">Correo</label>
            <input name="email" type="email" required className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-paper" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mist">Rol</label>
            <select name="role" className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-paper">
              <option value="event_admin">event_admin</option>
              <option value="delegate">delegate</option>
            </select>
          </div>
          {error && <p className="text-sm text-signal-red">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-signal py-2.5 font-semibold text-base-950 disabled:opacity-50"
          >
            {submitting ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      )}

      <div className="mt-8 flex flex-col gap-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-base-700 bg-base-900 p-4">
            <div>
              <p className="font-semibold text-paper">{s.full_name}</p>
              <p className="text-xs text-mist">{s.email} · {s.role}</p>
            </div>
            {s.role !== "super_admin" && (
              <button
                onClick={() => setStaffActive(s.id, !s.active).then(refresh)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  s.active ? "border border-base-700 text-mist" : "bg-signal-red/20 text-signal-red"
                }`}
              >
                {s.active ? "Desactivar" : "Reactivar"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
