import { motion } from "framer-motion";

/**
 * Panel informativo de configuración general. La mayoría de estos valores
 * viven hoy como constantes en el backend (schema.sql, Edge Functions) por
 * diseño — mostrarlos aquí ayuda al Super Admin a saber dónde están y qué
 * hacen, sin exponer un formulario que pueda romper reglas de seguridad
 * (ej. cambiar el rate limit sin entender su función).
 */
export default function AdminSettings() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-paper">Configuración</h1>
      <p className="mt-1 text-sm text-mist">
        Parámetros generales de la plataforma. Los valores marcados como
        "en código" se ajustan editando el archivo indicado y volviendo a
        desplegar.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <SettingRow
          label="Zona horaria"
          value="America/Bogota"
          note="supabase/schema.sql — función process_attendance()"
        />
        <SettingRow
          label="Límite de reenvío de QR"
          value="3 por hora, por asistente"
          note="supabase/schema.sql — función request_qr_resend()"
        />
        <SettingRow
          label="Compresión de avatar"
          value="512px, WEBP calidad 85%"
          note="src/avatar/avatar.ts"
        />
        <SettingRow
          label="Remitente de correo"
          value="Configurado vía Secret EMAIL_FROM"
          note="Project Settings → Edge Functions → Secrets"
        />
        <SettingRow
          label="Proveedor de correo"
          value="Resend"
          note="supabase/functions/send-registration-email/index.ts"
        />
        <SettingRow
          label="Roles del sistema"
          value="super_admin · event_admin · delegate"
          note="Gestión en /admin/usuarios y /admin/delegados"
        />
      </div>
    </div>
  );
}

function SettingRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-base-700 bg-base-900 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-paper">{label}</p>
        <p className="text-sm text-signal">{value}</p>
      </div>
      <p className="mt-1 text-xs text-mist">{note}</p>
    </motion.div>
  );
}
