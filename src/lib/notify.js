import { supabase } from './supabase'

export async function sendNotification(userId, type, message) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    message,
    read: false
  })
}

// Notify entire team
export async function notifyTeam(managerId, type, message) {
  const { data: team } = await supabase
    .from('users')
    .select('id')
    .eq('manager_id', managerId)

  if (!team?.length) return
  await supabase.from('notifications').insert(
    team.map(u => ({ user_id: u.id, type, message, read: false }))
  )
}

export async function submitPasswordResetRequest(email) {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail) return { error: "Email is required" };

  const { data: existing, error: checkError } = await supabase
    .from('password_reset_requests')
    .select('id')
    .eq('email', trimmedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (checkError) return { error: checkError.message || "Failed to check request" };
  if (existing) return { alreadyPending: true };

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', trimmedEmail)
    .maybeSingle();

  if (userError) return { error: userError.message || "Failed to lookup user" };

  const { error: insertError } = await supabase.from('password_reset_requests').insert({
    email: trimmedEmail,
    user_id: user?.id || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  if (insertError) return { error: insertError.message || "Failed to submit reset request" };
  return { success: true };
}

export async function notifyAnnouncementAudience(audience, title, body) {
  let query = supabase.from('users').select('id').neq('is_active', false);

  if (audience === 'managers') query = query.eq('role', 'manager');
  else if (audience === 'employees') query = query.eq('role', 'employee');

  const { data: users, error } = await query;
  if (error || !users?.length) return;

  await supabase.from('notifications').insert(
    users.map((user) => ({
      user_id: user.id,
      type: 'announcement',
      message: `${title}: ${body}`,
      read: false,
    }))
  );
}
