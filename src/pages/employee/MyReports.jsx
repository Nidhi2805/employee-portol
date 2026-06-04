import { useState, useEffect, useCallback } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import DailyReportForm from "../../components/reports/DailyReportForm";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/utils";
import { ClipboardList } from "lucide-react";

export default function MyReports() {
  const { profile } = useAuth();
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", profile.id)
      .order("date", { ascending: false })
      .limit(30);
    setHistory(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <PageWrapper title="My Reports">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's form */}
        <div>
          <DailyReportForm />
        </div>

        {/* History */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <ClipboardList size={18} className="text-primary-600" />
            Past Reports
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : history.length === 0 ? (
            <Card className="text-center py-8 text-gray-400">No past reports yet</Card>
          ) : (
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {history.map((r) => (
                <Card key={r.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800">{formatDate(r.date)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${r.status === "reviewed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"}`}>
                      {r.status}
                    </span>
                  </div>
                  {r.first_half && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">Morning</p>
                      <p className="text-sm text-gray-700">{r.first_half}</p>
                    </div>
                  )}
                  {r.second_half && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">Afternoon</p>
                      <p className="text-sm text-gray-700">{r.second_half}</p>
                    </div>
                  )}
                  {r.manager_comment && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-1">
                      <p className="text-xs font-medium text-blue-700 mb-0.5">Manager Comment</p>
                      <p className="text-xs text-blue-800">{r.manager_comment}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}