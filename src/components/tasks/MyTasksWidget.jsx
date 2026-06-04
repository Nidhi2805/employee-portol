import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { priorityColor, formatDate } from "../../lib/utils";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { CheckSquare, Circle, Clock } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_FLOW = {
  todo:        "in_progress",
  in_progress: "review",
  review:      "done",
  done:        "done",
};

const STATUS_LABELS = {
  todo:        "To Do",
  in_progress: "In Progress",
  review:      "In Review",
  done:        "Done",
};

export default function MyTasksWidget() {
  const { profile } = useAuth();
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", profile.id)
      .neq("status", "done")
      .order("due_date", { ascending: true })
      .limit(5);
    if (data) setTasks(data);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profile) fetchTasks();
  }, [profile, fetchTasks]);

  const advanceStatus = async (task) => {
    const nextStatus = STATUS_FLOW[task.status];
    if (nextStatus === task.status) return;

    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", task.id);

    if (error) toast.error("Failed to update task");
    else {
      toast.success(`Task moved to ${STATUS_LABELS[nextStatus]}`);
      fetchTasks();
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <CheckSquare size={18} className="text-primary-600" />
        My Active Tasks
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          No active tasks 🎉
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition group"
            >
              {/* Advance status button */}
              <button
                onClick={() => advanceStatus(task)}
                className="mt-0.5 text-gray-300 hover:text-primary-600 transition flex-shrink-0"
                title="Advance status"
              >
                {task.status === "done"
                  ? <CheckSquare size={18} className="text-green-500" />
                  : <Circle size={18} />
                }
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={priorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-600">
                    {STATUS_LABELS[task.status]}
                  </Badge>
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={11} />
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <a
        href="/employee/tasks"
        className="text-xs text-primary-600 hover:underline self-end"
      >
        View all tasks →
      </a>
    </Card>
  );
}