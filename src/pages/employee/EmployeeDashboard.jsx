import PageWrapper from "../../components/layout/PageWrapper";
import ClockWidget from "../../components/attendance/ClockWidget";
import DailyReportForm from "../../components/reports/DailyReportForm";
import MyTasksWidget from "../../components/tasks/MyTasksWidget";
import LeaveSummaryWidget from "../../components/leave/LeaveSummaryWidget";
import WeeklyAttendanceStrip from "../../components/attendance/WeeklyAttendanceStrip";
import { useAuth } from "../../context/AuthContext";

export default function EmployeeDashboard() {
  const { profile } = useAuth();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    "Good evening";

  return (
    <PageWrapper title="My Dashboard">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {profile?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric",
            month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — attendance */}
        <div className="flex flex-col gap-5">
          <ClockWidget />
          <WeeklyAttendanceStrip />
          <LeaveSummaryWidget />
        </div>

        {/* Right columns — report + tasks */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <DailyReportForm />
          <MyTasksWidget />
        </div>

      </div>
    </PageWrapper>
  );
}