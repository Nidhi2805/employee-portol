import PageWrapper from "../../components/layout/PageWrapper";
import DepartmentManager from "../../components/admin/DepartmentManager";

export default function DepartmentsPage() {
  return (
    <PageWrapper title="Departments">
      <DepartmentManager />
    </PageWrapper>
  );
}