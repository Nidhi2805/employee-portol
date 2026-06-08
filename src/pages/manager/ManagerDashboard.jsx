import PageWrapper from "../../components/layout/PageWrapper";
import LiveAttendanceBoard from "../../components/attendance/LiveAttendanceBoard";
import ReportInbox from "../../components/reports/ReportInbox";
import LeaveApprovalCard from "../../components/leave/LeaveApprovalCard";
import TeamTaskBoard from "../../components/tasks/TeamTaskBoard";
import ClockWidget from "../../components/attendance/ClockWidget";
import WeeklyAttendanceStrip from "../../components/attendance/WeeklyAttendanceStrip";
import LeaveSummaryWidget from "../../components/leave/LeaveSummaryWidget";
import DailyReportForm from "../../components/reports/DailyReportForm";
import { useAuth } from "../../context/AuthContext";
import { User, Users } from "lucide-react";

export default function ManagerDashboard() {
  const { profile } = useAuth();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    "Good evening";

  return (
    <PageWrapper title="Manager Dashboard">

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

      {/* ─── SECTION 1: MY ATTENDANCE (manager as employee) ─── */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg">
          <User size={14} className="text-primary-600" />
          <span className="text-sm font-semibold text-primary-700">My Attendance</span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Left col */}
        <div className="flex flex-col gap-5">
          <ClockWidget />
          <WeeklyAttendanceStrip />
          <LeaveSummaryWidget />
        </div>
        {/* Right col */}
        <div className="lg:col-span-2">
          <DailyReportForm />
        </div>
      </div>

      {/* ─── SECTION 2: MY TEAM ─── */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <Users size={14} className="text-green-600" />
          <span className="text-sm font-semibold text-green-700">My Team</span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="flex flex-col gap-5">
        <LiveAttendanceBoard />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ReportInbox />
          <LeaveApprovalCard />
        </div>

        <TeamTaskBoard />
      </div>

    </PageWrapper>
  );
}