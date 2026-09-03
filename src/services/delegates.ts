import { supabase } from "@/lib/supabase";
import type { EventDelegate, Profile } from "@/types/database";

export async function listDelegates(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "delegate")
    .order("full_name");
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export interface DelegateAssignment extends EventDelegate {
  events: { id: string; name: string };
}

export async function listAssignmentsForEvent(eventId: string): Promise<EventDelegate[]> {
  const { data, error } = await supabase
    .from("event_delegates")
    .select("*")
    .eq("event_id", eventId);
  if (error) throw error;
  return (data as EventDelegate[]) ?? [];
}

export async function assignDelegateToEvent(eventId: string, delegateId: string) {
  const { error } = await supabase
    .from("event_delegates")
    .upsert(
      { event_id: eventId, delegate_id: delegateId, active: true },
      { onConflict: "event_id,delegate_id" }
    );
  if (error) throw error;
}

export async function setDelegateAssignmentActive(assignmentId: string, active: boolean) {
  const { error } = await supabase
    .from("event_delegates")
    .update({ active })
    .eq("id", assignmentId);
  if (error) throw error;
}
