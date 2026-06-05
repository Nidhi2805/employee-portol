import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { notifyAnnouncementAudience } from "../../lib/notify";
import { formatDate } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { Megaphone, Plus, Trash2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AnnouncementPanel() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    title: "", body: "", audience: "all", expires_at: "",
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*, users(name)")
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("announcements").insert({
      ...form,
      created_by: profile.id,
      expires_at: form.expires_at || null,
    });
    if (error) toast.error("Failed to create announcement");
    else {
      await notifyAnnouncementAudience(form.audience, form.title, form.body);
      toast.success("Announcement posted and notifications sent!");
      setForm({ title: "", body: "", audience: "all", expires_at: "" });
      setShowForm(false);
      fetchAnnouncements();
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Announcement removed");
      fetchAnnouncements();
    }
  };

  const audienceColor = {
    all:       "bg-purple-100 text-purple-700",
    managers:  "bg-blue-100 text-blue-700",
    employees: "bg-green-100 text-green-700",
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Megaphone size={18} className="text-primary-600" />
          Announcements
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Post
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">No announcements yet.</p>
      ) : (
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize
                      ${audienceColor[a.audience]}`}>
                      {a.audience}
                    </span>
                    <span className="text-xs text-gray-400">
                      by {a.users?.name} · {formatDate(a.created_at)}
                    </span>
                    {a.expires_at && (
                      <span className="text-xs text-gray-400">
                        Expires {formatDate(a.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm text-gray-600">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Announcement"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Quarterly Review Meeting"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Body *</label>
            <textarea
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Announcement details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Audience</label>
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Everyone</option>
                <option value="managers">Managers only</option>
                <option value="employees">Employees only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expires (optional)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              <X size={14} /> Cancel
            </Button>
            <Button loading={saving} onClick={handleCreate}>
              <Check size={14} /> Post Announcement
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}