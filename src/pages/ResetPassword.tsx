import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * Supabase redirige aquí (Site URL + /reset-password) cuando alguien hace
 * clic en el enlace de "establecer contraseña" o "recuperar contraseña".
 * supabase-js detecta el token de la URL automáticamente (detectSessionInUrl)
 * y dispara el evento PASSWORD_RECOVERY antes de que este componente pueda
 * reaccionar en algunos casos, así que revisamos ambas rutas: el evento y
 * la sesión ya presente al montar.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/login"), 1500);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-mist">
        <p>
          Este enlace no es válido o ya expiró. Pide que te envíen uno nuevo desde{" "}
          <span className="text-paper">/admin/delegados</span> o{" "}
          <span className="text-paper">/admin/usuarios</span>.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="font-mono text-sm text-signal">✓ Contraseña establecida. Redirigiendo…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <p className="font-mono text-xs tracking-wide text-signal">SENA · ACCESO STAFF</p>
        <h1 className="mt-1 mb-6 font-display text-2xl font-bold text-paper">
          Establece tu contraseña
        </h1>

        <label className="mb-1 block text-xs text-mist">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mb-4 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-paper"
        />

        <label className="mb-1 block text-xs text-mist">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="mb-6 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-paper"
        />

        {error && <p className="mb-4 text-sm text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-signal py-3 font-semibold text-base-950 disabled:opacity-50"
        >
          {submitting ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
