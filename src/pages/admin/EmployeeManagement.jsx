import PageWrapper from "../../components/layout/PageWrapper";
import EmployeeManagementComponent from "../../components/admin/EmployeeManagement";

export default function EmployeeManagementPage() {
  return (
    <PageWrapper title="Employee Management">
      <EmployeeManagementComponent />
    </PageWrapper>
  );
}