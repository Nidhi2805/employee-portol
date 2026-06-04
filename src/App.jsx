import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RequireAuth, RequireRole } from "./components/layout/ProtectedRoute";

// Auth
import Login from "./pages/Login";

// Employee
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import MyTasks           from "./pages/employee/MyTasks";
import MyLeave           from "./pages/employee/MyLeave";
import MyReports         from "./pages/employee/MyReports";

// Manager
import ManagerDashboard  from "./pages/manager/ManagerDashboard";
import TeamAttendance    from "./pages/manager/TeamAttendance";
import LeaveApprovals    from "./pages/manager/LeaveApprovals";
import ManagerReports    from "./pages/manager/ManagerReports";
import ManagerTasks      from "./pages/manager/ManagerTasks";

// Admin
import AdminDashboard    from "./pages/admin/AdminDashboard";
import AdminAttendance       from "./pages/admin/AdminAttendance";
import AdminAnnouncements    from "./pages/admin/AdminAnnouncements";
import LeaveBalanceManager   from "./pages/admin/LeaveBalanceManager";
import PasswordResetRequests from "./pages/admin/PasswordResetRequests";
import EmployeeManagementPage from "./pages/admin/EmployeeManagement";
import AuditLogPage          from "./pages/admin/AuditLog";

function RoleRedirect() {
  const { profile, loading } = useAuth();
  if (loading || !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
  const routes = {
    admin:    "/admin/dashboard",
    manager:  "/manager/dashboard",
    employee: "/employee/dashboard",
  };
  return <Navigate to={routes[profile.role] || "/login"} replace />;
}

function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
      <p className="text-gray-500">You don't have permission to view this page.</p>
      <a href="/" className="text-primary-600 hover:underline text-sm">Go back home</a>
    </div>
  );
}

function EmployeeRoutes() {
  return (
    <RequireAuth><RequireRole roles={["employee"]}>
      <Routes>
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="tasks"     element={<MyTasks />} />
        <Route path="leave"     element={<MyLeave />} />
        <Route path="reports"   element={<MyReports />} />
        <Route path="*"         element={<Navigate to="/employee/dashboard" replace />} />
      </Routes>
    </RequireRole></RequireAuth>
  );
}

function ManagerRoutes() {
  return (
    <RequireAuth><RequireRole roles={["manager"]}>
      <Routes>
        <Route path="dashboard"  element={<ManagerDashboard />} />
        <Route path="attendance" element={<TeamAttendance />} />
        <Route path="leaves"     element={<LeaveApprovals />} />
        <Route path="reports"    element={<ManagerReports />} />
        <Route path="tasks"      element={<ManagerTasks />} />
        <Route path="*"          element={<Navigate to="/manager/dashboard" replace />} />
      </Routes>
    </RequireRole></RequireAuth>
  );
}

function AdminRoutes() {
  return (
    <RequireAuth><RequireRole roles={["admin"]}>
      <Routes>
        <Route path="dashboard"   element={<AdminDashboard />} />
        <Route path="employees"   element={<EmployeeManagementPage />} />
        <Route path="attendance"  element={<AdminAttendance />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="leave-balances" element={<LeaveBalanceManager />} />
        <Route path="password-resets" element={<PasswordResetRequests />} />
        <Route path="audit"       element={<AuditLogPage />} />
        <Route path="*"           element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </RequireRole></RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: "14px", borderRadius: "10px" },
          }}
        />
        <Routes>
          <Route path="/login"        element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/"             element={<RequireAuth><RoleRedirect /></RequireAuth>} />
          <Route path="/employee/*"   element={<EmployeeRoutes />} />
          <Route path="/manager/*"    element={<ManagerRoutes />} />
          <Route path="/admin/*"      element={<AdminRoutes />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}