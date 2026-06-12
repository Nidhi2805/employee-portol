import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatDate, roleBadgeColor } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import Modal from "../ui/Modal";
import {
  Users, Plus, Pencil, Trash2, Archive,
  ArchiveRestore, Search, KeyRound, Check, X,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "", email: "", password: "",
  role: "employee", department: "",
  position: "", phone: "", manager_id: "",
};

export default function EmployeeManagement() {
  const { profile } = useAuth();
  const [employees, setEmployees]   = useState([]);
  const [managers, setManagers]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const [confirmModal, setConfirmModal] = useState(null); // { type: 'archive'|'delete'|'restore', emp }
  const [acting, setActing]         = useState(false);

  const [resetModal, setResetModal] = useState(null);
  const [resetting, setResetting]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: empData }, { data: deptData }] = await Promise.all([
      supabase.from("users")
        .select("*, manager:manager_id(name)")
        .order("created_at", { ascending: false }),
      supabase.from("departments").select("*").order("name"),
    ]);
    if (empData) {
      setEmployees(empData);
      setManagers(empData.filter((u) => ["manager", "admin"].includes(u.role)));
    }
    setDepartments(deptData || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (emp) => {
    setEditTarget(emp);
    setForm({
      name:       emp.name,
      email:      emp.email,
      password:   "",
      role:       emp.role,
      department: emp.department || "",
      position:   emp.position  || "",
      phone:      emp.phone     || "",
      manager_id: emp.manager_id || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);

    if (editTarget) {
      const { error } = await supabase.from("users").update({
        name:       form.name,
        role:       form.role,
        department: form.department || null,
        position:   form.position  || null,
        phone:      form.phone     || null,
        manager_id: form.manager_id || null,
      }).eq("id", editTarget.id);

      if (error) toast.error("Update failed: " + error.message);
      else {
        await supabase.from("audit_logs").insert({
          actor_id: profile.id, action: "update_employee",
          target_type: "user", target_id: editTarget.id,
          metadata: { name: form.name, role: form.role },
        });
        toast.success("Employee updated");
        setShowForm(false);
        fetchData();
      }
    } else {
      if (!form.password || form.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setSaving(false);
        return;
      }
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { name: form.name, role: form.role } },
      });
      if (signUpError) {
        toast.error("Failed: " + signUpError.message);
        setSaving(false);
        return;
      }
      if (signUpData?.user) {
        await supabase.from("users").update({
          role:       form.role,
          department: form.department || null,
          position:   form.position  || null,
          phone:      form.phone     || null,
          manager_id: form.manager_id || null,
          status:     "active",
          is_active:  true,
        }).eq("id", signUpData.user.id);

        await supabase.from("leave_balances").insert({ user_id: signUpData.user.id });
      }
      await supabase.from("audit_logs").insert({
        actor_id: profile.id, action: "create_employee",
        target_type: "user",
        metadata: { email: form.email, role: form.role },
      });
      toast.success("Employee created!");
      setShowForm(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { type, emp } = confirmModal;
    setActing(true);

    if (type === "archive") {
      await supabase.from("users")
        .update({ status: "archived", is_active: false })
        .eq("id", emp.id);
      await supabase.from("audit_logs").insert({
        actor_id: profile.id, action: "archive_employee",
        target_type: "user", target_id: emp.id,
        metadata: { name: emp.name },
      });
      toast.success(`${emp.name} archived`);
    }

    if (type === "restore") {
      await supabase.from("users")
        .update({ status: "active", is_active: true })
        .eq("id", emp.id);
      await supabase.from("audit_logs").insert({
        actor_id: profile.id, action: "restore_employee",
        target_type: "user", target_id: emp.id,
        metadata: { name: emp.name },
      });
      toast.success(`${emp.name} restored`);
    }

    if (type === "delete") {
      // Soft-delete: anonymise and mark deleted
      const { error } = await supabase.from("users").update({
        status:    "archived",
        is_active: false,
        name:      "[Deleted User]",
        phone:     null,
        position:  null,
      }).eq("id", emp.id);
      if (error) toast.error("Delete failed");
      else {
        await supabase.from("audit_logs").insert({
          actor_id: profile.id, action: "delete_employee",
          target_type: "user", target_id: emp.id,
          metadata: { name: emp.name, email: emp.email },
        });
        toast.success(`${emp.name} permanently deleted`);
      }
    }

    setActing(false);
    setConfirmModal(null);
    fetchData();
  };

  const handlePasswordReset = async () => {
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetModal.email,
      { redirectTo: window.location.origin + "/login" }
    );
    if (error) toast.error("Reset failed");
    else {
      toast.success(`Reset email sent to ${resetModal.email}`);
      await supabase.from("audit_logs").insert({
        actor_id: profile.id, action: "password_reset",
        target_type: "user", target_id: resetModal.id,
        metadata: { email: resetModal.email },
      });
      setResetModal(null);
    }
    setResetting(false);
  };

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "all" || e.role === roleFilter;
    const matchDept   = deptFilter === "all" || e.department === deptFilter;
    const matchStatus = statusFilter === "all" || (e.status || "active") === statusFilter;
    return matchSearch && matchRole && matchDept && matchStatus;
  });

  const statusCounts = {
    active:   employees.filter((e) => (e.status || "active") === "active").length,
    archived: employees.filter((e) => e.status === "archived").length,
  };

  const confirmConfig = {
    archive: {
      title: "Archive Employee",
      body:  (emp) => `Archive ${emp?.name}? They won't be able to log in but their data is preserved.`,
      confirmLabel: "Archive",
      variant: "secondary",
    },
    restore: {
      title: "Restore Employee",
      body:  (emp) => `Restore ${emp?.name}? They will be able to log in again.`,
      confirmLabel: "Restore",
      variant: "success",
    },
    delete: {
      title: "Permanently Delete",
      body:  (emp) => `Delete ${emp?.name}? Their name will be anonymised. This cannot be undone.`,
      confirmLabel: "Delete Permanently",
      variant: "danger",
    },
  };

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Users size={18} className="text-primary-600" />
          Employee Management
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Add Employee
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: "active",   label: `Active (${statusCounts.active})`    },
          { key: "archived", label: `Archived (${statusCounts.archived})` },
          { key: "all",      label: "All"                                 },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
              ${statusFilter === key
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {/* Table */}
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
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Department</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Manager</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No employees found
                  </td>
                </tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id}
                  className={`hover:bg-gray-50 transition ${emp.status === "archived" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} size="sm" />
                      <div>
                        <p className="font-medium text-gray-800">{emp.name}</p>
                        <p className="text-gray-400 text-xs">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={roleBadgeColor(emp.role)}>{emp.role}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {emp.department ? (
                      <span className="flex items-center gap-1 text-gray-600 text-xs">
                        <Building2 size={11} /> {emp.department}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {emp.manager?.name || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {formatDate(emp.joined_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                      ${emp.status === "active"   ? "bg-green-100 text-green-700"
                      : emp.status === "archived" ? "bg-gray-100 text-gray-500"
                      : "bg-yellow-100 text-yellow-700"}`}>
                      {emp.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(emp)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                        title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setResetModal(emp)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
                        title="Reset Password">
                        <KeyRound size={14} />
                      </button>
                      {emp.status !== "archived" ? (
                        <button
                          onClick={() => setConfirmModal({ type: "archive", emp })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition"
                          title="Archive">
                          <Archive size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModal({ type: "restore", emp })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition"
                          title="Restore">
                          <ArchiveRestore size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmModal({ type: "delete", emp })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete permanently">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editTarget ? "Edit Employee" : "Add New Employee"}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editTarget}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="jane@company.com" />
            </div>
            {!editTarget && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Min. 6 characters" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <select value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <input value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Frontend Developer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+91 9876543210" />
            </div>
            {form.role === "employee" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reports To</label>
                <select value={form.manager_id}
                  onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">No manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              <X size={14} /> Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              <Check size={14} /> {editTarget ? "Save Changes" : "Create Employee"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm action modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal ? confirmConfig[confirmModal.type].title : ""}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            {confirmModal && confirmConfig[confirmModal.type].body(confirmModal.emp)}
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setConfirmModal(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmModal ? confirmConfig[confirmModal.type].variant : "primary"}
              loading={acting}
              onClick={handleConfirmAction}
            >
              {confirmModal && confirmConfig[confirmModal.type].confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal open={!!resetModal} onClose={() => setResetModal(null)}
        title="Reset Password" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Send a password reset email to <strong>{resetModal?.email}</strong>.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setResetModal(null)}>Cancel</Button>
            <Button loading={resetting} onClick={handlePasswordReset}>
              <KeyRound size={14} /> Send Reset Email
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}