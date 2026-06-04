import { useState } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import AdminStatsBar from "../../components/admin/AdminStatsBar";
import EmployeeManagementPage from "./EmployeeManagement";
import AdminAttendance from "./AdminAttendance";
import AdminAnnouncements from "./AdminAnnouncements";
import AuditLogPage from "./AuditLog";
import { useAuth } from "../../context/AuthContext";
import { Users, BarChart2, Megaphone, ScrollText } from "lucide-react";

const TABS = [
  { key: "employees",    label: "Employees",    icon: Users       },
  { key: "attendance",   label: "Attendance",   icon: BarChart2   },
  { key: "announce",     label: "Announcements",icon: Megaphone   },
  { key: "audit",        label: "Audit Log",    icon: ScrollText  },
];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("employees");

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    "Good evening";

  return (
    <PageWrapper title="Admin Dashboard">
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

      <div className="mb-6">
        <AdminStatsBar />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0
              ${tab === key
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "employees"  && <EmployeeManagementPage />}
      {tab === "attendance" && <AdminAttendance />}
      {tab === "announce"   && <AdminAnnouncements />}
      {tab === "audit"      && <AuditLogPage />}
    </PageWrapper>
  );
}
