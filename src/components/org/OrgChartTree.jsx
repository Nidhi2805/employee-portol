import { Tree, TreeNode } from 'react-organizational-chart'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function EmployeeNode({ user }) {
  return (
    <div className="inline-block bg-white border-2 border-indigo-200 rounded-xl px-4 py-2 text-center min-w-[120px] hover:border-indigo-400 transition-colors cursor-pointer">
      <div className="font-semibold text-sm text-slate-800">{user.name}</div>
      <div className={`text-xs mt-0.5 font-medium ${
        user.role === 'admin' ? 'text-purple-600' :
        user.role === 'manager' ? 'text-indigo-600' : 'text-slate-400'
      }`}>{user.role}</div>
    </div>
  )
}

export default function OrgChartTree() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    supabase.from('users').select('*').then(({ data }) => setUsers(data || []))
  }, [])

  const admins = users.filter(u => u.role === 'admin')
  const managers = users.filter(u => u.role === 'manager')
  const employees = users.filter(u => u.role === 'employee')

  if (!admins.length) return null

  return (
    <div className="overflow-x-auto py-4">
      <Tree
        lineWidth="2px"
        lineColor="#c7d2fe"
        lineBorderRadius="8px"
        label={<EmployeeNode user={admins[0]} />}
      >
        {managers.map(mgr => (
          <TreeNode key={mgr.id} label={<EmployeeNode user={mgr} />}>
            {employees
              .filter(emp => emp.manager_id === mgr.id)
              .map(emp => (
                <TreeNode key={emp.id} label={<EmployeeNode user={emp} />} />
              ))
            }
          </TreeNode>
        ))}
      </Tree>
    </div>
  )
}