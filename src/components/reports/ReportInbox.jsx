import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatDate, today } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { FileText, ChevronDown, ChevronUp, Send } from "lucide-react";
import toast from "react-hot-toast";

export default function ReportInbox() {
  const { profile } = useAuth();
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [comment, setComment]   = useState("");
  const [saving, setSaving]     = useState(false);

  const fetchReports = useCallback(async () => {
  if (!profile) return;
  setLoading(true);

  // Single query joining users — no two-step fetch
  const { data: teamData } = await supabase
    .from("users")
    .select("id, name")
    .eq("manager_id", profile.id)
    .eq("is_active", true);

  if (!teamData || teamData.length === 0) {
    setReports([]);
    setLoading(false);
    return;
  }

  const teamIds = teamData.map((u) => u.id);
  const quotedTeamIds = teamIds.map((id) => `"${id}"`).join(",");

  let reportQuery = supabase
    .from("daily_reports")
    .select("*, users(name)")
    .eq("date", today());

  if (teamIds.length > 0) {
    reportQuery = reportQuery.or(
      `manager_id.eq.${profile.id},user_id.in.(${quotedTeamIds})`
    );
  } else {
    reportQuery = reportQuery.eq("manager_id", profile.id);
  }

  const { data: reportData } = await reportQuery;

  // Mark team members who haven't submitted
  const submittedIds = (reportData || []).map((r) => r.user_id);
  const notSubmitted = teamData
    .filter((u) => !submittedIds.includes(u.id))
    .map((u) => ({
      user_id:       u.id,
      users:         { name: u.name },
      not_submitted: true,
    }));

  setReports([...(reportData || []), ...notSubmitted]);
  setLoading(false);
}, [profile]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const submitComment = async (reportId) => {
    if (!comment.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("daily_reports")
      .update({
        manager_comment: comment,
        status:          "reviewed",
        reviewed_by:     profile.id,
        reviewed_at:     new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) toast.error("Failed to save comment");
    else {
      toast.success("Comment saved");
      setComment("");
      setExpanded(null);
      fetchReports();
    }
    setSaving(false);
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <FileText size={18} className="text-primary-600" />
          Today's Reports
        </div>
        <span className="text-xs text-gray-400">
          {reports.filter((r) => !r.not_submitted).length} submitted
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">No team members found.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {reports.map((report, idx) => (
            <div
              key={report.id || idx}
              className={`rounded-lg border text-sm transition
                ${report.not_submitted
                  ? "border-gray-100 bg-gray-50"
                  : report.status === "reviewed"
                  ? "border-green-100 bg-green-50"
                  : "border-yellow-100 bg-yellow-50"}`}
            >
              {/* Row header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => !report.not_submitted && setExpanded(
                  expanded === report.id ? null : report.id
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">
                    {report.users?.name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                    ${report.not_submitted
                      ? "bg-gray-200 text-gray-500"
                      : report.status === "reviewed"
                      ? "bg-green-200 text-green-700"
                      : "bg-yellow-200 text-yellow-700"}`}>
                    {report.not_submitted ? "Not Submitted" : report.status}
                  </span>
                </div>
                {!report.not_submitted && (
                  expanded === report.id
                    ? <ChevronUp size={15} className="text-gray-400" />
                    : <ChevronDown size={15} className="text-gray-400" />
                )}
              </div>

              {/* Expanded content */}
              {expanded === report.id && !report.not_submitted && (
                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-100">
                  {report.first_half && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">First Half</p>
                      <p className="text-gray-700">{report.first_half}</p>
                    </div>
                  )}
                  {report.second_half && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Second Half</p>
                      <p className="text-gray-700">{report.second_half}</p>
                    </div>
                  )}
                  {report.manager_comment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">Your comment</p>
                      <p className="text-blue-800 text-xs">{report.manager_comment}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button
                      size="sm"
                      loading={saving}
                      onClick={() => submitComment(report.id)}
                    >
                      <Send size={12} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}