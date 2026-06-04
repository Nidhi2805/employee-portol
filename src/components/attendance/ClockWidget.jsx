import { formatElapsed, formatTime } from "../../lib/utils";
import { useAttendance } from "../../hooks/useAttendance";
import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  Clock, LogIn, LogOut, Coffee, PlayCircle,
  CheckCircle, Timer,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ClockWidget() {
  const {
    session, elapsed, loading, actionLoading,
    clockedIn, onBreak,
    clockIn, clockOut, startBreak, endBreak,
  } = useAttendance();

  const handleClockIn = async () => {
    const { error } = await clockIn();
    if (error) toast.error("Failed to clock in");
    else toast.success("Clocked in! Have a great day 🚀");
  };

  const handleClockOut = async () => {
    const { error } = await clockOut();
    if (error) toast.error("Failed to clock out");
    else toast.success("Clocked out! See you tomorrow 👋");
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-44">
        <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full" />
      </Card>
    );
  }

  const alreadyDone = !!session?.clock_out;

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700 font-semibold">
        <Clock size={18} className="text-primary-600" />
        Today's Attendance
      </div>

      {/* Timer display */}
      <div className={`
        rounded-xl px-6 py-5 flex flex-col items-center gap-1
        ${clockedIn ? "bg-green-50 border border-green-200"
          : alreadyDone ? "bg-gray-50 border border-gray-200"
          : "bg-primary-50 border border-primary-200"}
      `}>
        <div className={`text-4xl font-mono font-bold tracking-widest
          ${clockedIn ? "text-green-600" : alreadyDone ? "text-gray-500" : "text-primary-600"}`}>
          {clockedIn ? formatElapsed(elapsed) : alreadyDone ? "Done" : "--:--:--"}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
          {clockedIn && (
            <>
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live — clocked in at {formatTime(session?.clock_in)}
            </>
          )}
          {alreadyDone && (
            <>
              <CheckCircle size={12} className="text-gray-400" />
              {formatTime(session?.clock_in)} → {formatTime(session?.clock_out)}
              &nbsp;·&nbsp;
              <strong>{session?.total_hours}h</strong> worked
            </>
          )}
          {!clockedIn && !alreadyDone && (
            <>
              <Timer size={12} />
              Not clocked in yet
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      {session?.status && (
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full font-medium capitalize
            ${session.status === "late"     ? "bg-orange-100 text-orange-700"
            : session.status === "present"  ? "bg-green-100 text-green-700"
            : session.status === "half_day" ? "bg-yellow-100 text-yellow-700"
            : "bg-gray-100 text-gray-600"}`}>
            {session.status}
          </span>
          {onBreak && (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              On Break
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!clockedIn && !alreadyDone && (
          <Button
            onClick={handleClockIn}
            loading={actionLoading}
            className="flex-1"
          >
            <LogIn size={15} />
            Clock In
          </Button>
        )}

        {clockedIn && !alreadyDone && (
          <>
            {!onBreak ? (
              <Button
                variant="secondary"
                onClick={startBreak}
                disabled={actionLoading}
                className="flex-1"
              >
                <Coffee size={15} />
                Start Break
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={endBreak}
                disabled={actionLoading}
                className="flex-1"
              >
                <PlayCircle size={15} />
                End Break
              </Button>
            )}

            <Button
              variant="danger"
              onClick={handleClockOut}
              loading={actionLoading}
              className="flex-1"
            >
              <LogOut size={15} />
              Clock Out
            </Button>
          </>
        )}

        {alreadyDone && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle size={16} />
            Attendance recorded for today
          </div>
        )}
      </div>
    </Card>
  );
}