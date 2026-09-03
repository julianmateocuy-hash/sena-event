import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getHourlyAttendance, type HourlyPoint } from "@/services/analytics";

export function HourlyAttendanceChart({ eventId }: { eventId?: string }) {
  const [data, setData] = useState<HourlyPoint[]>([]);

  useEffect(() => {
    getHourlyAttendance(eventId).then(setData);
  }, [eventId]);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-base-700 bg-base-900 text-sm text-mist">
        Aún no hay movimientos registrados hoy.
      </div>
    );
  }

  return (
    <div className="h-56 rounded-xl border border-base-700 bg-base-900 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="entriesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39D98A" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#39D98A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="exitsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8B339" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#E8B339" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1B3F29" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" stroke="#9FB3A6" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#9FB3A6" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#0B1B13", border: "1px solid #1B3F29", borderRadius: 8 }}
            labelStyle={{ color: "#EFF5EF" }}
          />
          <Area type="monotone" dataKey="entries" name="Entradas" stroke="#39D98A" fill="url(#entriesFill)" strokeWidth={2} />
          <Area type="monotone" dataKey="exits" name="Salidas" stroke="#E8B339" fill="url(#exitsFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
