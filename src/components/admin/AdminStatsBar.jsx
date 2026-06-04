import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Users, ClipboardList, CalendarDays, CheckSquare } from "lucide-react";
import { today } from "../../lib/utils";

export default function AdminStatsBar() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayPresent:   0,
    pendingLeaves:  0,
    openTasks:      0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: totalEmployees },
        { count: todayPresent   },
        { count: pendingLeaves  },
        { count: openTasks      },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true })
          .eq("is_active", true).neq("role", "admin"),
        supabase.from("attendance").select("*", { count: "exact", head: true })
          .eq("date", today()).not("clock_in", "is", null),
        supabase.from("leaves").select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("tasks").select("*", { count: "exact", head: true })
          .neq("status", "done"),
      ]);
      setStats({
        totalEmployees: totalEmployees || 0,
        todayPresent:   todayPresent   || 0,
        pendingLeaves:  pendingLeaves  || 0,
        openTasks:      openTasks      || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon:  Users,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconBg: "bg-blue-100",
    },
    {
      label: "Present Today",
      value: stats.todayPresent,
      icon:  ClipboardList,
      color: "bg-green-50 text-green-600 border-green-200",
      iconBg: "bg-green-100",
    },
    {
      label: "Pending Leaves",
      value: stats.pendingLeaves,
      icon:  CalendarDays,
      color: "bg-orange-50 text-orange-600 border-orange-200",
      iconBg: "bg-orange-100",
    },
    {
      label: "Open Tasks",
      value: stats.openTasks,
      icon:  CheckSquare,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      iconBg: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, iconBg }) => (
        <div
          key={label}
          className={`rounded-xl border p-4 flex items-center gap-4 ${color}`}
        >
          <div className={`p-3 rounded-lg ${iconBg}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-80">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}