import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-base-700 px-6 py-10 text-center"
    >
      {icon && <div className="text-3xl text-mist/60">{icon}</div>}
      <p className="font-display text-sm font-semibold text-paper">{title}</p>
      {description && <p className="max-w-xs text-xs text-mist">{description}</p>}
    </motion.div>
  );
}
