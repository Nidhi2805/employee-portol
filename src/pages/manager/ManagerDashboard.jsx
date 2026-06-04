import PageWrapper from "../../components/layout/PageWrapper";
import LiveAttendanceBoard from "../../components/attendance/LiveAttendanceBoard";
import ReportInbox from "../../components/reports/ReportInbox";
import LeaveApprovalCard from "../../components/leave/LeaveApprovalCard";
import TeamTaskBoard from "../../components/tasks/TeamTaskBoard";
import { useAuth } from "../../context/AuthContext";

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

      {/* Top — attendance board full width */}
      <div className="mb-5">
        <LiveAttendanceBoard />
      </div>

      {/* Middle row — reports + leave */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ReportInbox />
        <LeaveApprovalCard />
      </div>

      {/* Bottom — full width task board */}
      <TeamTaskBoard />
    </PageWrapper>
  );
}