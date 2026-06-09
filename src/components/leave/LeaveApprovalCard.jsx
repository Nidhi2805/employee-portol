import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { fetchTeamMembers } from "../../lib/team";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { CalendarDays, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function LeaveApprovalCard() {
  const { profile } = useAuth();
  const [leaves, setLeaves]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState(null);
  const [teamCount, setTeamCount] = useState(0);
  const [hint, setHint]           = useState(null);

  const fetchLeaves = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setHint(null);

    const { team, error: teamError } = await fetchTeamMembers(profile.id);
    setTeamCount(team.length);

    if (teamError) {
      setLeaves([]);
      setHint(`Could not load team: ${teamError.message}`);
      setLoading(false);
      return;
    }

    if (team.length === 0) {
      setLeaves([]);
      setHint(
        "No employees are assigned to you. In Supabase (or Admin → Employees), set each employee's Reports To / manager_id to your account."
      );
      setLoading(false);
      return;
    }

    const teamById = Object.fromEntries(team.map((u) => [u.id, u]));
    const teamIds = team.map((u) => u.id);

    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .eq("status", "pending")
      .in("user_id", teamIds)
      .order("created_at", { ascending: true });

    if (error) {
      setLeaves([]);
      setHint(
        `Could not load leave requests: ${error.message}. If using Row Level Security, run supabase/manager-team-policies.sql in the Supabase SQL editor.`
      );
      setLoading(false);
      return;
    }

    setLeaves(
      (data || []).map((leave) => ({
        ...leave,
        users: teamById[leave.user_id],
      }))
    );
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleAction = async (leave, action) => {
    setActing(leave.id);
    const { data: updatedLeave, error } = await supabase
      .from("leaves")
      .update({ status: action })
      .eq("id", leave.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      toast.error("Action failed: " + error.message);
    } else if (!updatedLeave) {
      toast.error("This request was already processed or you do not have permission.");
    } else {
      toast.success(`Leave ${action}`);

      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: leave.user_id,
        type:    "leave_update",
        message: `Your leave request (${formatDate(leave.start_date)} – ${formatDate(leave.end_date)}) was ${action}.`,
      });
      if (notificationError) {
        toast.error("Leave updated, but the employee notification could not be sent.");
      }

      fetchLeaves();
    }
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

      {teamCount > 0 && (
        <p className="text-xs text-gray-400">{teamCount} team member{teamCount !== 1 ? "s" : ""}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : hint ? (
        <p className="text-center text-amber-700 text-sm py-4 px-2 bg-amber-50 rounded-lg">
          {hint}
        </p>
      ) : leaves.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">
          No pending leave requests. Ask an employee to apply from My Leave.
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
                    {leave.users?.name || "Employee"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                    {leave.leave_type && (
                      <>
                        &nbsp;·&nbsp;
                        <span className="capitalize">{leave.leave_type}</span>
                      </>
                    )}
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
