import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { fetchTeamMembers } from "../../lib/team";
import { useAuth } from "../../context/AuthContext";
import { useRealtime } from "../../hooks/useRealtime";
import { formatTime } from "../../lib/utils";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import { Users, Wifi } from "lucide-react";

export default function LiveAttendanceBoard() {
  const { profile } = useAuth();
  const [team, setTeam]       = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  // Step 1: load team members
  const fetchTeam = useCallback(async () => {
    if (!profile) return;
    const { team, error } = await fetchTeamMembers(profile.id);
    if (!error) setTeam(team);
  }, [profile]);

  // Step 2: load today's attendance for team
  const fetchAttendance = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today)
      .in(
        "user_id",
        team.length > 0 ? team.map((m) => m.id) : ["00000000-0000-0000-0000-000000000000"]
      );
    if (data) setRecords(data);
    setLoading(false);
  }, [profile, team, today]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => { if (team.length > 0) fetchAttendance(); }, [fetchAttendance, team]);

  // Live updates — patch records array in place
  useRealtime("attendance", (payload) => {
    const row = payload.new;
    if (!row) return;
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [...prev, row];
    });
  });

  const getRecord = (userId) =>
    records.find((r) => r.user_id === userId);

  const stats = {
    present:  records.filter((r) => r.clock_in && !r.clock_out).length,
    done:     records.filter((r) => r.clock_out).length,
    absent:   team.length - records.length,
    late:     records.filter((r) => r.status === "late").length,
  };

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Users size={18} className="text-primary-600" />
          Live Attendance Board
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <Wifi size={12} className="animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Clocked In", value: stats.present, color: "text-green-600 bg-green-50"  },
          { label: "Done",       value: stats.done,    color: "text-blue-600 bg-blue-50"    },
          { label: "Absent",     value: stats.absent,  color: "text-red-600 bg-red-50"      },
          { label: "Late",       value: stats.late,    color: "text-orange-600 bg-orange-50"},
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-lg p-2 text-center ${color}`}>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[10px] font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Team cards */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : team.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">
          No team members assigned yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {team.map((member) => {
            const rec = getRecord(member.id);
            const status =
              !rec                ? "absent"
              : rec.clock_out     ? "done"
              : rec.break_start && !rec.break_end ? "break"
              : "clocked_in";

            const statusStyle = {
              clocked_in: "border-green-200 bg-green-50",
              done:       "border-blue-200 bg-blue-50",
              break:      "border-yellow-200 bg-yellow-50",
              absent:     "border-gray-200 bg-gray-50",
            }[status];

            const dot = {
              clocked_in: "bg-green-500 animate-pulse",
              done:       "bg-blue-400",
              break:      "bg-yellow-400",
              absent:     "bg-gray-300",
            }[status];

            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${statusStyle}`}
              >
                <Avatar name={member.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {member.position || member.department || "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="text-[10px] font-medium text-gray-600 capitalize">
                      {status === "clocked_in" ? "Active"
                       : status === "done"     ? "Done"
                       : status === "break"    ? "Break"
                       : "Absent"}
                    </span>
                  </div>
                  {rec?.clock_in && (
                    <span className="text-[10px] text-gray-400">
                      In {formatTime(rec.clock_in)}
                      {rec.clock_out && ` · Out ${formatTime(rec.clock_out)}`}
                    </span>
                  )}
                  {rec?.total_hours && (
                    <span className="text-[10px] font-semibold text-blue-600">
                      {rec.total_hours}h
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}