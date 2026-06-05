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

export async function notifyAdmins(type, message) {
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)

  if (!admins?.length) return
  await supabase.from('notifications').insert(
    admins.map((a) => ({ user_id: a.id, type, message, read: false }))
  )
}

export async function notifyAnnouncementAudience(audience, title, body) {
  let query = supabase.from('users').select('id').eq('is_active', true)

  if (audience === 'managers') {
    query = query.in('role', ['manager', 'admin'])
  } else if (audience === 'employees') {
    query = query.eq('role', 'employee')
  }

  const { data: users } = await query
  if (!users?.length) return

  const message = `📢 ${title}: ${body}`
  await supabase.from('notifications').insert(
    users.map((u) => ({
      user_id: u.id,
      type: 'announcement',
      message,
      read: false,
    }))
  )
}

export async function submitPasswordResetRequest(email) {
  const trimmed = email.trim()
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', trimmed)
    .maybeSingle()

  if (!user) return { error: 'No account found with this email.' }

  const { data: existing } = await supabase
    .from('password_reset_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: null, alreadyPending: true, user }

  const { error } = await supabase
    .from('password_reset_requests')
    .insert({ user_id: user.id, status: 'pending' })

  if (error) return { error: error.message }

  await notifyAdmins(
    'password_reset',
    `${user.name} (${user.email}) requested a password reset.`
  )

  return { error: null, user }
}