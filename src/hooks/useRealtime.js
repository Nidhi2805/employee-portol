import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table, filter, callback) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...filter },
        payload => callback(payload)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table])
}