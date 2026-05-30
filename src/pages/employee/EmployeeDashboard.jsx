import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  LogOut,
  Bell,
  CheckSquare,
  FileText,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function EmployeeDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tasks, setTasks] = useState([])
  const [leaves, setLeaves] = useState([])
  const [reports, setReports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)

  // Report form state
  const [firstHalf, setFirstHalf] = useState('')
  const [secondHalf, setSecondHalf] = useState('')
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportId, setReportId] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' })

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)

  const remainingLeaves =
  (profile?.total_leaves || 0) -
  (profile?.used_leaves || 0)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (profile) {
      fetchTasks()
      fetchLeaves()
      fetchTodayReport()
      fetchNotifications()
      fetchAttendance()
    }
  }, [profile])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', profile.id)
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function clockIn() {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('attendance')
    .insert({
      user_id: profile.id,
      attendance_date: today,
      clock_in: new Date().toISOString()
    })

  if (!error) {
    toast.success('Clocked In')
    fetchAttendance()
  }
}

async function clockOut() {

  const clockInTime = new Date(attendance.clock_in)
  const clockOutTime = new Date()

  const hours =
    ((clockOutTime - clockInTime) / (1000 * 60 * 60))
      .toFixed(2)

  const { error } = await supabase
    .from('attendance')
    .update({
      clock_out: clockOutTime.toISOString(),
      total_hours: hours
    })
    .eq('id', attendance.id)

  if (!error) {
    toast.success('Clocked Out')
    fetchAttendance()
  }
}

  async function fetchAttendance() {
  if (!profile) return

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', profile.id)
    .eq('attendance_date', today)
    .maybeSingle()

  setAttendance(data)
}

  async function fetchLeaves() {
    const { data } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setLeaves(data || [])
  }

  async function fetchTodayReport() {
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .single()
    if (data) {
      setFirstHalf(data.first_half || '')
      setSecondHalf(data.second_half || '')
      setReportSubmitted(data.status === 'submitted' || data.status === 'reviewed')
      setReportId(data.id)
    }
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(15)
    setNotifications(data || [])
    setUnread((data || []).filter(n => !n.read).length)
  }

  async function saveReport(status) {
    const payload = { user_id: profile.id, date: today, first_half: firstHalf, second_half: secondHalf, status }
    if (reportId) {
      await supabase.from('daily_reports').update(payload).eq('id', reportId)
    } else {
      const { data } = await supabase.from('daily_reports').insert(payload).select().single()
      setReportId(data?.id)
    }
    if (status === 'submitted') { setReportSubmitted(true); toast.success('Report submitted!') }
    else toast.success('Draft saved')
  }

  async function applyLeave(e) {
    e.preventDefault()
    const { error } = await supabase.from('leaves').insert({ user_id: profile.id, ...leaveForm })
    if (error) toast.error('Failed to apply')
    else { toast.success('Leave applied!'); setLeaveForm({ start_date: '', end_date: '', reason: '' }); fetchLeaves() }
  if (remainingLeaves <= 0) {
  toast.error('No leave balance remaining')
  return
}
if (daysRequested > remainingLeaves) {
   toast.error('Insufficient leave balance')
   return
}
  }

  async function updateTaskStatus(taskId, status) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    fetchTasks()
    toast.success('Task updated')
  }

  async function markNotifsRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id)
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }


  const PRIORITY_COLORS = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' }
  const STATUS_COLORS = { todo: 'bg-slate-100 text-slate-600', in_progress: 'bg-blue-100 text-blue-700', review: 'bg-yellow-100 text-yellow-700', done: 'bg-green-100 text-green-700' }
  const LEAVE_COLORS = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'reports', label: 'Report', icon: FileText },
    { id: 'leave', label: 'Leave', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">EP</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{profile?.name}</div>
            <div className="text-xs text-slate-400 capitalize">{profile?.role} {profile?.department ? `· ${profile.department}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markNotifsRead() }}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition">
              <Bell className="w-5 h-5 text-slate-600" />
              {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                <div className="p-3 border-b border-slate-100 font-semibold text-sm text-slate-800">Notifications</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0
                    ? <p className="text-sm text-slate-400 text-center py-6">No notifications</p>
                    : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-slate-50 text-sm ${!n.read ? 'bg-indigo-50' : ''}`}>
                        <p className="text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={signOut} className="p-2 rounded-lg hover:bg-slate-100 transition">
            <LogOut className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <nav className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Open Tasks', value: tasks.filter(t => t.status !== 'done').length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Completed', value: tasks.filter(t => t.status === 'done').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Allocated Leaves', value: profile?.total_leaves || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Remaining Leaves', value: remainingLeaves, color: 'text-green-600', bg: 'bg-green-50' }
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Today's Report Status */}
            <div className={`rounded-xl border-2 p-4 flex items-center justify-between ${reportSubmitted ? 'bg-emerald-50 border-emerald-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div>
                <p className="font-semibold text-sm text-slate-800">Today's Work Report</p>
                <p className="text-xs text-slate-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
              </div>
              {reportSubmitted
                ? <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">✓ Submitted</span>
                : <button onClick={() => setActiveTab('reports')} className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-full font-medium hover:bg-yellow-600 transition">Submit Now</button>
              }
            </div>

            {/* Recent Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">Recent Tasks</h2>
                <button onClick={() => setActiveTab('tasks')} className="text-xs text-indigo-600 hover:underline">View all</button>
              </div>
              {tasks.slice(0, 3).map(task => (
                <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-3 mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{task.title}</p>
                    {task.due_date && <p className="text-xs text-slate-400">Due: {task.due_date}</p>}
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>{task.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No tasks assigned yet</p>}
            </div>
          </>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">My Tasks</h2>
            {tasks.length === 0
              ? <p className="text-sm text-slate-400 text-center py-10">No tasks assigned yet</p>
              : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-slate-800 text-sm">{task.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      </div>
                      {task.description && <p className="text-xs text-slate-500 mb-3">{task.description}</p>}
                      {task.due_date && <p className="text-xs text-slate-400 mb-3">Due: {task.due_date}</p>}
                      <select
                        value={task.status}
                        onChange={e => updateTaskStatus(task.id, e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {['todo', 'in_progress', 'review', 'done'].map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Daily Work Report</h3>
              <span className="text-xs text-slate-400">{format(new Date(), 'MMMM d, yyyy')}</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">First Half — Morning</label>
                <textarea
                  value={firstHalf}
                  onChange={e => setFirstHalf(e.target.value)}
                  disabled={reportSubmitted}
                  rows={4}
                  placeholder="What did you work on in the first half?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Second Half — Afternoon</label>
                <textarea
                  value={secondHalf}
                  onChange={e => setSecondHalf(e.target.value)}
                  disabled={reportSubmitted}
                  rows={4}
                  placeholder="What did you work on in the second half?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>
            {!reportSubmitted ? (
              <div className="flex gap-2 mt-4">
                <button onClick={() => saveReport('draft')} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition">Save Draft</button>
                <button onClick={() => saveReport('submitted')} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Submit Report</button>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <span>✓</span> Report submitted for today
              </div>
            )}
          </div>
        )}

        {/* LEAVE TAB */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            {/* Apply Leave */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Apply for Leave</h3>
              <form onSubmit={applyLeave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                    <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                    <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    rows={3} placeholder="Briefly describe the reason..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                </div>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                  Apply for Leave
                </button>
              </form>
            </div>

            {/* Leave History */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Leave History</h3>
              {leaves.length === 0
                ? <p className="text-sm text-slate-400 text-center py-4">No leave applications yet</p>
                : (
                  <div className="space-y-3">
                    {leaves.map(leave => (
                      <div key={leave.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{leave.start_date} → {leave.end_date}</p>
                          {leave.reason && <p className="text-xs text-slate-500 mt-0.5">{leave.reason}</p>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${LEAVE_COLORS[leave.status]}`}>{leave.status}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">

  <h3 className="font-semibold text-slate-800 mb-4">
    Leave Balance
  </h3>

  <div className="grid grid-cols-3 gap-4">

    <div className="text-center">
      <div className="text-2xl font-bold text-blue-600">
        {profile?.total_leaves || 0}
      </div>
      <div className="text-xs text-slate-500">
        Allocated
      </div>
    </div>

    <div className="text-center">
      <div className="text-2xl font-bold text-orange-600">
        {profile?.used_leaves || 0}
      </div>
      <div className="text-xs text-slate-500">
        Used
      </div>
    </div>

    <div className="text-center">
      <div className="text-2xl font-bold text-green-600">
        {remainingLeaves}
      </div>
      <div className="text-xs text-slate-500">
        Remaining
      </div>
    </div>

  </div>

</div>
          </div>

        )}

        {activeTab === 'attendance' && (
  <div className="space-y-6">

    <div className="bg-white rounded-xl border border-slate-200 p-6">

      <h3 className="text-lg font-semibold mb-4">
        Attendance
      </h3>

      <div className="space-y-3">

        <p>
          Status:
          {' '}
          {attendance?.clock_out
            ? 'Completed'
            : attendance?.clock_in
            ? 'Clocked In'
            : 'Not Started'}
        </p>

        <p>
          Clock In:
          {' '}
          {attendance?.clock_in
            ? new Date(attendance.clock_in)
                .toLocaleTimeString()
            : '--'}
        </p>

        <p>
          Clock Out:
          {' '}
          {attendance?.clock_out
            ? new Date(attendance.clock_out)
                .toLocaleTimeString()
            : '--'}
        </p>

        <p>
          Hours Worked:
          {' '}
          {attendance?.total_hours || '0'}
        </p>

      </div>

      <div className="flex gap-3 mt-5">

        {!attendance && (
          <button
            onClick={clockIn}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Clock In
          </button>
        )}

        {attendance &&
          attendance.clock_in &&
          !attendance.clock_out && (
          <button
            onClick={clockOut}
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Clock Out
          </button>
        )}

      </div>

    </div>

  </div>
)}

      </main>
    </div>
  )
}