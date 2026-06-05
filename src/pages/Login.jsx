import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { submitPasswordResetRequest } from "../lib/notify";
import { LogIn, Eye, EyeOff, Briefcase, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || "Login failed");
      setLoading(false);
      return;
    }

    navigate("/");
  };

  const openResetModal = () => {
    setResetEmail(email);
    setShowReset(true);
  };

  const handlePasswordResetRequest = async () => {
    if (!resetEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setResetting(true);
    const result = await submitPasswordResetRequest(resetEmail);

    if (result.error) {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin + "/login",
      });
      setResetting(false);
      if (error) {
        toast.error(result.error);
        return;
      }
      toast.success("If this email is registered, a reset link has been sent.");
    } else if (result.alreadyPending) {
      toast.success("A reset request is already pending. Admin will process it soon.");
    } else {
      toast.success("Password reset request submitted. An admin will send you a reset link.");
    }
    setResetting(false);
    setShowReset(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-600 text-white p-3 rounded-xl mb-3">
            <Briefcase size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              className="text-sm text-primary-600 hover:underline"
              onClick={openResetModal}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Don't have an account? Contact your administrator.
        </p>
      </div>

      <Modal
        open={showReset}
        onClose={() => setShowReset(false)}
        title="Request Password Reset"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Enter your work email. An admin will review your request and send a password reset link.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="you@company.com"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setShowReset(false)}>
              Cancel
            </Button>
            <Button loading={resetting} onClick={handlePasswordResetRequest}>
              <KeyRound size={14} />
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
