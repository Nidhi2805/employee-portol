import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { CalendarDays, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function LeaveApprovalCard() {
  const { profile } = useAuth();
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null);

  const fetchLeaves = useCallback(async () => {
  if (!profile) return;
  setLoading(true);

  const { data: teamData } = await supabase
    .from("users")
    .select("id")
    .eq("manager_id", profile.id)
    .eq("is_active", true);

  if (!teamData || teamData.length === 0) {
    setLeaves([]);
    setLoading(false);
    return;
  }

  const teamIds = teamData.map((u) => u.id);
  const quotedTeamIds = teamIds.map((id) => `"${id}"`).join(",");

  let leaveQuery = supabase
    .from("leaves")
    .select("*, users(name, email)")
    .eq("status", "pending");

  if (teamIds.length > 0) {
    leaveQuery = leaveQuery.or(
      `manager_id.eq.${profile.id},user_id.in.(${quotedTeamIds})`
    );
  } else {
    leaveQuery = leaveQuery.eq("manager_id", profile.id);
  }

  const { data } = await leaveQuery.order("created_at", { ascending: true });

  setLeaves(data || []);
  setLoading(false);
}, [profile]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleAction = async (leave, action) => {
    setActing(leave.id);
    const { error } = await supabase
      .from("leaves")
      .update({
        status:      action,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", leave.id);

    if (error) {
      toast.error("Action failed");
    } else {
      toast.success(`Leave ${action}`);

      // Update leave balance if approved
      if (action === "approved") {
        const days = Math.ceil(
          (new Date(leave.end_date) - new Date(leave.start_date)) / 86400000
        ) + 1;
        const field = `${leave.leave_type}_used`;
        const { data: bal } = await supabase
          .from("leave_balances")
          .select("*")
          .eq("user_id", leave.user_id)
          .maybeSingle();
        if (bal) {
          await supabase
            .from("leave_balances")
            .update({ [field]: (bal[field] || 0) + days })
            .eq("user_id", leave.user_id);
        }
      }

      // Notify employee
      await supabase.from("notifications").insert({
        user_id: leave.user_id,
        type:    "leave_update",
        message: `Your leave request (${formatDate(leave.start_date)} – ${formatDate(leave.end_date)}) was ${action}.`,
      });

      fetchLeaves();
    }
    setActing(null);
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <CalendarDays size={18} className="text-primary-600" />
          Leave Approvals
        </div>
        {leaves.length > 0 && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
            {leaves.length} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : leaves.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">
          No pending leave requests 🎉
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {leaves.map((leave) => (
            <div
              key={leave.id}
              className="border border-gray-100 rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {leave.users?.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                    &nbsp;·&nbsp;
                    <span className="capitalize">{leave.leave_type}</span>
                  </p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  Pending
                </span>
              </div>

              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {leave.reason}
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="success"
                  loading={acting === leave.id}
                  onClick={() => handleAction(leave, "approved")}
                  className="flex-1"
                >
                  <Check size={13} />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={acting === leave.id}
                  onClick={() => handleAction(leave, "rejected")}
                  className="flex-1"
                >
                  <X size={13} />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}