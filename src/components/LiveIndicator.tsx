import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function LiveIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs text-mist">
      <motion.span
        className={`h-2 w-2 rounded-full ${online ? "bg-signal" : "bg-signal-red"}`}
        animate={online ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
        transition={{ duration: 1.8, repeat: online ? Infinity : 0 }}
      />
      {online ? "En vivo" : "Sin conexión"}
    </div>
  );
}
