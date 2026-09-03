import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/eventos", label: "Eventos" },
  { to: "/admin/asistentes", label: "Asistentes" },
  { to: "/admin/delegados", label: "Delegados" },
  { to: "/admin/usuarios", label: "Usuarios" },
  { to: "/admin/reportes", label: "Reportes" },
  { to: "/admin/configuracion", label: "Configuración" },
];

// /scanner vive fuera del layout de /admin (es una ruta hermana, con su
// propia UI a pantalla completa para el control de acceso), pero
// super_admin y event_admin sí tienen permiso para entrar — antes no había
// ningún enlace hacia allá, solo se podía llegar escribiendo la URL a mano.
const SCANNER_LINK = { to: "/scanner", label: "Escanear" };

export default function AdminLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r border-base-800 bg-base-900 p-5 sm:flex">
        <p className="mb-8 font-mono text-xs tracking-wide text-signal">SENA · ADMIN</p>
        <nav className="flex flex-col gap-1">
          {LINKS.filter((l) => l.to !== "/admin/usuarios" || profile?.role === "super_admin").map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm ${
                  isActive ? "bg-signal/10 text-signal" : "text-mist hover:text-paper"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="my-2 border-t border-base-800" />
          <NavLink
            to={SCANNER_LINK.to}
            className="rounded-lg px-3 py-2 text-sm text-mist hover:text-paper"
          >
            {SCANNER_LINK.label}
          </NavLink>
        </nav>
        <div className="mt-auto">
          <p className="mb-2 text-xs text-mist">{profile?.full_name}</p>
          <button onClick={signOut} className="text-xs text-mist underline">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
