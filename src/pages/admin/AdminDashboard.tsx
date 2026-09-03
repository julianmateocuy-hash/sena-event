import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { todayInBogota } from "@/lib/date";
import { listEvents, publicRegistrationUrl } from "@/services/events";
import { HourlyAttendanceChart } from "@/components/HourlyAttendanceChart";
import { SkeletonCards, SkeletonRows } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { LiveIndicator } from "@/components/LiveIndicator";
import { useToast } from "@/components/Toast";
import type { EventRow } from "@/types/database";

interface GlobalCounts {
  events: number;
  activeEvents: number;
  registered: number;
  entries: number;
  exits: number;
  inside: number;
}

export default function AdminDashboard() {
  const { show } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [counts, setCounts] = useState<GlobalCounts | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const evs = await listEvents();
    setEvents(evs);

    const today = todayInBogota();
    const [{ count: registered }, { data: attendanceRows }] = await Promise.all([
      supabase.from("event_registrations").select("id", { count: "exact", head: true }),
      supabase.from("attendance").select("entry_time, exit_time").eq("attendance_date", today),
    ]);

    const entries = attendanceRows?.filter((r) => r.entry_time).length ?? 0;
    const exits = attendanceRows?.filter((r) => r.exit_time).length ?? 0;

    setCounts({
      events: evs.length,
      activeEvents: evs.filter((e) => e.status === "active").length,
      registered: registered ?? 0,
      entries,
      exits,
      inside: entries - exits,
    });
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("dashboard-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyUrl(slug: string) {
    navigator.clipboard.writeText(publicRegistrationUrl(slug));
    show("URL copiada al portapapeles", "success");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-paper">Dashboard</h1>
        <LiveIndicator />
      </div>

      {loading ? (
        <div className="mt-6">
          <SkeletonCards count={6} />
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          <StatCard label="Eventos" value={counts?.events} />
          <StatCard label="Activos" value={counts?.activeEvents} />
          <StatCard label="Registrados" value={counts?.registered} />
          <StatCard label="Entradas hoy" value={counts?.entries} />
          <StatCard label="Salidas hoy" value={counts?.exits} />
          <StatCard label="Dentro ahora" value={counts?.inside} highlight />
        </motion.div>
      )}

      <h2 className="mt-10 mb-3 font-display text-lg font-bold text-paper">Entradas y salidas hoy</h2>
      <HourlyAttendanceChart />

      <h2 className="mt-10 mb-3 font-display text-lg font-bold text-paper">Eventos</h2>
      {loading ? (
        <SkeletonRows count={3} />
      ) : events.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aún no hay eventos creados"
          description="Crea tu primer evento desde la sección Eventos para generar su URL pública."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((ev, i) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              className="flex items-center justify-between rounded-xl border border-base-700 bg-base-900 p-4"
            >
              <div>
                <p className="font-semibold text-paper">{ev.name}</p>
                <p className="text-xs text-mist">
                  {ev.status} · {ev.start_date}
                </p>
              </div>
              <Button variant="ghost" onClick={() => copyUrl(ev.slug)} className="px-3 py-1.5 text-xs">
                Copiar URL
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={`rounded-xl border p-4 ${
        highlight ? "border-signal/40 bg-signal/10" : "border-base-700 bg-base-900"
      }`}
    >
      <p className="font-display text-2xl font-bold text-paper">{value ?? "—"}</p>
      <p className="text-xs text-mist">{label}</p>
    </motion.div>
  );
}
