import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import ManagerDashboard from './pages/manager/ManagerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

function RoleRouter() {
  const { profile } = useAuth()
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'manager') return <Navigate to="/manager" replace />
  return <Navigate to="/employee" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />
          <Route path="/employee/*" element={
            <ProtectedRoute allowedRoles={['employee','manager','admin']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/manager/*" element={
            <ProtectedRoute allowedRoles={['manager','admin']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}