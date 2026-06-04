import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Shows a spinner while auth loads
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
}

// Requires login
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Requires specific role(s)
export function RequireRole({ roles, children }) {
  const { profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!profile) return <Spinner />;
  if (!roles.includes(profile.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}