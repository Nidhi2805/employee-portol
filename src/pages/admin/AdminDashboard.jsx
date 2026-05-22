import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { LogOut, Bell, Users, Shield, FileText, Megaphone, GitBranch } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)

  // New user form
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'employee', department: '', manager_id: '' })
  const [showUserForm, setShowUserForm] = useState(false)

  // Announcement form
  const [annForm, setAnnForm] = useState({ title: '', body: '', audience: 'all' })

  useEffect(() => {
    if (profile) { fetchUsers(); fetchAuditLogs(); fetchAnnouncements(); fetchNotifications() }
  }, [profile])

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }

  async function fetchAuditLogs() {
    const { data } = await supabase.from('audit_logs').select('*, actor:actor_id(name)').order('created_at', { ascending: false }).limit(50)
    setAuditLogs(data || [])
  }

  async function fetchAnnouncements() {
    const { data } = await supabase.from('announcements').select('*, creator:created_by(name)').order('created_at', { ascending: false })
    setAnnouncements(data || [])
  }

  async function fetchNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(15)
    setNotifications(data || [])
    setUnread((data || []).filter(n => !n.read).length)
  }

  async function updateUserRole(userId, role) {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (!error) {
      toast.success('Role updated')
      // Log to audit
      await supabase.from('audit_logs').insert({ actor_id: profile.id, action: 'role_change', target_type: 'user', target_id: userId, metadata: { new_role: role } })
      fetchUsers(); fetchAuditLogs()
    }
  }

  async function postAnnouncement(e) {
    e.preventDefault()
    const { error } = await supabase.from('announcements').insert({ ...annForm, created_by: profile.id })
    if (error) toast.error('Failed to post')
    else { toast.success('Announcement posted!'); setAnnForm({ title: '', body: '', audience: 'all' }); fetchAnnouncements() }
  }

  async function markNotifsRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id)
    setUnread(0)
  }

  const managers = users.filter(u => u.role === 'manager')
  const employees = users.filter(u => u.role === 'employee')
  const admins = users.filter(u => u.role === 'admin')

  const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-indigo-100 text-indigo-700', employee: 'bg-slate-100 text-slate-600' }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'orgchart', label: 'Org Chart', icon: GitBranch },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">EP</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{profile?.name}</div>
            <div className="text-xs text-purple-500 font-medium">Administrator</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markNotifsRead() }}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition">
              <Bell className="w-5 h-5 text-slate-600" />
              {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                <div className="p-3 border-b border-slate-100 font-semibold text-sm">Notifications</div>
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
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: users.length, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Managers', value: managers.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Employees', value: employees.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Admins', value: admins.length, color: 'text-slate-600', bg: 'bg-slate-100' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent audit logs */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Recent Activity</h3>
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <span className="text-sm text-slate-700 font-medium">{log.actor?.name || 'System'}</span>
                    <span className="text-sm text-slate-500"> · {log.action.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>}
            </div>
          </>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">All Users ({users.length})</h2>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Name', 'Email', 'Department', 'Role', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-indigo-700 text-xs font-semibold">{user.name.charAt(0)}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-800">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{user.department || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.id !== profile.id && (
                          <select
                            value={user.role}
                            onChange={e => updateUserRole(user.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500 outline-none"
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
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Post Announcement</h3>
              <form onSubmit={postAnnouncement} className="space-y-3">
                <input value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="Announcement title" required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                <textarea value={annForm.body} onChange={e => setAnnForm({ ...annForm, body: e.target.value })}
                  placeholder="Message body..." rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                <div className="flex gap-3 items-center">
                  <select value={annForm.audience} onChange={e => setAnnForm({ ...annForm, audience: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value="all">Everyone</option>
                    <option value="managers">Managers only</option>
                    <option value="employees">Employees only</option>
                  </select>
                  <button type="submit" className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition">
                    Post
                  </button>
                </div>
              </form>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Past Announcements</h3>
              {announcements.map(ann => (
                <div key={ann.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{ann.title}</p>
                      {ann.body && <p className="text-sm text-slate-500 mt-1">{ann.body}</p>}
                      <p className="text-xs text-slate-400 mt-2">By {ann.creator?.name} · {format(new Date(ann.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{ann.audience}</span>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No announcements yet</p>}
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {activeTab === 'audit' && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">Audit Log</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Actor', 'Action', 'Target', 'Time'].map(h => (
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
                      <td className="px-4 py-3 text-xs text-slate-400">{format(new Date(log.created_at), 'MMM d, h:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No audit logs yet</p>}
            </div>
          </div>
        )}

        {/* ORG CHART */}
        {activeTab === 'orgchart' && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">Organisation Chart</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-6 overflow-x-auto">
              {admins.map(admin => (
                <div key={admin.id} className="flex flex-col items-center">
                  <OrgNode user={admin} />
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="flex gap-8 flex-wrap justify-center">
                    {managers.map(mgr => (
                      <div key={mgr.id} className="flex flex-col items-center">
                        <OrgNode user={mgr} />
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="flex gap-4 flex-wrap justify-center">
                          {employees.filter(e => e.manager_id === mgr.id).map(emp => (
                            <OrgNode key={emp.id} user={emp} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No users yet</p>}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

function OrgNode({ user }) {
  const COLORS = { admin: 'border-purple-400 bg-purple-50', manager: 'border-indigo-400 bg-indigo-50', employee: 'border-slate-300 bg-white' }
  const TEXT = { admin: 'text-purple-700', manager: 'text-indigo-700', employee: 'text-slate-600' }
  return (
    <div className={`border-2 rounded-xl px-4 py-2 text-center min-w-[120px] ${COLORS[user.role]}`}>
      <div className="font-semibold text-sm text-slate-800">{user.name}</div>
      <div className={`text-xs font-medium capitalize mt-0.5 ${TEXT[user.role]}`}>{user.role}</div>
    </div>
  )
}