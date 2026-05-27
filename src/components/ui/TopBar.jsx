import { LogOut, Bell } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'
import { format } from 'date-fns'

export default function TopBar({ accentColor = 'bg-indigo-600' }) {
  const { profile, signOut } = useAuth()
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)

  const ROLE_COLORS = {
    admin:    'text-purple-500',
    manager:  'text-indigo-500',
    employee: 'text-slate-400',
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 ${accentColor} rounded-lg flex items-center justify-center`}>
          <span className="text-white text-sm font-bold">EP</span>
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">{profile?.name}</div>
          <div className={`text-xs font-medium capitalize ${ROLE_COLORS[profile?.role]}`}>
            {profile?.role}{profile?.department ? ` · ${profile.department}` : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead() }}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-11 w-76 bg-white rounded-xl shadow-xl border border-slate-200 z-50 w-72">
              <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">
                Notifications
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0
                  ? <p className="text-sm text-slate-400 text-center py-6">All caught up!</p>
                  : notifications.map(n => (
                    <div key={n.id}
                      className={`px-4 py-3 border-b border-slate-50 last:border-0 text-sm transition
                        ${!n.read ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                      <p className="text-slate-700">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(n.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}