import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { today } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { ClipboardList, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function DailyReportForm() {
  const { profile } = useAuth();
  const [report, setReport]       = useState(null);
  const [firstHalf, setFirstHalf] = useState("");
  const [secondHalf, setSecondHalf] = useState("");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const fetchReport = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", profile.id)
      .eq("date", today())
      .maybeSingle();

    if (data) {
      setReport(data);
      setFirstHalf(data.first_half || "");
      setSecondHalf(data.second_half || "");
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profile) fetchReport();
  }, [profile, fetchReport]);

  const handleSubmit = async () => {
    if (!profile.id) {
      toast.error("Profile not loaded. Please refresh and try again.");
      return;
    }
    if (!firstHalf.trim() && !secondHalf.trim()) {
      toast.error("Please fill in at least one section");
      return;
    }
    setSaving(true);

    if (report) {
      // Update existing
      const { error } = await supabase
        .from("daily_reports")
        .update({ first_half: firstHalf, second_half: secondHalf })
        .eq("id", report.id);
      if (error) toast.error("Failed to update report : " + error.message);
      else { toast.success("Report updated!"); fetchReport(); }
    } else {
      // Insert new
      const { error } = await supabase
        .from("daily_reports")
        .insert({
          user_id:      profile.id,
          date:         today(),
          first_half:   firstHalf,
          second_half:  secondHalf,
          status:       "submitted",
        });
      if (error) toast.error("Failed to submit report : " + error.message);
      else { toast.success("Report submitted! ✅"); fetchReport(); }
    }
    setSaving(false);
  };

  if (loading) return (
    <Card className="h-48 flex items-center justify-center">
      <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
    </Card>
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <ClipboardList size={18} className="text-primary-600" />
          Today's Work Report
        </div>
        {report && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${report.status === "reviewed"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"}`}>
            {report.status}
          </span>
        )}
      </div>

      {/* Manager comment */}
      {report?.manager_comment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <p className="font-medium mb-0.5">Manager's comment:</p>
          <p>{report.manager_comment}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Half Update
          </label>
          <textarea
            rows={3}
            value={firstHalf}
            onChange={(e) => setFirstHalf(e.target.value)}
            placeholder="What did you work on this morning?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Second Half Update
          </label>
          <textarea
            rows={3}
            value={secondHalf}
            onChange={(e) => setSecondHalf(e.target.value)}
            placeholder="What did you complete this afternoon?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </div>

      <Button onClick={handleSubmit} loading={saving} className="self-end">
        <CheckCircle size={15} />
        {report ? "Update Report" : "Submit Report"}
      </Button>
    </Card>
  );
}