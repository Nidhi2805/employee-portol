import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import Card from "../ui/Card";
import { CalendarDays } from "lucide-react";

export default function LeaveSummaryWidget() {
  const { profile } = useAuth();
  const [balance, setBalance]   = useState(null);
  const [pending, setPending]   = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: bal }, { count }] = await Promise.all([
      supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle(),
      supabase
        .from("leaves")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", "pending"),
    ]);
    setBalance(bal);
    setPending(count || 0);
    setLoading(false);
  };

  const leaveTypes = balance
    ? [
        { label: "Casual",  total: balance.casual_total,  used: balance.casual_used,  color: "bg-blue-500"  },
        { label: "Sick",    total: balance.sick_total,    used: balance.sick_used,    color: "bg-red-500"   },
        { label: "Earned",  total: balance.earned_total,  used: balance.earned_used,  color: "bg-green-500" },
      ]
    : [];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <CalendarDays size={18} className="text-primary-600" />
          Leave Balance
        </div>
        {pending > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
            {pending} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : !balance ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Leave balance not set yet — contact your admin.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {leaveTypes.map(({ label, total, used, color }) => {
            const remaining = total - used;
            const pct = total > 0 ? (used / total) * 100 : 0;
            return (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{label}</span>
                  <span>{remaining} / {total} remaining</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <a
        href="/employee/leave"
        className="text-xs text-primary-600 hover:underline self-end"
      >
        Apply for leave →
      </a>
    </Card>
  );
}