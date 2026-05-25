import { useState } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <h4 className="font-semibold text-sm text-slate-800">Notifications</h4>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No notifications</p>
            ) : notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 ${!n.read ? 'bg-indigo-50/50' : ''}`}>
                <p className="text-sm text-slate-700">{n.message}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}