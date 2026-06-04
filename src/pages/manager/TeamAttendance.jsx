import PageWrapper from "../../components/layout/PageWrapper";
import LiveAttendanceBoard from "../../components/attendance/LiveAttendanceBoard";
import AttendanceOverview from "../../components/admin/AttendanceOverview";

export default function TeamAttendance() {
  return (
    <PageWrapper title="Team Attendance">
      <div className="flex flex-col gap-5">
        <LiveAttendanceBoard />
        <AttendanceOverview />
      </div>
    </PageWrapper>
  );
}