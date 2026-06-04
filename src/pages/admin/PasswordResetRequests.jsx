import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/utils";
import { KeyRound, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function PasswordResetRequests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("password_reset_requests")
      .select("*, users(name, email)")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleResolve = async (req) => {
    setActing(req.id);
    const { error } = await supabase.auth.resetPasswordForEmail(
      req.users.email,
      { redirectTo: window.location.origin + "/login" }
    );
    if (error) {
      toast.error("Failed to send reset email");
    } else {
      await supabase
        .from("password_reset_requests")
        .update({ status: "resolved", resolved_by: profile.id })
        .eq("id", req.id);
      await supabase.from("audit_logs").insert({
        actor_id:    profile.id,
        action:      "password_reset",
        target_type: "user",
        target_id:   req.user_id,
        metadata:    { email: req.users.email },
      });
      toast.success(`Reset email sent to ${req.users.email}`);
      fetchRequests();
    }
    setActing(null);
  };

  const pending   = requests.filter((r) => r.status === "pending");
  const resolved  = requests.filter((r) => r.status === "resolved");

  return (
    <PageWrapper title="Password Reset Requests">
      <div className="flex flex-col gap-5">
        {/* Pending */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-gray-700">
              <KeyRound size={18} className="text-primary-600" />
              Pending Requests
            </div>
            {pending.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                {pending.length} pending
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : pending.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">No pending requests 🎉</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((req) => (
                <div key={req.id}
                  className="flex items-center justify-between gap-3 p-4 border border-orange-100 bg-orange-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={req.users?.name || ""} size="sm" />
                    <div>
                      <p className="font-medium text-gray-800">{req.users?.name}</p>
                      <p className="text-xs text-gray-500">{req.users?.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Requested {formatDate(req.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    loading={acting === req.id}
                    onClick={() => handleResolve(req)}
                  >
                    <Check size={13} />
                    Send Reset Email
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Resolved history */}
        {resolved.length > 0 && (
          <Card className="flex flex-col gap-4">
            <p className="font-semibold text-gray-700 text-sm">Resolved</p>
            <div className="flex flex-col gap-2">
              {resolved.map((req) => (
                <div key={req.id}
                  className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={req.users?.name || ""} size="sm" />
                    <div>
                      <p className="font-medium text-gray-800">{req.users?.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(req.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Resolved
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}