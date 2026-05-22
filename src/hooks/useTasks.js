import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useTasks() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchTasks()
  }, [profile])

  async function fetchTasks() {
    const query = supabase.from('tasks').select('*, assignee:assigned_to(name)')
    // Employees see only their tasks; managers/admins see all assigned by them
    if (profile.role === 'employee') {
      query.eq('assigned_to', profile.id)
    } else {
      query.eq('assigned_by', profile.id)
    }
    const { data } = await query.order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  async function createTask(taskData) {
    const { error } = await supabase.from('tasks').insert({
      ...taskData,
      assigned_by: profile.id,
    })
    if (!error) fetchTasks()
    return { error }
  }

  return { tasks, loading, refetch: fetchTasks, createTask }
}