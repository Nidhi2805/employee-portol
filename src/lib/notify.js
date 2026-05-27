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