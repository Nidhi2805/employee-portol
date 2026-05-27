import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useRealtime } from './useRealtime'

export function useNotifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (profile) fetch()
  }, [profile])

  useRealtime('notifications', (payload) => {
    if (payload.new?.user_id === profile?.id) {
      setNotifications(prev => [payload.new, ...prev])
    }
  })

  async function fetch() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  async function markAllRead() {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAllRead
  }
}