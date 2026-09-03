import { supabase } from "@/lib/supabase";
import { extractFunctionErrorMessage } from "@/lib/functionsError";
import type { Attendee, EventRegistration } from "@/types/database";

export interface RegisterAttendeePayload {
  event_id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  email: string;
  phone: string;
  program?: string;
  institution?: string;
  city?: string;
  avatar_url?: string | null;
}

export interface RegisterAttendeeResponse {
  attendee: Attendee;
  registration: EventRegistration;
  already_registered: boolean;
}

/**
 * Registro público de un asistente a un evento.
 * Pasa siempre por la Edge Function `register-attendee`, que:
 *  - valida los datos y el estado del evento,
 *  - llama a find_or_create_attendee() + register_for_event() (RPC atómicas),
 *  - dispara el correo con el QR (Edge Function send-registration-email).
 * El frontend nunca escribe directamente en `attendees` ni `event_registrations`.
 */
export async function registerAttendee(
  payload: RegisterAttendeePayload
): Promise<RegisterAttendeeResponse> {
  const { data, error } = await supabase.functions.invoke<RegisterAttendeeResponse>(
    "register-attendee",
    { body: payload }
  );
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if (!data) throw new Error("Respuesta vacía del servidor.");
  return data;
}

export async function requestQrResend(attendeeId: string) {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; code?: string }>(
    "resend-qr",
    { body: { attendee_id: attendeeId } }
  );
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  return data;
}
