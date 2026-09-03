import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { parseQrToken } from "@/qr/qr";
import { scanAttendance } from "@/services/attendance";
import { AttendeeAvatar } from "@/avatar/AttendeeAvatar";
import type { AttendanceResult } from "@/types/database";

const SCAN_COOLDOWN_MS = 1500;
const READER_ELEMENT_ID = "qr-reader";

const ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "✕ NO TIENES PERMISOS PARA ESTE EVENTO",
  QR_INVALID: "✕ QR NO VÁLIDO",
  EVENT_NOT_ACTIVE: "⚠ EVENTO NO ACTIVO",
  NOT_REGISTERED: "⚠ PERSONA NO REGISTRADA EN ESTE EVENTO",
  ATTENDANCE_COMPLETE: "⚠ ASISTENCIA COMPLETA",
};

export function QrScanner({
  eventId,
  delegateId,
  eventName,
}: {
  eventId: string;
  delegateId: string;
  eventName: string;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const pausedRef = useRef(false);
  const [result, setResult] = useState<AttendanceResult | { offline: true } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ELEMENT_ID);
    scannerRef.current = scanner;
    let unmounted = false;

    /**
     * React.StrictMode (activo en main.tsx) monta → desmonta → vuelve a
     * montar cada componente en desarrollo. start() es asíncrono (pide
     * permiso de cámara), así que si llamamos stop() de inmediato en el
     * cleanup del primer montaje "fantasma", html5-qrcode queda en un
     * estado inconsistente y la cámara nunca llega a mostrarse en el
     * montaje real. Por eso esperamos a que start() resuelva antes de
     * decidir si corresponde detenerlo.
     */
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        handleDecoded,
        undefined
      )
      .then(() => {
        if (unmounted) {
          scanner.stop().catch(() => {});
        }
      })
      .catch(() => {
        if (!unmounted) {
          setCameraError("No fue posible acceder a la cámara. Revisa los permisos.");
        }
      });

    return () => {
      unmounted = true;
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        scanner.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleDecoded(rawText: string) {
    if (pausedRef.current) return;
    const token = parseQrToken(rawText);
    if (!token) {
      pauseAndShow({ ok: false, code: "QR_INVALID" });
      return;
    }

    pausedRef.current = true;

    if (!navigator.onLine) {
      pauseAndShow({ offline: true });
      return;
    }

    try {
      const res = await scanAttendance({ qrToken: token, eventId, delegateId });
      pauseAndShow(res);
    } catch {
      pauseAndShow({ offline: true });
    }
  }

  function pauseAndShow(res: AttendanceResult | { offline: true }) {
    setResult(res);
    setTimeout(() => {
      setResult(null);
      pausedRef.current = false;
    }, SCAN_COOLDOWN_MS);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-6">
      <p className="font-mono text-xs text-signal">{eventName}</p>

      <div className="relative w-full overflow-hidden rounded-2xl border border-base-700">
        <div id={READER_ELEMENT_ID} className="w-full" />
        {cameraError && (
          <p className="p-4 text-center text-sm text-signal-red">{cameraError}</p>
        )}
      </div>

      {result && <ScanFeedback result={result} />}
    </div>
  );
}

function ScanFeedback({ result }: { result: AttendanceResult | { offline: true } }) {
  if ("offline" in result) {
    return (
      <Banner tone="error">
        SIN CONEXIÓN — no fue posible validar el código QR.
      </Banner>
    );
  }

  if (!result.ok) {
    return <Banner tone="error">{ERROR_MESSAGES[result.code]}</Banner>;
  }

  const label = result.action === "entry" ? "✓ ENTRADA AUTORIZADA" : "✓ SALIDA AUTORIZADA";

  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-signal/30 bg-signal/10 p-5 animate-driftIn">
      <AttendeeAvatar
        fullName={result.attendee.full_name}
        avatarUrl={result.attendee.avatar_url}
        size={64}
      />
      <p className="font-display font-bold text-paper">{result.attendee.full_name}</p>
      <p className="font-mono text-sm text-signal">{label}</p>
      <p className="text-xs text-mist">
        {new Date(result.time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}

function Banner({ tone, children }: { tone: "error"; children: React.ReactNode }) {
  const toneClass =
    tone === "error"
      ? "border-signal-red/30 bg-signal-red/10 text-signal-red"
      : "border-base-700 bg-base-800 text-paper";
  return (
    <div className={`w-full rounded-2xl border p-5 text-center font-mono text-sm animate-driftIn ${toneClass}`}>
      {children}
    </div>
  );
}
