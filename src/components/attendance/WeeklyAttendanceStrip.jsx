import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import Card from "../ui/Card";
import { BarChart2 } from "lucide-react";

export default function WeeklyAttendanceStrip() {
  const { profile } = useAuth();
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!profile) return;
    const startOfWeek = getMonday();
    supabase
      .from("attendance")
      .select("date, clock_in, clock_out, total_hours, status")
      .eq("user_id", profile.id)
      .gte("date", startOfWeek)
      .order("date", { ascending: true })
      .then(({ data }) => setRecords(data || []));
  }, [profile]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const weekDates = getWeekDates();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <BarChart2 size={18} className="text-primary-600" />
        This Week
      </div>

      <div className="grid grid-cols-5 gap-2">
        {weekDates.map((date, i) => {
          const rec = records.find((r) => r.date === date);
          const isToday = date === new Date().toISOString().split("T")[0];

          return (
            <div
              key={date}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs
                ${isToday ? "border-primary-300 bg-primary-50" : "border-gray-100 bg-gray-50"}`}
            >
              <span className={`font-semibold ${isToday ? "text-primary-600" : "text-gray-500"}`}>
                {days[i]}
              </span>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold
                ${!rec                          ? "bg-gray-200 text-gray-400"
                : rec.status === "present"      ? "bg-green-100 text-green-700"
                : rec.status === "late"         ? "bg-orange-100 text-orange-700"
                : rec.status === "half_day"     ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-200 text-gray-400"}`}>
                {!rec ? "—" : rec.status === "present" ? "✓" : rec.status === "late" ? "L" : "H"}
              </div>
              <span className="text-gray-400 text-[10px]">
                {rec?.total_hours ? `${rec.total_hours}h` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function getMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getWeekDates() {
  const monday = new Date(getMonday());
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}