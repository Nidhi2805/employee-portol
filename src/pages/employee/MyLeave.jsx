import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import LeaveSummaryWidget from "../../components/leave/LeaveSummaryWidget";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/utils";
import { CalendarDays, Plus, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function MyLeave() {
  const { profile } = useAuth();
  const [leaves, setLeaves]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    leave_type: "casual", start_date: "", end_date: "", reason: "",
  });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leaves")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setLeaves(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApply = async () => {
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error("End date must be after start date");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("leaves").insert({
      ...form,
      user_id: profile.id,
      manager_id: profile.manager_id || null,
      status: "pending",
    });
    if (error) toast.error("Failed to apply: " + error.message);
    else {
      toast.success("Leave application submitted!");
      setShowForm(false);
      setForm({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
      fetchLeaves();
    }
    setSaving(false);
  };

  const statusStyle = {
    pending:  "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };

  return (
    <PageWrapper title="My Leave">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — balance */}
        <div>
          <LeaveSummaryWidget />
        </div>

        {/* Right — history */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-gray-700">
              <CalendarDays size={18} className="text-primary-600" />
              Leave History
            </div>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Apply Leave
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : leaves.length === 0 ? (
            <Card className="text-center py-10 text-gray-400">
              No leave applications yet
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {leaves.map((leave) => (
                <Card key={leave.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 capitalize">
                        {leave.leave_type} Leave
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize flex-shrink-0
                      ${statusStyle[leave.status]}`}>
                      {leave.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    {leave.reason}
                  </p>
                  {leave.status === "pending" && (
                    <p className="text-xs text-gray-400">Awaiting manager approval</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Apply for Leave">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={form.leave_type}
                onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="casual">Casual</option>
                <option value="sick">Sick</option>
                <option value="earned">Earned</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div /> {/* spacer */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <textarea rows={3} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Please describe your reason for leave..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              <X size={14} /> Cancel
            </Button>
            <Button loading={saving} onClick={handleApply}>
              <Check size={14} /> Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}