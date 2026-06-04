import { supabase } from "./supabase";

/**
 * Direct reports for a manager (from users.manager_id).
 * Treats null is_active as active; only excludes explicit false.
 */
export async function fetchTeamMembers(managerId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, is_active, position, department")
    .eq("manager_id", managerId);

  if (error) return { team: [], error };

  const team = (data || []).filter((u) => u.is_active !== false);
  return { team, error: null };
}
