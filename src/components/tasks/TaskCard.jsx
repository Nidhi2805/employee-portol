import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'done']

export default function TaskCard({ task, onUpdate }) {
  async function updateStatus(newStatus) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)
    if (!error) {
      onUpdate?.()
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-800 text-sm">{task.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {task.due_date && (
        <p className="text-xs text-slate-400 mb-3">Due: {task.due_date}</p>
      )}

      <select
        value={task.status}
        onChange={e => updateStatus(e.target.value)}
        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  )
}