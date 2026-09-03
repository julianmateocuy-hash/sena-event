import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { generateQrDataUrl } from "@/qr/qr";
import { QrArtToggle } from "@/qr/QrArtToggle";
import { AttendeeAvatar } from "@/avatar/AttendeeAvatar";

type Phase = "processing" | "assembling" | "revealed";

interface Props {
  fullName: string;
  avatarUrl: string | null;
  eventName: string;
  qrToken: string;
  onDownload?: () => void;
}

/**
 * Implementa las fases 1–9 de la sección 19 del prompt:
 * procesando → partículas → tarjeta → avatar → nombre → QR progresivo →
 * línea de escaneo → inclinación 3D → confirmación.
 * El QR en sí (generateQrDataUrl) nunca se toca por la animación: la
 * tarjeta se anima alrededor de una imagen QR ya renderizada y estática.
 */
export function Credential3D({ fullName, avatarUrl, eventName, qrToken, onDownload }: Props) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduceMotion ? "revealed" : "processing");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    generateQrDataUrl(qrToken).then(setQrDataUrl);
  }, [qrToken]);

  useEffect(() => {
    if (reduceMotion) return;
    const t1 = setTimeout(() => setPhase("assembling"), 900);
    const t2 = setTimeout(() => setPhase("revealed"), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduceMotion]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -8, ry: px * 10 });
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <AnimatePresence mode="wait">
        {phase === "processing" && (
          <motion.p
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-mono text-sm tracking-wide text-signal"
          >
            Procesando registro…
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.9, rotateY: -20 }}
        animate={
          phase === "processing"
            ? { opacity: 0, scale: 0.9 }
            : { opacity: 1, scale: 1, rotateX: tilt.rx, rotateY: tilt.ry }
        }
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        style={{ perspective: 1000, transformStyle: "preserve-3d" }}
        className="relative w-80 max-w-full rounded-3xl border border-signal/20 bg-gradient-to-br from-base-800/90 to-base-900/90 p-6 shadow-card backdrop-blur"
      >
        {/* borde animado sutil */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl border border-signal/10" />

        <div className="mb-5 flex items-center gap-3">
          <AnimatePresence>
            {phase !== "processing" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <AttendeeAvatar fullName={fullName} avatarUrl={avatarUrl} size={56} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {phase === "revealed" && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <p className="font-display text-base font-bold leading-tight text-paper">
                  {fullName}
                </p>
                <p className="text-sm text-mist">{eventName}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase === "revealed" && qrDataUrl ? (
          <div className="mx-auto flex w-48 items-center justify-center">
            <QrArtToggle qrDataUrl={qrDataUrl} qrToken={qrToken} size={192} />
          </div>
        ) : (
          <div className="relative mx-auto flex aspect-square w-48 items-center justify-center overflow-hidden rounded-xl bg-paper">
            <AnimatePresence>
              {phase === "assembling" && qrDataUrl && (
                <motion.img
                  key="qr"
                  src={qrDataUrl}
                  alt="Código QR de acceso"
                  initial={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }}
                  animate={{ opacity: 1, clipPath: "inset(0% 0 0 0)" }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full w-full object-contain p-2"
                />
              )}
            </AnimatePresence>

            {phase === "assembling" && !reduceMotion && (
              <motion.div
                className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-signal/40 to-transparent"
                animate={{ y: ["-100%", "400%"] }}
                transition={{ duration: 1.1, ease: "linear" }}
              />
            )}
          </div>
        )}

        <AnimatePresence>
          {phase === "revealed" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 text-center font-mono text-xs tracking-wide text-signal"
            >
              ✓ REGISTRO CONFIRMADO
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {phase === "revealed" && onDownload && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onDownload}
          className="rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-base-950 transition hover:bg-signal/90"
        >
          Descargar QR
        </motion.button>
      )}
    </div>
  );
}
