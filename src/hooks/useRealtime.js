import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table, callback) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table },
        payload => callback(payload)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [table])
}