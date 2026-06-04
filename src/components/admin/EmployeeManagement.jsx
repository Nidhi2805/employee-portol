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
  Users, Plus, Pencil, UserX, UserCheck,
  Search, KeyRound, Check, X,
} from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "", email: "", password: "",
  role: "employee", department: "",
  position: "", phone: "", manager_id: "",
};

export default function EmployeeManagement() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*, manager:manager_id(name)")
      .order("created_at", { ascending: false });
    if (data) {
      setEmployees(data);
      setManagers(data.filter((u) => u.role === "manager" || u.role === "admin"));
    }
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
      // Update profile row
      const { error } = await supabase
        .from("users")
        .update({
          name:       form.name,
          role:       form.role,
          department: form.department,
          position:   form.position,
          phone:      form.phone,
          manager_id: form.manager_id || null,
        })
        .eq("id", editTarget.id);

      if (error) toast.error("Update failed: " + error.message);
      else {
        toast.success("Employee updated");

        // Audit log
        await supabase.from("audit_logs").insert({
          actor_id:    profile.id,
          action:      "update_employee",
          target_type: "user",
          target_id:   editTarget.id,
          metadata:    { name: form.name, role: form.role },
        });

        setShowForm(false);
        fetchData();
      }
    } else {
      // Create new Supabase auth user via admin API
      // We do this by inserting via the auth admin endpoint
      // Since we're frontend-only, we use signUp and immediately set role
      if (!form.password || form.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setSaving(false);
        return;
      }

      // Use Supabase admin signUp — triggers our handle_new_user trigger
      const { error: authError } = await supabase.auth.admin
        ? supabase.auth.admin.createUser({
            email:    form.email,
            password: form.password,
            user_metadata: { name: form.name, role: form.role },
          })
        : { data: null, error: { message: "Admin API not available on client" } };

      // Fallback: use regular signUp (works if email confirmation is OFF in Supabase)
      if (authError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email:    form.email,
          password: form.password,
          options: { data: { name: form.name, role: form.role } },
        });
        if (signUpError) {
          toast.error("Failed to create user: " + signUpError.message);
          setSaving(false);
          return;
        }

        // Update the users row created by trigger
        if (signUpData?.user) {
          await supabase
            .from("users")
            .update({
              role:       form.role,
              department: form.department,
              position:   form.position,
              phone:      form.phone,
              manager_id: form.manager_id || null,
            })
            .eq("id", signUpData.user.id);

          // Create default leave balance
          await supabase.from("leave_balances").insert({
            user_id: signUpData.user.id,
          });
        }
      }

      await supabase.from("audit_logs").insert({
        actor_id:    profile.id,
        action:      "create_employee",
        target_type: "user",
        metadata:    { email: form.email, role: form.role },
      });

      toast.success("Employee created! They can now log in.");
      setShowForm(false);
      fetchData();
    }
    setSaving(false);
  };

  const toggleActive = async (emp) => {
    const { error } = await supabase
      .from("users")
      .update({ is_active: !emp.is_active })
      .eq("id", emp.id);

    if (error) toast.error("Failed to update status");
    else {
      toast.success(`${emp.name} ${emp.is_active ? "deactivated" : "reactivated"}`);
      await supabase.from("audit_logs").insert({
        actor_id:    profile.id,
        action:      emp.is_active ? "deactivate_employee" : "reactivate_employee",
        target_type: "user",
        target_id:   emp.id,
        metadata:    { name: emp.name },
      });
      fetchData();
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetting(true);

    // Send password reset email as fallback (admin SDK needed for direct reset)
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetModal.email,
      { redirectTo: window.location.origin + "/login" }
    );

    if (error) toast.error("Reset failed: " + error.message);
    else {
      toast.success(`Password reset email sent to ${resetModal.email}`);
      await supabase.from("audit_logs").insert({
        actor_id:    profile.id,
        action:      "password_reset",
        target_type: "user",
        target_id:   resetModal.id,
        metadata:    { email: resetModal.email },
      });
      setResetModal(null);
      setNewPassword("");
    }
    setResetting(false);
  };

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Users size={18} className="text-primary-600" />
          Employee Management
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
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
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
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
                      <Badge className={roleBadgeColor(emp.role)}>
                        {emp.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                      {emp.department || "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                      {emp.manager?.name || "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                      {formatDate(emp.joined_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${emp.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"}`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setResetModal(emp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
                          title="Reset Password"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => toggleActive(emp)}
                          className={`p-1.5 rounded-lg transition
                            ${emp.is_active
                              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                          title={emp.is_active ? "Deactivate" : "Reactivate"}
                        >
                          {emp.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? "Edit Employee" : "Add New Employee"}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editTarget}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="jane@company.com"
              />
            </div>
            {!editTarget && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Min. 6 characters"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Engineering"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Frontend Developer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+91 9876543210"
              />
            </div>
            {form.role === "employee" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reports To</label>
                <select
                  value={form.manager_id}
                  onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
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
              <Check size={14} />
              {editTarget ? "Save Changes" : "Create Employee"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        open={!!resetModal}
        onClose={() => { setResetModal(null); setNewPassword(""); }}
        title="Reset Password"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Send a password reset email to <strong>{resetModal?.email}</strong>.
            They'll receive a link to set a new password.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="secondary"
              onClick={() => { setResetModal(null); setNewPassword(""); }}
            >
              Cancel
            </Button>
            <Button loading={resetting} onClick={handlePasswordReset}>
              <KeyRound size={14} />
              Send Reset Email
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}