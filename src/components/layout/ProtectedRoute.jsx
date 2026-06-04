import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
}

function ProfileMissing() {
  const { profileError, refreshProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          {profileError ||
            "Your account is signed in but has no employee profile. Contact your administrator."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => refreshProfile()}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Retry
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <ProfileMissing />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!profile) return <ProfileMissing />;
  if (!roles.includes(profile.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
