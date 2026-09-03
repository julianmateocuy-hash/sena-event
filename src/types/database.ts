export type UserRole = "super_admin" | "event_admin" | "delegate";
export type EventStatus = "draft" | "upcoming" | "active" | "finished" | "cancelled";
export type RegistrationStatus = "registered" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendee {
  id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  email: string;
  phone: string;
  program: string | null;
  institution: string | null;
  city: string | null;
  avatar_url: string | null;
  qr_token: string;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  name: string;
  slug: string;
  event_code: string;
  description: string | null;
  banner_url: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  attendee_id: string;
  registration_date: string;
  status: RegistrationStatus;
  created_at: string;
}

export interface EventDelegate {
  id: string;
  event_id: string;
  delegate_id: string;
  assigned_at: string;
  active: boolean;
}

export interface Attendance {
  id: string;
  event_id: string;
  attendee_id: string;
  attendance_date: string;
  entry_time: string | null;
  entry_delegate_id: string | null;
  exit_time: string | null;
  exit_delegate_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QrResendLog {
  id: string;
  attendee_id: string;
  requested_at: string;
}

/** Resultado de la RPC process_attendance (ver schema.sql, sección 13). */
export type AttendanceResult =
  | {
      ok: true;
      action: "entry" | "exit";
      attendee: { id: string; full_name: string; avatar_url: string | null };
      event_name: string;
      time: string;
    }
  | {
      ok: false;
      code:
        | "NOT_AUTHORIZED"
        | "QR_INVALID"
        | "EVENT_NOT_ACTIVE"
        | "NOT_REGISTERED"
        | "ATTENDANCE_COMPLETE";
    };

/** Resultado de la RPC request_qr_resend (ver schema.sql). */
export type QrResendResult = { ok: true } | { ok: false; code: "RATE_LIMITED" };

// Tipado mínimo para el cliente supabase-js (relaciones/tablas usadas en el frontend).
// No pretende ser un espejo 1:1 de `supabase gen types` — reemplázalo por el
// generado oficial (`supabase gen types typescript`) cuando conectes el proyecto real.
//
// IMPORTANTE: @supabase/supabase-js necesita que cada schema tenga las CUATRO
// claves (Tables, Views, Functions, Enums) para poder inferir los tipos de fila
// de .select()/.insert()/.update() y los de .rpc(). Si falta cualquiera de
// ellas, `Database['public']` deja de cumplir el `GenericSchema` que espera el
// cliente y TODO colapsa silenciosamente a `never` — no solo en la tabla
// afectada, sino en cualquier .from()/.rpc() de todo el proyecto (por eso un
// solo campo faltante puede producir docenas de errores TS2339/TS2345/TS2353
// aparentemente no relacionados entre sí).
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      attendees: { Row: Attendee; Insert: Partial<Attendee>; Update: Partial<Attendee> };
      events: { Row: EventRow; Insert: Partial<EventRow>; Update: Partial<EventRow> };
      event_registrations: {
        Row: EventRegistration;
        Insert: Partial<EventRegistration>;
        Update: Partial<EventRegistration>;
      };
      event_delegates: {
        Row: EventDelegate;
        Insert: Partial<EventDelegate>;
        Update: Partial<EventDelegate>;
      };
      attendance: { Row: Attendance; Insert: Partial<Attendance>; Update: Partial<Attendance> };
      qr_resend_log: {
        Row: QrResendLog;
        Insert: Partial<QrResendLog>;
        Update: Partial<QrResendLog>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      process_attendance: {
        Args: { p_qr_token: string; p_event_id: string; p_delegate_id: string };
        Returns: AttendanceResult;
      };
      find_or_create_attendee: {
        Args: {
          p_full_name: string;
          p_document_type: string;
          p_document_number: string;
          p_email: string;
          p_phone: string;
          p_program: string;
          p_institution: string;
          p_city: string;
          p_avatar_url: string;
        };
        Returns: Attendee;
      };
      register_for_event: {
        Args: { p_event_id: string; p_attendee_id: string };
        Returns: { registration: EventRegistration; already_registered: boolean }[];
      };
      request_qr_resend: {
        Args: { p_attendee_id: string };
        Returns: QrResendResult;
      };
      current_role_is: {
        Args: { p_roles: UserRole[] };
        Returns: boolean;
      };
      is_delegate_for_event: {
        Args: { p_event_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      registration_status: RegistrationStatus;
    };
  };
}
