import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { priorityColor, formatDate } from "../../lib/utils";
import { CheckSquare, Circle, Clock } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_FLOW  = { todo: "in_progress", in_progress: "review", review: "done", done: "done" };
const STATUS_LABEL = { todo: "To Do", in_progress: "In Progress", review: "In Review", done: "Done" };
const COLS = ["todo", "in_progress", "review", "done"];

export default function MyTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", profile.id)
      .order("due_date", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const advance = async (task) => {
    const next = STATUS_FLOW[task.status];
    if (next === task.status) return;
    await supabase.from("tasks")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", task.id);
    toast.success(`Moved to ${STATUS_LABEL[next]}`);
    fetchTasks();
  };

  const displayed = filter === "all"
    ? tasks
    : tasks.filter((t) => t.status === filter);

  return (
    <PageWrapper title="My Tasks">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit overflow-x-auto">
        {["all", ...COLS].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize flex-shrink-0
              ${filter === s ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
            <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
              {s === "all" ? tasks.length : tasks.filter((t) => t.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.length === 0 ? (
            <Card className="col-span-full text-center py-12 text-gray-400">
              No tasks here 🎉
            </Card>
          ) : (
            displayed.map((task) => (
              <Card key={task.id} className="flex flex-col gap-3 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-800">{task.title}</p>
                  <button onClick={() => advance(task)}>
                    {task.status === "done"
                      ? <CheckSquare size={18} className="text-green-500" />
                      : <Circle size={18} className="text-gray-300 hover:text-primary-500 transition" />
                    }
                  </button>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-auto pt-2 border-t border-gray-50">
                  <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
                  <Badge className="bg-gray-100 text-gray-600">{STATUS_LABEL[task.status]}</Badge>
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                      <Clock size={11} /> Due {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </PageWrapper>
  );
}