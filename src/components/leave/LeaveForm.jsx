import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function LeaveForm({ onSuccess }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('leaves').insert({
      user_id: profile.id,
      ...form,
      status: 'pending',
    })
    if (error) toast.error('Failed to apply for leave')
    else {
      toast.success('Leave application submitted!')
      setForm({ start_date: '', end_date: '', reason: '' })
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
          <input
            type="date"
            value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
        <textarea
          value={form.reason}
          onChange={e => setForm({ ...form, reason: e.target.value })}
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          placeholder="Briefly describe the reason..."
        />
      </div>
      <button
        type="submit"
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
      >
        Apply for Leave
      </button>
    </form>
  )
}