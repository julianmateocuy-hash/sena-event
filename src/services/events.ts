import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types/database";

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const { data, error } = await supabase.from("events").select("*").eq("slug", slug).single();
  if (error) return null;
  return data as EventRow;
}

export async function listEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data as EventRow[]) ?? [];
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface CreateEventInput {
  name: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  capacity?: number;
  banner_url?: string;
  created_by: string;
}

export async function createEvent(input: CreateEventInput): Promise<EventRow> {
  const { data, error } = await supabase
    .from("events")
    .insert({ ...input, slug: slugify(input.name), status: "upcoming" })
    .select()
    .single();
  if (error) throw error;
  return data as EventRow;
}

export async function setEventStatus(eventId: string, status: EventRow["status"]) {
  const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
  if (error) throw error;
}

export function publicRegistrationUrl(slug: string) {
  return `${window.location.origin}/evento/${slug}/registro`;
}
