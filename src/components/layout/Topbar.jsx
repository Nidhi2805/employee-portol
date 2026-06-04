import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../notifications/NotificationBell";
import Avatar from "../ui/Avatar";

export default function Topbar({ onMenuClick, title }) {
  const { profile } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <Menu size={20} />
        </button>
        <h2 className="font-semibold text-gray-800 text-base">{title}</h2>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <Avatar name={profile?.name || ""} size="sm" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{profile?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}