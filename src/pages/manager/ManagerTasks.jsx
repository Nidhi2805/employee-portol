import PageWrapper from "../../components/layout/PageWrapper";
import TeamTaskBoard from "../../components/tasks/TeamTaskBoard";

export default function ManagerTasks() {
  return (
    <PageWrapper title="Task Board">
      <TeamTaskBoard />
    </PageWrapper>
  );
}