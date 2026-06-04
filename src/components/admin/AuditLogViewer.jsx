import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import Card from "../ui/Card";
import { ScrollText, Search } from "lucide-react";

const ACTION_LABELS = {
  create_employee:    { label: "Created employee",  color: "bg-green-100 text-green-700"  },
  update_employee:    { label: "Updated employee",  color: "bg-blue-100 text-blue-700"    },
  deactivate_employee:{ label: "Deactivated",       color: "bg-red-100 text-red-700"      },
  reactivate_employee:{ label: "Reactivated",       color: "bg-green-100 text-green-700"  },
  password_reset:     { label: "Password reset",    color: "bg-orange-100 text-orange-700"},
  leave_update:       { label: "Leave action",      color: "bg-purple-100 text-purple-700"},
};

export default function AuditLogViewer() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*, actor:actor_id(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter((l) =>
    l.actor?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <ScrollText size={18} className="text-primary-600" />
        Audit Log
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by actor or action..."
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-96 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">No logs found</p>
          ) : (
            filtered.map((log) => {
              const meta = ACTION_LABELS[log.action] || {
                label: log.action,
                color: "bg-gray-100 text-gray-600",
              };
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                >
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${meta.color}`}>
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{log.actor?.name || "System"}</span>
                      {log.metadata?.name && ` → ${log.metadata.name}`}
                      {log.metadata?.email && ` (${log.metadata.email})`}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.created_at).toLocaleString("en-IN", {
                      day: "2-digit", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}