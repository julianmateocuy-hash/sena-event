import { supabase } from "@/lib/supabase";
import { extractFunctionErrorMessage } from "@/lib/functionsError";
import type { Profile, UserRole } from "@/types/database";

export async function listStaff(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["super_admin", "event_admin", "delegate"])
    .order("role")
    .order("full_name");
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function createStaffUser(input: {
  full_name: string;
  email: string;
  role: Extract<UserRole, "event_admin" | "delegate">;
}) {
  const { data, error } = await supabase.functions.invoke<{ id: string; email: string }>(
    "create-staff-user",
    { body: input }
  );
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  return data;
}

export async function setStaffActive(profileId: string, active: boolean) {
  const { error } = await supabase.from("profiles").update({ active }).eq("id", profileId);
  if (error) throw error;
}
