import PageWrapper from "../../components/layout/PageWrapper";
import AuditLogViewer from "../../components/admin/AuditLogViewer";

export default function AuditLogPage() {
  return (
    <PageWrapper title="Audit Log">
      <AuditLogViewer />
    </PageWrapper>
  );
}