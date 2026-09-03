import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";

/**
 * supabase-js siempre trae un mensaje real en `error.message`, pero antes lo
 * descartábamos y mostrábamos "Correo o contraseña incorrectos" para
 * cualquier falla — incluyendo cosas que NO son eso (correo sin confirmar,
 * proyecto/anon key mal configurados, etc.), lo que hacía imposible
 * diagnosticar el problema real desde la pantalla de login.
 */
function describeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Este correo aún no está confirmado. Revisa la bandeja de entrada (y spam) del correo de confirmación, o confirma el usuario manualmente en Supabase → Authentication → Users.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "No fue posible contactar a Supabase. Revisa que VITE_SUPABASE_URL en tu .env sea la de este proyecto y que tengas conexión.";
  }
  return message;
}

export default function Login() {
  const { session, profile, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  if (session && profile) {
    return <Navigate to={profile.role === "delegate" ? "/scanner" : "/admin"} replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);
    const { error } = await signInWithPassword(
      String(form.get("email")),
      String(form.get("password"))
    );
    setSubmitting(false);
    if (error) {
      setError(describeAuthError(error));
      return;
    }
    // El rol real llega vía onAuthStateChange (async), así que no lo
    // tenemos aquí todavía — dejamos que el chequeo de arriba
    // (if (session && profile)) haga el redirect correcto en el siguiente
    // render en vez de asumir "/admin" para todos, que rebotaba feo a los
    // delegate (RequireRole los rechaza en /admin y los manda de vuelta a
    // /login, que recién ahí los reenvía a /scanner).
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Escribe tu correo arriba y vuelve a tocar \"Olvidé mi contraseña\".");
      return;
    }
    setSendingReset(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    // Mensaje genérico siempre, exista o no la cuenta: evita filtrar qué
    // correos tienen cuenta en la plataforma.
    setInfo(
      error
        ? "No fue posible enviar el correo. Intenta de nuevo en unos minutos."
        : "Si el correo tiene una cuenta activa, te llegará un enlace para restablecer tu contraseña."
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <p className="font-mono text-xs tracking-wide text-signal">SENA · ACCESO STAFF</p>
        <h1 className="mt-1 mb-6 font-display text-2xl font-bold text-paper">Iniciar sesión</h1>

        <label className="mb-1 block text-xs text-mist">Correo</label>
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-paper"
        />

        <label className="mb-1 block text-xs text-mist">Contraseña</label>
        <input
          name="password"
          type="password"
          required
          className="mb-2 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-paper"
        />

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={sendingReset}
          className="mb-6 text-left text-xs text-mist underline disabled:opacity-50"
        >
          {sendingReset ? "Enviando…" : "Olvidé mi contraseña"}
        </button>

        {error && <p className="mb-4 text-sm text-signal-red">{error}</p>}
        {info && <p className="mb-4 text-sm text-signal">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-signal py-3 font-semibold text-base-950 disabled:opacity-50"
        >
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
