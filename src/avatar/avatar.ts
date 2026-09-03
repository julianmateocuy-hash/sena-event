import { supabase } from "@/lib/supabase";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB antes de comprimir
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TARGET_DIMENSION = 512;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato no permitido. Usa JPG, PNG o WEBP.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "La imagen es muy pesada (máx. 4MB).";
  }
  return null;
}

/** Redimensiona/comprime en el navegador antes de subir. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TARGET_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Error al comprimir imagen."))),
      "image/webp",
      0.85
    );
  });
}

export async function uploadAvatar(file: File, documentNumber: string): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const compressed = await compressImage(file);
  const path = `${documentNumber}/${Date.now()}.webp`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, compressed, { contentType: "image/webp", upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/** Iniciales para el avatar automático cuando no hay fotografía. */
export function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Color determinístico (no aleatorio) a partir del nombre, para consistencia visual. */
export function colorFromName(fullName: string): string {
  const palette = ["#39D98A", "#2FB8D9", "#E8B339", "#B98FE8", "#E8708F"];
  let hash = 0;
  for (const char of fullName) hash = (hash * 31 + char.charCodeAt(0)) % palette.length;
  return palette[Math.abs(hash) % palette.length];
}
