import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type View = "art" | "qr";

interface Props {
  qrDataUrl: string;
  qrToken: string;
  size?: number;
}

/**
 * Alterna entre una obra generativa decorativa (inspirada en el efecto
 * "QR ↔ árbol") y el QR real y limpio. El QR NUNCA se deforma ni se
 * recolorea para lograr el efecto — la obra vive en un estado 100%
 * separado, así que el código sigue siendo perfectamente escaneable
 * en todo momento (regla #20/#21 del prompt original).
 * Con prefers-reduced-motion, se omite el toggle y sólo se muestra el QR estático.
 */
export function QrArtToggle({ qrDataUrl, qrToken, size = 192 }: Props) {
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState<View>("qr");
  const dots = useMemo(() => generateCanopy(qrToken), [qrToken]);

  if (reduceMotion) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-xl bg-paper">
        <img src={qrDataUrl} alt="Código QR de acceso" className="h-full w-full object-contain p-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => setView((v) => (v === "qr" ? "art" : "qr"))}
        style={{ perspective: 800, width: size, height: size }}
        className="cursor-pointer"
      >
        <AnimatePresence mode="wait">
          {view === "qr" ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, rotateY: -80 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 80 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="flex h-full w-full items-center justify-center rounded-xl bg-paper"
            >
              <img src={qrDataUrl} alt="Código QR de acceso" className="h-full w-full object-contain p-2" />
            </motion.div>
          ) : (
            <motion.div
              key="art"
              initial={{ opacity: 0, rotateY: -80 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 80 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="h-full w-full rounded-xl bg-base-950"
            >
              <svg viewBox="0 0 240 240" className="h-full w-full">
                {/* Tronco */}
                <rect x={110} y={150} width={20} height={64} rx={4} fill="#6B4A2F" />
                {/* Copa generativa */}
                {dots.map((d, i) => (
                  <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={0.9} />
                ))}
                {/* Los 3 patrones de esquina reales de un QR, como guiño visual */}
                <FinderPattern x={8} y={8} />
                <FinderPattern x={196} y={8} />
                <FinderPattern x={8} y={196} />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-[11px] text-mist">
        {view === "qr" ? "Toca para ver el árbol" : "Toca para ver el QR"}
      </p>
    </div>
  );
}

function FinderPattern({ x, y }: { x: number; y: number }) {
  const s = 36;
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} rx={4} fill="none" stroke="#39D98A" strokeWidth={6} />
      <rect x={x + 12} y={y + 12} width={s - 24} height={s - 24} fill="#39D98A" />
    </g>
  );
}

/** PRNG determinístico (mulberry32) a partir del qr_token, para que la obra sea siempre la misma. */
function generateCanopy(seed: string) {
  let h = 0;
  for (const ch of seed) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0;
  let a = h >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const palette = ["#39D98A", "#1F8F5C", "#E8B339"];
  const dots: { x: number; y: number; r: number; color: string }[] = [];
  const cx = 120;
  const cy = 90;

  for (let i = 0; i < 160; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * 62;
    dots.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.85,
      r: 2 + rand() * 4,
      color: palette[Math.floor(rand() * palette.length)],
    });
  }
  return dots;
}
