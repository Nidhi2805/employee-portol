import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { priorityColor, formatDate } from "../../lib/utils";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { CheckSquare, Plus, X, Check } from "lucide-react";
import toast from "react-hot-toast";

const COLUMNS = [
  { key: "todo",        label: "To Do"      },
  { key: "in_progress", label: "In Progress"},
  { key: "review",      label: "Review"     },
  { key: "done",        label: "Done"       },
];

export default function TeamTaskBoard() {
  const { profile } = useAuth();
  const [tasks, setTasks]     = useState([]);
  const [team, setTeam]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({
    title: "", description: "", assigned_to: "",
    priority: "medium", due_date: "",
  });
  const [saving, setSaving]   = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: teamData } = await supabase
      .from("users")
      .select("id, name")
      .eq("manager_id", profile.id);

    setTeam(teamData || []);

    if (teamData && teamData.length > 0) {
      const { data: taskData } = await supabase
        .from("tasks")
        .select("*, users!tasks_assigned_to_fkey(name)")
        .in("assigned_to", teamData.map((u) => u.id))
        .order("created_at", { ascending: false });
      setTasks(taskData || []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createTask = async () => {
    if (!form.title.trim() || !form.assigned_to) {
      toast.error("Title and assignee are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      ...form,
      assigned_by: profile.id,
      due_date:    form.due_date || null,
    });
    if (error) toast.error("Failed to create task");
    else {
      toast.success("Task created");
      setShowForm(false);
      setForm({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });
      fetchData();

      // Notify assignee
      const assignee = team.find((u) => u.id === form.assigned_to);
      if (assignee) {
        await supabase.from("notifications").insert({
          user_id: form.assigned_to,
          type:    "task_assigned",
          message: `New task assigned: "${form.title}"`,
        });
      }
    }
    setSaving(false);
  };

  const updateStatus = async (taskId, newStatus) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", taskId);
    if (!error) fetchData();
  };

  if (loading) return (
    <Card className="flex justify-center py-10">
      <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
    </Card>
  );

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <CheckSquare size={18} className="text-primary-600" />
          Team Tasks
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />
          Assign Task
        </Button>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="border border-primary-200 bg-primary-50 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-primary-700">New Task</p>
          <input
            placeholder="Task title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Assign to *</option>
              {team.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              <X size={13} /> Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={createTask}>
              <Check size={13} /> Create
            </Button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto">
        {COLUMNS.map(({ key, label }) => {
          const col = tasks.filter((t) => t.status === key);
          return (
            <div key={key} className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {label}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {col.length}
                </span>
              </div>

              {col.length === 0 ? (
                <div className="text-center text-gray-300 text-xs py-4 border border-dashed border-gray-200 rounded-lg">
                  Empty
                </div>
              ) : (
                col.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:shadow-md transition"
                  >
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">
                      {task.title}
                    </p>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <Badge className={priorityColor(task.priority) + " text-[10px]"}>
                        {task.priority}
                      </Badge>
                      {task.users?.name && (
                        <span className="text-[10px] text-gray-400 truncate">
                          {task.users.name.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    {task.due_date && (
                      <p className="text-[10px] text-gray-400">
                        Due {formatDate(task.due_date)}
                      </p>
                    )}
                    {/* Quick status move */}
                    {key !== "done" && (
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        className="text-[10px] border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}