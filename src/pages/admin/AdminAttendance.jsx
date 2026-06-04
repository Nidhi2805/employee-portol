import PageWrapper from "../../components/layout/PageWrapper";
import AttendanceOverview from "../../components/admin/AttendanceOverview";

export default function AdminAttendance() {
  return (
    <PageWrapper title="Attendance Overview">
      <AttendanceOverview />
    </PageWrapper>
  );
}