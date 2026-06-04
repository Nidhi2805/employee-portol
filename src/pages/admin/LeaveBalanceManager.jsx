import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import { supabase } from "../../lib/supabase";
import { CalendarDays, Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function LeaveBalanceManager() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    casual_total: 12, casual_used: 0,
    sick_total: 8,    sick_used: 0,
    earned_total: 15, earned_used: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id, name, email, department, leave_balances(*)")
      .eq("is_active", true)
      .neq("role", "admin")
      .order("name");
    setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (emp) => {
    setEditTarget(emp);
    const bal = emp.leave_balances?.[0];
    setForm({
      casual_total: bal?.casual_total ?? 12,
      casual_used:  bal?.casual_used  ?? 0,
      sick_total:   bal?.sick_total   ?? 8,
      sick_used:    bal?.sick_used    ?? 0,
      earned_total: bal?.earned_total ?? 15,
      earned_used:  bal?.earned_used  ?? 0,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const bal = editTarget.leave_balances?.[0];

    if (bal) {
      const { error } = await supabase
        .from("leave_balances")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("user_id", editTarget.id);
      if (error) toast.error("Update failed");
      else { toast.success("Balance updated"); setEditTarget(null); fetchData(); }
    } else {
      const { error } = await supabase
        .from("leave_balances")
        .insert({ ...form, user_id: editTarget.id });
      if (error) toast.error("Create failed");
      else { toast.success("Balance created"); setEditTarget(null); fetchData(); }
    }
    setSaving(false);
  };

  const leaveTypes = [
    { key: "casual", label: "Casual",  color: "bg-blue-500"  },
    { key: "sick",   label: "Sick",    color: "bg-red-400"   },
    { key: "earned", label: "Earned",  color: "bg-green-500" },
  ];

  return (
    <PageWrapper title="Leave Balances">
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <CalendarDays size={18} className="text-primary-600" />
          Employee Leave Balances
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-center">Casual</th>
                  <th className="px-4 py-3 text-center">Sick</th>
                  <th className="px-4 py-3 text-center">Earned</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => {
                  const bal = emp.leave_balances?.[0];
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.name} size="sm" />
                          <div>
                            <p className="font-medium text-gray-800">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.department || emp.email}</p>
                          </div>
                        </div>
                      </td>
                      {leaveTypes.map(({ key, color }) => {
                        const used  = bal?.[`${key}_used`]  ?? 0;
                        const total = bal?.[`${key}_total`] ?? 0;
                        const remaining = total - used;
                        const pct = total > 0 ? (used / total) * 100 : 0;
                        return (
                          <td key={key} className="px-4 py-3">
                            {!bal ? (
                              <span className="text-xs text-gray-400">Not set</span>
                            ) : (
                              <div className="flex flex-col items-center gap-1 min-w-20">
                                <span className="text-xs font-semibold text-gray-700">
                                  {remaining}/{total}
                                </span>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${color} rounded-full`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-400">{used} used</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Leave Balance — ${editTarget?.name}`}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {leaveTypes.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-700">{label} Leave</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Total Days</label>
                  <input
                    type="number" min="0"
                    value={form[`${key}_total`]}
                    onChange={(e) => setForm({
                      ...form, [`${key}_total`]: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Used Days</label>
                  <input
                    type="number" min="0"
                    value={form[`${key}_used`]}
                    onChange={(e) => setForm({
                      ...form, [`${key}_used`]: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              <X size={14} /> Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              <Check size={14} /> Save Balance
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}