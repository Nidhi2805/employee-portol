import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { Building2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function DepartmentManager() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("departments")
      .select("*, head:head_id(name)")
      .order("name");
    setDepartments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: "", description: "" });
    setShowForm(true);
  };

  const openEdit = (dept) => {
    setEditTarget(dept);
    setForm({ name: dept.name, description: dept.description || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    if (editTarget) {
      const { error } = await supabase
        .from("departments").update(form).eq("id", editTarget.id);
      if (error) toast.error("Update failed");
      else { toast.success("Department updated"); setShowForm(false); fetchDepts(); }
    } else {
      const { error } = await supabase.from("departments").insert(form);
      if (error) toast.error("Failed — name may already exist");
      else { toast.success("Department created"); setShowForm(false); fetchDepts(); }
    }
    setSaving(false);
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete "${dept.name}"? Employees in this dept will have no department.`)) return;
    setDeleting(dept.id);
    // Clear department field on employees first
    await supabase.from("users")
      .update({ department: null })
      .eq("department", dept.name);
    const { error } = await supabase.from("departments").delete().eq("id", dept.id);
    if (error) toast.error("Delete failed");
    else { toast.success("Department deleted"); fetchDepts(); }
    setDeleting(null);
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Building2 size={18} className="text-primary-600" />
          Departments
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Add Department
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : departments.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">No departments yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map((dept) => (
            <div key={dept.id}
              className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2 hover:border-primary-200 hover:bg-primary-50/30 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} className="text-primary-600" />
                  </div>
                  <p className="font-semibold text-gray-800">{dept.name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(dept)}
                    className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(dept)}
                    disabled={deleting === dept.id}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {dept.description && (
                <p className="text-xs text-gray-500">{dept.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? "Edit Department" : "New Department"}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Engineering" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Optional description" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              <X size={14} /> Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              <Check size={14} /> {editTarget ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}