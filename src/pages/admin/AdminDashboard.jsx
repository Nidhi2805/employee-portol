import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { sendNotification } from '../../lib/notify'
import {
  LogOut,
  Bell,
  Users,
  Shield,
  FileText,
  Megaphone,
  GitBranch,
  Calendar
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab]         = useState('dashboard')
  const [users, setUsers]                 = useState([])
  const [auditLogs, setAuditLogs]         = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]               = useState(0)
  const [showNotif, setShowNotif]         = useState(false)
  const [annForm, setAnnForm]             = useState({ title: '', body: '', audience: 'all' })
  const [updatingRole, setUpdatingRole]   = useState(null)
  const [updatingManager, setUpdatingManager] = useState(null)

  // Derived counts — recompute every render from users state
  const admins    = users.filter(u => u.role === 'admin')
  const managers  = users.filter(u => u.role === 'manager')
  const employees = users.filter(u => u.role === 'employee')

  useEffect(() => {
    if (profile) {
      fetchUsers()
      fetchAuditLogs()
      fetchAnnouncements()
      fetchNotifications()
    }
  }, [profile])

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Users fetch error:', error)
    } else {
      setUsers(data || [])
    }
  }, [])

  async function fetchAuditLogs() {
    const { data } = await supabase
      .from('audit_logs')
      .select('*, actor:actor_id(name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setAuditLogs(data || [])
  }

  async function updateLeaves(userId, totalLeaves) {

  const { error } = await supabase
    .from('users')
    .update({
      total_leaves: totalLeaves
    })
    .eq('id', userId)

  if (error) {
    toast.error('Failed to update leaves')
  } else {
    toast.success('Leave allocation updated')
    fetchUsers()
  }
}

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*, creator:created_by(name)')
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
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

  async function updateUserRole(userId, newRole, userName) {
    if (userId === profile.id) {
      toast.error("You can't change your own role")
      return
    }
    if (updatingRole) return // prevent double clicks

    setUpdatingRole(userId)

    // 1. Update DB first — wait for confirmation
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      console.error('Role update error:', error)
      toast.error('Failed to update role: ' + error.message)
      setUpdatingRole(null)
      return
    }

    // 2. DB confirmed — now update local state (no fetchUsers, no stale overwrite)
    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
    )

    // 3. Side effects (non-blocking)
    supabase.from('audit_logs').insert({
      actor_id: profile.id,
      action: 'role_change',
      target_type: 'user',
      target_id: userId,
      metadata: { new_role: newRole, user_name: userName }
    }).then(({ data }) => {
      // Refresh audit log silently
      fetchAuditLogs()
    })

    sendNotification(
      userId,
      'role_change',
      `Your role has been updated to "${newRole}" by ${profile.name}`
    )

    toast.success(`${userName}'s role updated to ${newRole}`)
    setUpdatingRole(null)
  }

  async function updateManagerLink(employeeId, managerId) {
    if (updatingManager === employeeId) return
    setUpdatingManager(employeeId)

    const { error } = await supabase
      .from('users')
      .update({ manager_id: managerId || null })
      .eq('id', employeeId)

    if (error) {
      toast.error('Failed to update manager: ' + error.message)
      setUpdatingManager(null)
      return
    }

    // Update local state directly — no fetchUsers
    setUsers(prev =>
      prev.map(u => u.id === employeeId ? { ...u, manager_id: managerId || null } : u)
    )

    toast.success('Manager assigned!')
    setUpdatingManager(null)
  }

  async function postAnnouncement(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('announcements')
      .insert({ ...annForm, created_by: profile.id })
    if (error) {
      toast.error('Failed to post announcement')
    } else {
      toast.success('Announcement posted!')
      setAnnForm({ title: '', body: '', audience: 'all' })
      fetchAnnouncements()
    }
  }

  async function markNotifsRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id)
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const ROLE_COLORS = {
    admin:    'bg-purple-100 text-purple-700',
    manager:  'bg-indigo-100 text-indigo-700',
    employee: 'bg-slate-100 text-slate-600'
  }

  const tabs = [
    { id: 'dashboard',     label: 'Dashboard',    icon: Shield },
    { id: 'users',         label: 'Users',         icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'audit',         label: 'Audit Log',     icon: FileText },
    { id: 'orgchart',      label: 'Org Chart',     icon: GitBranch },
    { id:'leaveAllocation', label: 'Leave Allocation', icon: Calendar },
  ]

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">EP</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{profile.name}</div>
            <div className="text-xs text-purple-500 font-medium">Administrator</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => { setShowNotif(!showNotif); if (!showNotif) markNotifsRead() }}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition"
            >
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
                      <div key={n.id} className={`px-4 py-3 border-b border-slate-50 text-sm ${!n.read ? 'bg-purple-50' : ''}`}>
                        <p className="text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                    ))
                  }
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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: users.length,     color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Admins',      value: admins.length,    color: 'text-slate-700',  bg: 'bg-slate-100' },
                { label: 'Managers',    value: managers.length,  color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Employees',   value: employees.length, color: 'text-blue-600',   bg: 'bg-blue-50'   },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Role distribution bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Role Distribution</h3>
              {users.length > 0 ? (
                <div className="space-y-3">
                  {[
                    { label: 'Admins',    count: admins.length,    color: 'bg-purple-500' },
                    { label: 'Managers',  count: managers.length,  color: 'bg-indigo-500' },
                    { label: 'Employees', count: employees.length, color: 'bg-blue-400'   },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-20 shrink-0">{row.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className={`${row.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: users.length ? `${(row.count / users.length) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-4 text-right">{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-2">No users yet</p>
              )}
            </div>

            {/* Recent audit activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Recent Activity</h3>
                <button onClick={() => setActiveTab('audit')} className="text-xs text-purple-600 hover:underline">
                  View all
                </button>
              </div>
              {auditLogs.slice(0, 5).length === 0
                ? <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>
                : auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-800 truncate">{log.actor?.name || 'System'}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full shrink-0">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">All Users ({users.length})</h2>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Name', 'Email', 'Department', 'Role', 'Manager', 'Change Role'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition">

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-indigo-700 text-xs font-semibold">
                              {u.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-800">{u.name}</span>
                          {u.id === profile.id && (
                            <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">you</span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>

                      {/* Department */}
                      <td className="px-4 py-3 text-sm text-slate-500">{u.department || '—'}</td>

                      {/* Current Role Badge */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Manager assignment (employees only) */}
                      <td className="px-4 py-3">
                        {u.role === 'employee' ? (
                          <select
                            value={u.manager_id || ''}
                            disabled={updatingManager === u.id}
                            onChange={e => updateManagerLink(u.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500 outline-none max-w-[130px] disabled:opacity-50 bg-white cursor-pointer"
                          >
                            <option value="">No manager</option>
                            {managers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Change Role */}
                      <td className="px-4 py-3">
                        {u.id === profile.id ? (
                          <span className="text-xs text-slate-300 italic">own account</span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={updatingRole === u.id}
                            onChange={e => updateUserRole(u.id, e.target.value, u.name)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-wait bg-white cursor-pointer hover:border-purple-400 transition min-w-[100px]"
                          >
                            <option value="employee">employee</option>
                            <option value="manager">manager</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4 text-sm text-blue-700">
              <strong>Tip:</strong> Use the <em>Manager</em> column to link employees to their manager.
              Use <em>Change Role</em> to promote or demote users. All changes are logged to the audit trail.
            </div>
          </div>
        )}

        {/* ── ANNOUNCEMENTS ── */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Post Announcement</h3>
              <form onSubmit={postAnnouncement} className="space-y-3">
                <input
                  value={annForm.title}
                  onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <textarea
                  value={annForm.body}
                  onChange={e => setAnnForm({ ...annForm, body: e.target.value })}
                  placeholder="Message body..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
                <div className="flex gap-3 items-center">
                  <select
                    value={annForm.audience}
                    onChange={e => setAnnForm({ ...annForm, audience: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="all">Everyone</option>
                    <option value="managers">Managers only</option>
                    <option value="employees">Employees only</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Past Announcements</h3>
              {announcements.length === 0
                ? <p className="text-sm text-slate-400 text-center py-6">No announcements yet</p>
                : announcements.map(ann => (
                  <div key={ann.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{ann.title}</p>
                        {ann.body && <p className="text-sm text-slate-500 mt-1">{ann.body}</p>}
                        <p className="text-xs text-slate-400 mt-2">
                          By {ann.creator?.name} · {format(new Date(ann.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize shrink-0 ml-3">
                        {ann.audience}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {activeTab === 'leaveAllocation' && (
  <div>

    <h2 className="font-semibold text-slate-800 mb-4">
      Leave Allocation
    </h2>

    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

      <table className="w-full">

        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
              Employee
            </th>

            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
              Department
            </th>

            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
              Total Leaves
            </th>

            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>

          {users
            .filter(user => user.role === 'employee')
            .map(user => (

            <tr
              key={user.id}
              className="border-b border-slate-50"
            >

              <td className="px-4 py-3 text-sm font-medium text-slate-800">
                {user.name}
              </td>

              <td className="px-4 py-3 text-sm text-slate-500">
                {user.department || '—'}
              </td>

              <td className="px-4 py-3">

                <input
                  type="number"
                  min="0"
                  defaultValue={user.total_leaves || 24}
                  id={`leave-${user.id}`}
                  className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                />

              </td>

              <td className="px-4 py-3">

                <button
                  onClick={() =>
                    updateLeaves(
                      user.id,
                      parseInt(
                        document.getElementById(`leave-${user.id}`).value
                      )
                    )
                  }
                  className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-indigo-700"
                >
                  Save
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  </div>
)}

        {/* ── AUDIT LOG ── */}
        {activeTab === 'audit' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Audit Log</h2>
              <button
                onClick={fetchAuditLogs}
                className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Actor', 'Action', 'Target', 'Details', 'Time'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{log.actor?.name || 'System'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 capitalize">{log.target_type || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No audit logs yet</p>
              )}
            </div>
          </div>
        )}

        {/* ── ORG CHART ── */}
        {activeTab === 'orgchart' && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">Organisation Chart</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-6 overflow-x-auto min-h-[200px]">
              {admins.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No users yet</p>
              ) : (
                admins.map(admin => (
                  <div key={admin.id} className="flex flex-col items-center">
                    <OrgNode user={admin} />
                    {managers.length > 0 && <div className="w-px h-8 bg-slate-200 mt-1" />}
                    <div className="flex gap-8 flex-wrap justify-center">
                      {managers.map(mgr => (
                        <div key={mgr.id} className="flex flex-col items-center">
                          <OrgNode user={mgr} />
                          {employees.filter(e => e.manager_id === mgr.id).length > 0 && (
                            <div className="w-px h-8 bg-slate-200 mt-1" />
                          )}
                          <div className="flex gap-4 flex-wrap justify-center">
                            {employees
                              .filter(e => e.manager_id === mgr.id)
                              .map(emp => <OrgNode key={emp.id} user={emp} />)
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                    {employees.filter(e => !e.manager_id).length > 0 && (
                      <div className="mt-6 w-full">
                        <p className="text-xs text-slate-400 text-center mb-3">— Unassigned employees —</p>
                        <div className="flex gap-4 flex-wrap justify-center">
                          {employees
                            .filter(e => !e.manager_id)
                            .map(emp => <OrgNode key={emp.id} user={emp} />)
                          }
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

function OrgNode({ user }) {
  const styles = {
    admin:    { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-700' },
    manager:  { border: 'border-indigo-400', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    employee: { border: 'border-slate-300',  bg: 'bg-white',     text: 'text-slate-500'  },
  }
  const s = styles[user.role] || styles.employee
  return (
    <div className={`border-2 ${s.border} ${s.bg} rounded-xl px-4 py-2 text-center min-w-[120px] mb-1`}>
      <div className="font-semibold text-sm text-slate-800">{user.name}</div>
      <div className={`text-xs font-medium capitalize mt-0.5 ${s.text}`}>{user.role}</div>
      {user.department && <div className="text-xs text-slate-400 mt-0.5">{user.department}</div>}
    </div>
  )
}