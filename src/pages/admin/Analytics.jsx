import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import { supabase } from "../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { Users, Clock, CalendarDays, TrendingUp, Building2 } from "lucide-react";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"];

export default function Analytics() {
  const [loading, setLoading]         = useState(true);
  const [deptFilter, setDeptFilter]   = useState("all");
  const [departments, setDepartments] = useState([]);
  const [stats, setStats]             = useState({
    totalEmployees: 0, activeToday: 0,
    pendingLeaves: 0, avgHours: 0,
  });
  const [deptHeadcount, setDeptHeadcount]   = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [leaveBreakdown, setLeaveBreakdown]   = useState([]);
  const [deptAttendance, setDeptAttendance]   = useState([]);
  const [statusDist, setStatusDist]           = useState([]);

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [
      { data: users },
      { data: attendance },
      { data: leaves },
      { data: depts },
    ] = await Promise.all([
      supabase.from("users").select("id, name, role, department, status, is_active")
        .neq("role", "admin"),
      supabase.from("attendance").select("*")
        .gte("date", thirtyDaysAgo).lte("date", today),
      supabase.from("leaves").select("*"),
      supabase.from("departments").select("name").order("name"),
    ]);

    const allUsers      = users      || [];
    const allAttendance = attendance || [];
    const allLeaves     = leaves     || [];
    const allDepts      = depts      || [];

    setDepartments(allDepts.map((d) => d.name));

    // Filter by dept if selected
    const filteredUsers = deptFilter === "all"
      ? allUsers
      : allUsers.filter((u) => u.department === deptFilter);
    const filteredIds = filteredUsers.map((u) => u.id);
    const filteredAtt = allAttendance.filter((a) => filteredIds.includes(a.user_id));
    const filteredLeaves = allLeaves.filter((l) => filteredIds.includes(l.user_id));

    // Top stats
    const todayAtt = filteredAtt.filter((a) => a.date === today && a.clock_in);
    const avgHrs = filteredAtt.filter((a) => a.total_hours)
      .reduce((sum, a, _, arr) => sum + a.total_hours / arr.length, 0);

    setStats({
      totalEmployees: filteredUsers.filter((u) => u.status !== "archived").length,
      activeToday:    todayAtt.length,
      pendingLeaves:  filteredLeaves.filter((l) => l.status === "pending").length,
      avgHours:       Math.round(avgHrs * 10) / 10,
    });

    // Department headcount
    const deptMap = {};
    filteredUsers.forEach((u) => {
      const d = u.department || "Unassigned";
      deptMap[d] = (deptMap[d] || 0) + 1;
    });
    setDeptHeadcount(Object.entries(deptMap).map(([name, count]) => ({ name, count })));

    // Attendance trend (last 14 days)
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86400000);
      return d.toISOString().split("T")[0];
    });
    setAttendanceTrend(last14.map((date) => {
      const dayAtt = filteredAtt.filter((a) => a.date === date);
      return {
        date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        present: dayAtt.filter((a) => a.status === "present").length,
        late:    dayAtt.filter((a) => a.status === "late").length,
        total:   dayAtt.length,
      };
    }));

    // Leave type breakdown
    const leaveTypes = {};
    filteredLeaves.filter((l) => l.status === "approved").forEach((l) => {
      leaveTypes[l.leave_type] = (leaveTypes[l.leave_type] || 0) + 1;
    });
    setLeaveBreakdown(Object.entries(leaveTypes).map(([name, value]) => ({ name, value })));

    // Dept-wise avg attendance %
    const deptAttMap = {};
    allDepts.forEach((d) => { deptAttMap[d.name] = { present: 0, total: 0 }; });
    filteredAtt.forEach((a) => {
      const user = allUsers.find((u) => u.id === a.user_id);
      const dept = user?.department || "Unassigned";
      if (!deptAttMap[dept]) deptAttMap[dept] = { present: 0, total: 0 };
      deptAttMap[dept].total++;
      if (a.clock_in) deptAttMap[dept].present++;
    });
    setDeptAttendance(
      Object.entries(deptAttMap)
        .filter(([, v]) => v.total > 0)
        .map(([dept, v]) => ({
          dept,
          rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
        }))
    );

    // Attendance status distribution
    const statuses = { present: 0, late: 0, half_day: 0, absent: 0 };
    filteredAtt.forEach((a) => {
      if (statuses[a.status] !== undefined) statuses[a.status]++;
    });
    setStatusDist(Object.entries(statuses).map(([name, value]) => ({ name, value })));

    setLoading(false);
  }, [deptFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statCards = [
    { label: "Total Employees", value: stats.totalEmployees, icon: Users,       color: "text-blue-600   bg-blue-50   border-blue-200"   },
    { label: "Present Today",   value: stats.activeToday,    icon: Clock,       color: "text-green-600  bg-green-50  border-green-200"  },
    { label: "Pending Leaves",  value: stats.pendingLeaves,  icon: CalendarDays,color: "text-orange-600 bg-orange-50 border-orange-200" },
    { label: "Avg Hours/Day",   value: `${stats.avgHours}h`, icon: TrendingUp,  color: "text-purple-600 bg-purple-50 border-purple-200" },
  ];

  return (
    <PageWrapper title="Analytics">

      {/* Department filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Building2 size={16} className="text-primary-600" />
          Department:
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", ...departments].map((d) => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize
                ${deptFilter === d
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {d === "all" ? "All Departments" : d}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`rounded-xl border p-4 flex items-center gap-4 ${color}`}>
                <div className="p-2.5 rounded-lg bg-white/60">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs font-medium opacity-75">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Attendance trend — 14 days */}
          <Card>
            <p className="font-semibold text-gray-700 mb-4">
              Attendance Trend — Last 14 Days
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="present" stroke="#3b82f6" fill="url(#presentGrad)" strokeWidth={2} name="Present" />
                <Area type="monotone" dataKey="late"    stroke="#f59e0b" fill="url(#lateGrad)"    strokeWidth={2} name="Late"    />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Row 2: dept headcount + leave breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Department headcount */}
            <Card>
              <p className="font-semibold text-gray-700 mb-4">Headcount by Department</p>
              {deptHeadcount.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No department data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptHeadcount} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    <Bar dataKey="count" name="Employees" radius={[0, 4, 4, 0]}>
                      {deptHeadcount.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Leave type breakdown */}
            <Card>
              <p className="font-semibold text-gray-700 mb-4">Approved Leave by Type</p>
              {leaveBreakdown.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No approved leaves yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={leaveBreakdown} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                      paddingAngle={3}>
                      {leaveBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

          </div>

          {/* Row 3: dept attendance rate + status distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Dept attendance rate */}
            <Card>
              <p className="font-semibold text-gray-700 mb-4">
                Attendance Rate by Department (30 days)
              </p>
              {deptAttendance.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No attendance data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="dept" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false}
                      axisLine={false} unit="%" />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Attendance Rate"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="rate" name="Rate %" radius={[4, 4, 0, 0]}>
                      {deptAttendance.map((entry, i) => (
                        <Cell key={i}
                          fill={entry.rate >= 80 ? "#10b981" : entry.rate >= 60 ? "#f59e0b" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Attendance status distribution */}
            <Card>
              <p className="font-semibold text-gray-700 mb-4">
                Attendance Status Distribution (30 days)
              </p>
              {statusDist.every((s) => s.value === 0) ? (
                <p className="text-gray-400 text-sm text-center py-8">No attendance data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                      paddingAngle={3}>
                      {statusDist.map((entry) => {
                        const c = {
                          present:  "#10b981",
                          late:     "#f59e0b",
                          half_day: "#3b82f6",
                          absent:   "#ef4444",
                        }[entry.name] || "#9ca3af";
                        return <Cell key={entry.name} fill={c} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

          </div>

        </div>
      )}
    </PageWrapper>
  );
}