import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatTime } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { AlertCircle, BarChart2, Download, Search } from "lucide-react";

function localDateOffset(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendanceOverview() {
  const { profile } = useAuth();
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [dateFrom, setDateFrom] = useState(() => localDateOffset(-7));
  const [dateTo, setDateTo]     = useState(() => localDateOffset());
  const [search, setSearch]     = useState("");

  const fetchRecords = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError("");

    let query = supabase
      .from("attendance")
      .select("*")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false })
      .order("clock_in", { ascending: false });

    let userQuery = supabase
      .from("users")
      .select("id, name, email, department");

    if (profile.role === "manager") {
      userQuery = userQuery
        .eq("manager_id", profile.id)
        .eq("is_active", true);
    }

    const { data: users, error: usersError } = await userQuery;
    if (usersError) {
      setRecords([]);
      setError(`Could not load employees: ${usersError.message}`);
      setLoading(false);
      return;
    }

    const userIds = (users || []).map((user) => user.id);
    const usersById = Object.fromEntries((users || []).map((user) => [user.id, user]));

    if (profile.role === "manager") {
      if (userIds.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }
      query = query.in("user_id", userIds);
    }

    const { data, error: attendanceError } = await query;
    if (attendanceError) {
      setRecords([]);
      setError(
        `Could not load attendance: ${attendanceError.message}. Apply the Supabase portal workflow migration if Row Level Security is enabled.`
      );
      setLoading(false);
      return;
    }

    setRecords((data || []).map((record) => ({
      ...record,
      users: usersById[record.user_id] || null,
    })));
    setLoading(false);
  }, [dateFrom, dateTo, profile]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records.filter((r) =>
    r.users?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.users?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ["Name", "Email", "Date", "Clock In", "Clock Out", "Hours", "Status"];
    const rows = filtered.map((r) => [
      r.users?.name,
      r.users?.email,
      r.date,
      r.clock_in  ? new Date(r.clock_in).toLocaleTimeString()  : "—",
      r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : "—",
      r.total_hours ?? "—",
      r.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `attendance_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <BarChart2 size={18} className="text-primary-600" />
          Attendance Overview
        </div>
        <Button size="sm" variant="secondary" onClick={exportCSV}>
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Clock In</th>
                <th className="px-4 py-3 text-left">Clock Out</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No records found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.users?.name}</p>
                      <p className="text-xs text-gray-400">{r.users?.department || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(r.clock_in)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(r.clock_out)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {r.total_hours ? `${r.total_hours}h` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                        ${r.status === "present"  ? "bg-green-100 text-green-700"
                        : r.status === "late"     ? "bg-orange-100 text-orange-700"
                        : r.status === "half_day" ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}