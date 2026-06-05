import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { roleBadgeColor } from "../../lib/utils";
import toast from "react-hot-toast";
import { submitPasswordResetRequest } from "../../lib/notify";
import {
  LayoutDashboard, ClipboardList, CalendarDays,
  CheckSquare, Bell, Users, FileText,
  LogOut, Briefcase, ShieldCheck, BarChart2,
  Megaphone, ScrollText, X, KeyRound,
} from "lucide-react";

const navByRole = {
  employee: [
    { to: "/employee/dashboard",  icon: LayoutDashboard, label: "Dashboard"    },
    { to: "/employee/tasks",      icon: CheckSquare,     label: "My Tasks"     },
    { to: "/employee/leave",      icon: CalendarDays,    label: "My Leave"     },
    { to: "/employee/reports",    icon: ClipboardList,   label: "My Reports"   },
  ],
  manager: [
    { to: "/manager/dashboard",   icon: LayoutDashboard, label: "Dashboard"    },
    { to: "/manager/attendance",  icon: Users,           label: "Attendance"   },
    { to: "/manager/leaves",      icon: CalendarDays,    label: "Leave Approvals" },
    { to: "/manager/reports",     icon: FileText,        label: "Reports Inbox"},
    { to: "/manager/tasks",       icon: CheckSquare,     label: "Task Board"   },
  ],
  admin: [
  { to: "/admin/dashboard",      icon: LayoutDashboard, label: "Dashboard"        },
  { to: "/admin/employees",      icon: Users,           label: "Employees"        },
  { to: "/admin/attendance",     icon: BarChart2,       label: "Attendance"       },
  { to: "/admin/leave-balances", icon: CalendarDays,    label: "Leave Balances"   },
  { to: "/admin/announcements",  icon: Megaphone,       label: "Announcements"    },
  { to: "/admin/password-resets",icon: KeyRound,        label: "Password Resets"  },
  { to: "/admin/audit",          icon: ScrollText,      label: "Audit Log"        },
],
};

export default function Sidebar({ open, onClose }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const roleKey = (profile?.role || "").toLowerCase();
  const navItems = navByRole[roleKey] || [];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  const handlePasswordResetRequest = async () => {
    if (!profile?.email) return;
    const result = await submitPasswordResetRequest(profile.email);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.alreadyPending) {
      toast.success("Your password reset request is already pending.");
    } else {
      toast.success("Password reset request sent to admin.");
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-primary-900 text-white z-30
        flex flex-col transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-primary-700">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/10 p-1.5 rounded-lg">
              <Briefcase size={20} />
            </div>
            <span className="font-bold text-base tracking-tight">EMP Portal</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* User profile strip */}
        <div className="px-4 py-4 border-b border-primary-700">
          <div className="flex items-center gap-3">
            <Avatar name={profile?.name || ""} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.name}</p>
              <Badge className={roleBadgeColor(profile?.role) + " mt-0.5"}>
                {profile?.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-primary-700 space-y-0.5">
          {(roleKey === "employee" || roleKey === "manager") && (
            <button
              onClick={handlePasswordResetRequest}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <KeyRound size={18} />
              Request Password Reset
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}