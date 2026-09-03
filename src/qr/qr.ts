import QRCode from "qrcode";

/**
 * Genera un QR real como data URL PNG a partir del qr_token del asistente.
 * El QR codifica únicamente el token opaco, nunca datos personales
 * (regla #16/#20 del prompt): "SENA-QR:<token>".
 */
export async function generateQrDataUrl(qrToken: string): Promise<string> {
  const payload = `SENA-QR:${qrToken}`;
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    color: { dark: "#06110C", light: "#FFFFFF" },
  });
}

/** Extrae el token de un texto leído por el escáner de cámara. */
export function parseQrToken(rawText: string): string | null {
  const match = rawText.match(/^SENA-QR:(.+)$/);
  return match ? match[1] : null;
}

export function downloadQr(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}
