import { useAttendance } from '../../hooks/useAttendance'
import toast from 'react-hot-toast'

export default function ClockButton() {
  const { clockedIn, elapsed, loading, clockIn, clockOut, formatElapsed } = useAttendance()

  async function handleClick() {
    if (clockedIn) {
      const { error } = await clockOut()
      if (error) toast.error('Clock out failed')
      else toast.success('Clocked out successfully!')
    } else {
      const { error } = await clockIn()
      if (error) toast.error('Clock in failed')
      else toast.success('Clocked in! Have a productive day 👋')
    }
  }

  if (loading) return <div className="animate-pulse h-36 bg-slate-100 rounded-xl" />

  return (
    <div className={`rounded-xl p-6 text-center transition-all ${
      clockedIn ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-slate-50 border-2 border-slate-200'
    }`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        {clockedIn ? 'Currently Working' : 'Not Clocked In'}
      </div>

      {clockedIn && (
        <div className="text-4xl font-mono font-bold text-emerald-700 mb-4 tabular-nums">
          {formatElapsed(elapsed)}
        </div>
      )}

      <button
        onClick={handleClick}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-100 ${
          clockedIn
            ? 'bg-red-500 hover:bg-red-600 shadow-red-200 shadow-lg'
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg'
        }`}
      >
        {clockedIn ? '🔴 Clock Out' : '🟢 Clock In'}
      </button>

      <p className="text-xs text-slate-400 mt-2">
        {clockedIn ? 'Your work session is being tracked' : 'Click to start your work session'}
      </p>
    </div>
  )
}