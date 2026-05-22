import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function DailyReportForm() {
  const { profile } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [firstHalf, setFirstHalf] = useState('')
  const [secondHalf, setSecondHalf] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [reportId, setReportId] = useState(null)

  useEffect(() => {
    fetchTodayReport()
  }, [profile])

  async function fetchTodayReport() {
    if (!profile) return
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .single()

    if (data) {
      setFirstHalf(data.first_half || '')
      setSecondHalf(data.second_half || '')
      setSubmitted(data.status === 'submitted' || data.status === 'reviewed')
      setReportId(data.id)
    }
  }

  async function handleSave(status = 'draft') {
    if (!profile) return

    const payload = {
      user_id: profile.id,
      date: today,
      first_half: firstHalf,
      second_half: secondHalf,
      status,
    }

    if (reportId) {
      await supabase.from('daily_reports').update(payload).eq('id', reportId)
    } else {
      const { data } = await supabase.from('daily_reports').insert(payload).select().single()
      setReportId(data?.id)
    }

    if (status === 'submitted') {
      setSubmitted(true)
      toast.success('Report submitted!')
    } else {
      toast.success('Draft saved')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Daily Work Report</h3>
        <span className="text-xs text-slate-400">{format(new Date(), 'MMMM d, yyyy')}</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            First Half (Morning)
          </label>
          <textarea
            value={firstHalf}
            onChange={e => setFirstHalf(e.target.value)}
            disabled={submitted}
            rows={3}
            placeholder="What did you work on in the first half?"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Second Half (Afternoon)
          </label>
          <textarea
            value={secondHalf}
            onChange={e => setSecondHalf(e.target.value)}
            disabled={submitted}
            rows={3}
            placeholder="What did you work on in the second half?"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      </div>

      {!submitted ? (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => handleSave('draft')}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave('submitted')}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Submit Report
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm">
          <span>✓</span> Report submitted for today
        </div>
      )}
    </div>
  )
}