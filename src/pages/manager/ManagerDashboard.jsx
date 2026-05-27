import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { sendNotification } from '../../lib/notify'
import {
  LogOut, Bell, Users, FileText,
  Calendar, CheckSquare, BarChart2
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function ManagerDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab]   = useState('dashboard')
  const [team, setTeam]             = useState([])
  const [teamIds, setTeamIds]       = useState([])
  const [reports, setReports]       = useState([])
  const [leaves, setLeaves]         = useState([])
  const [allLeaves, setAllLeaves]   = useState([])
  const [tasks, setTasks]           = useState([])
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]         = useState(0)
  const [showNotif, setShowNotif]   = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm]     = useState({
    title: '', description: '', assigned_to: '', priority: 'medium', due_date: ''
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  const PRIORITY_COLORS = {
    low:    'bg-slate-100 text-slate-600',
    medium: 'bg-blue-100 text-blue-700',
    high:   'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  }
  const STATUS_COLORS = {
    todo:        'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    review:      'bg-yellow-100 text-yellow-700',
    done:        'bg-green-100 text-green-700'
  }

  // ── 1. Load team first, then everything else ──
  useEffect(() => {
    if (profile) loadTeam()
  }, [profile])

  async function loadTeam() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('manager_id', profile.id)

    if (error) { console.error('Team fetch error:', error); return }

    const members = data || []
    setTeam(members)

    const ids = members.map(u => u.id)
    setTeamIds(ids)

    // Now load everything that depends on team IDs
    if (ids.length > 0) {
      loadReports(ids)
      loadLeaves(ids)
      loadAllLeaves(ids)
    }

    loadTasks()
    loadNotifications()
  }

  async function loadReports(ids) {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*, user:user_id(id, name, email)')
      .in('user_id', ids)
      .eq('date', today)
      .order('created_at', { ascending: false })

    if (error) console.error('Reports error:', error)
    else setReports(data || [])
  }

  async function loadLeaves(ids) {
    // Pending only — for approval queue
    const { data, error } = await supabase
      .from('leaves')
      .select('*, user:user_id(id, name, email)')
      .in('user_id', ids)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) console.error('Leaves error:', error)
    else setLeaves(data || [])
  }

  async function loadAllLeaves(ids) {
    // All leaves — for the leaves tab history
    const { data, error } = await supabase
      .from('leaves')
      .select('*, user:user_id(id, name, email)')
      .in('user_id', ids)
      .order('created_at', { ascending: false })

    if (error) console.error('All leaves error:', error)
    else setAllLeaves(data || [])
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignee:assigned_to(name)')
      .eq('assigned_by', profile.id)
      .order('created_at', { ascending: false })

    if (error) console.error('Tasks error:', error)
    else setTasks(data || [])
  }

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(15)
    setNotifications(data || [])
    setUnread((data || []).filter(n => !n.read).length)
  }

  async function reviewLeave(leaveId, status, employeeId) {
    const { error } = await supabase
      .from('leaves')
      .update({
        status,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', leaveId)

    if (!error) {
      await sendNotification(
        employeeId,
        'leave_update',
        `Your leave request has been ${status} by ${profile.name}`
      )
      await supabase.from('audit_logs').insert({
        actor_id: profile.id,
        action: `leave_${status}`,
        target_type: 'leave',
        target_id: leaveId
      })
      toast.success(`Leave ${status}`)
      loadLeaves(teamIds)
      loadAllLeaves(teamIds)
    }
  }

  async function reviewReport(reportId, comment, employeeId) {
    await supabase
      .from('daily_reports')
      .update({ status: 'reviewed', manager_comment: comment })
      .eq('id', reportId)

    await sendNotification(
      employeeId,
      'report_reviewed',
      `${profile.name} reviewed your daily report${comment ? `: "${comment}"` : ''}`
    )
    toast.success('Report reviewed')
    loadReports(teamIds)
  }

  async function createTask(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('tasks')
      .insert({ ...taskForm, assigned_by: profile.id })

    if (error) { toast.error('Failed to create task'); return }

    // Notify the assigned employee
    await sendNotification(
      taskForm.assigned_to,
      'task_assigned',
      `${profile.name} assigned you a new task: "${taskForm.title}"`
    )
    toast.success('Task created!')
    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' })
    setShowTaskForm(false)
    loadTasks()
  }

  async function markNotifsRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id)
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const todaySubmitted = reports.filter(
    r => r.status === 'submitted' || r.status === 'reviewed'
  ).length

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'reports',   label: 'Reports',   icon: FileText },
    { id: 'leaves',    label: 'Leaves',    icon: Calendar,    badge: leaves.length },
    { id: 'tasks',     label: 'Tasks',     icon: CheckSquare },
    { id: 'team',      label: 'Team',      icon: Users },
  ]

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">EP</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{profile.name}</div>
            <div className="text-xs text-indigo-500 font-medium">Manager</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markNotifsRead() }}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition">
              <Bell className="w-5 h-5 text-slate-600" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-11 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm">Notifications</div>
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

      {/* Tabs */}
      <nav className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap
                ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <>
            {/* Debug info — remove after testing */}
            {team.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                ⚠️ No team members found. Make sure employees have <code className="bg-yellow-100 px-1 rounded">manager_id</code> set to your user ID in Supabase.
                <div className="mt-1 text-xs text-yellow-600">Your ID: <code className="bg-yellow-100 px-1 rounded">{profile.id}</code></div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Team Size',       value: team.length,                                      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
                { label: 'Reports Today',   value: `${todaySubmitted}/${team.length}`,               color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Pending Leaves',  value: leaves.length,                                    color: 'text-orange-600',  bg: 'bg-orange-50' },
                { label: 'Open Tasks',      value: tasks.filter(t => t.status !== 'done').length,    color: 'text-blue-600',    bg: 'bg-blue-50' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Pending leaves alert */}
            {leaves.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">⏳ Pending Leave Approvals</h3>
                {leaves.map(leave => (
                  <div key={leave.id} className="flex items-center justify-between bg-white rounded-lg p-3 mb-2 last:mb-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{leave.user?.name}</p>
                      <p className="text-xs text-slate-500">{leave.start_date} → {leave.end_date}</p>
                      {leave.reason && <p className="text-xs text-slate-400 mt-0.5 italic">"{leave.reason}"</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => reviewLeave(leave.id, 'approved', leave.user?.id)}
                        className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition">
                        Approve
                      </button>
                      <button onClick={() => reviewLeave(leave.id, 'rejected', leave.user?.id)}
                        className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Report submission progress */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Today's Report Submissions</h3>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                <div className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: team.length ? `${(todaySubmitted / team.length) * 100}%` : '0%' }} />
              </div>
              <p className="text-sm text-slate-500">{todaySubmitted} of {team.length} submitted today</p>
              {team.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {team.map(member => {
                    const submitted = reports.find(r => r.user_id === member.id)
                    return (
                      <span key={member.id}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          submitted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {submitted ? '✓' : '○'} {member.name}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── REPORTS ── */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">
              Today's Reports — {format(new Date(), 'MMMM d, yyyy')}
            </h2>
            {reports.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <p className="text-slate-400 text-sm">No reports submitted today</p>
                {team.length === 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    (No team members linked to your account yet)
                  </p>
                )}
              </div>
            ) : (
              reports.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onReview={(id, comment) => reviewReport(id, comment, report.user?.id)}
                />
              ))
            )}
          </div>
        )}

        {/* ── LEAVES ── */}
        {activeTab === 'leaves' && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">Leave Management</h2>

            {/* Pending */}
            {leaves.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-orange-600 mb-3 uppercase tracking-wide">
                  Pending Approval ({leaves.length})
                </h3>
                {leaves.map(leave => (
                  <div key={leave.id} className="bg-white border-2 border-orange-200 rounded-xl p-4 mb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{leave.user?.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{leave.start_date} → {leave.end_date}</p>
                        {leave.reason && (
                          <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2 italic">
                            "{leave.reason}"
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
                        <button onClick={() => reviewLeave(leave.id, 'approved', leave.user?.id)}
                          className="text-sm bg-emerald-500 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-600 transition">
                          Approve
                        </button>
                        <button onClick={() => reviewLeave(leave.id, 'rejected', leave.user?.id)}
                          className="text-sm bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All history */}
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">
              All Leaves
            </h3>
            {allLeaves.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No leave applications yet</p>
            ) : (
              allLeaves.map(leave => (
                <div key={leave.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{leave.user?.name}</p>
                    <p className="text-xs text-slate-500">{leave.start_date} → {leave.end_date}</p>
                    {leave.reason && <p className="text-xs text-slate-400 mt-0.5">{leave.reason}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                    leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {leave.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TASKS ── */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Team Tasks</h2>
              <button onClick={() => setShowTaskForm(!showTaskForm)}
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                + Assign Task
              </button>
            </div>

            {showTaskForm && (
              <form onSubmit={createTask} className="bg-white border border-slate-200 rounded-xl p-5 mb-4 space-y-3">
                <h3 className="font-semibold text-slate-800">New Task</h3>
                <input value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title" required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <textarea value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Description (optional)" rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                <div className="grid grid-cols-3 gap-3">
                  <select value={taskForm.assigned_to}
                    onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    required
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Assign to...</option>
                    {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <select value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {['low', 'medium', 'high', 'urgent'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <input type="date" value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="flex gap-2">
                  <button type="submit"
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
                    Create Task
                  </button>
                  <button type="button" onClick={() => setShowTaskForm(false)}
                    className="border border-slate-200 px-5 py-2 rounded-lg text-sm hover:bg-slate-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No tasks created yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tasks.map(task => (
                  <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">→ {task.assignee?.name || 'Unassigned'}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && <p className="text-xs text-slate-500 mb-2">{task.description}</p>}
                    {task.due_date && <p className="text-xs text-slate-400 mb-2">Due: {task.due_date}</p>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TEAM ── */}
        {activeTab === 'team' && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">My Team ({team.length})</h2>
            {team.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <p className="text-slate-400 text-sm">No team members yet</p>
                <p className="text-xs text-slate-400 mt-2">
                  Set <code className="bg-slate-100 px-1 rounded">manager_id</code> to{' '}
                  <code className="bg-slate-100 px-1 rounded">{profile.id}</code>{' '}
                  for each employee in Supabase
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {team.map(member => {
                  const memberReports = reports.filter(r => r.user_id === member.id)
                  const submittedToday = memberReports.some(
                    r => r.status === 'submitted' || r.status === 'reviewed'
                  )
                  return (
                    <div key={member.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-indigo-700 font-semibold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                        {member.department && (
                          <p className="text-xs text-indigo-500 mt-0.5">{member.department}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                        submittedToday
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {submittedToday ? 'Reported' : 'Pending'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

// ── Report Card Sub-component ──
function ReportCard({ report, onReview }) {
  const [comment, setComment]   = useState('')
  const [reviewing, setReviewing] = useState(false)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-800">{report.user?.name}</p>
          <p className="text-xs text-slate-400">{report.user?.email}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          report.status === 'reviewed'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {report.status}
        </span>
      </div>

      {report.first_half && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Morning</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{report.first_half}</p>
        </div>
      )}
      {report.second_half && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Afternoon</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{report.second_half}</p>
        </div>
      )}

      {report.manager_comment && (
        <div className="bg-indigo-50 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs font-medium text-indigo-600 mb-0.5">Your comment</p>
          <p className="text-sm text-indigo-800">{report.manager_comment}</p>
        </div>
      )}

      {report.status !== 'reviewed' && (
        reviewing ? (
          <div className="flex gap-2 mt-2">
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Add a comment (optional)..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <button
              onClick={() => { onReview(report.id, comment); setReviewing(false) }}
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition">
              Mark Reviewed
            </button>
            <button onClick={() => setReviewing(false)}
              className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setReviewing(true)}
            className="text-xs text-indigo-600 hover:underline mt-1 font-medium">
            + Review this report
          </button>
        )
      )}
    </div>
  )
}