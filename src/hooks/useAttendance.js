import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { today, computeHours } from "../lib/utils";

export function useAttendance() {
  const { profile } = useAuth();
  const [session, setSession]     = useState(null); // today's attendance row
  const [elapsed, setElapsed]     = useState(0);    // ms since clock-in
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const clockedIn  = !!session?.clock_in && !session?.clock_out;
  const onBreak    = !!session?.break_start && !session?.break_end;

  // Fetch today's session on mount
  const fetchToday = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", profile.id)
      .eq("date", today())
      .maybeSingle();

    setSession(data || null);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  // Live timer — ticks every second when clocked in
  useEffect(() => {
    if (!clockedIn) { setElapsed(0); return; }
    const base = new Date(session.clock_in).getTime();
    const tick = () => setElapsed(Date.now() - base);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockedIn, session?.clock_in]);

  const clockIn = async () => {
    if (!profile || clockedIn) return;
    setActionLoading(true);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        user_id:  profile.id,
        date:     today(),
        clock_in: now,
        status:   isLate() ? "late" : "present",
      })
      .select()
      .single();

    if (!error) setSession(data);
    setActionLoading(false);
    return { error };
  };

  const clockOut = async () => {
    if (!session || !clockedIn) return;
    setActionLoading(true);
    const now        = new Date().toISOString();
    const totalHours = computeHours(session.clock_in, now);

    const { data, error } = await supabase
      .from("attendance")
      .update({ clock_out: now, total_hours: totalHours })
      .eq("id", session.id)
      .select()
      .single();

    if (!error) setSession(data);
    setActionLoading(false);
    return { error };
  };

  const startBreak = async () => {
    if (!session || onBreak) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("attendance")
      .update({ break_start: now })
      .eq("id", session.id)
      .select()
      .single();
    if (data) setSession(data);
  };

  const endBreak = async () => {
    if (!session || !onBreak) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("attendance")
      .update({ break_end: now })
      .eq("id", session.id)
      .select()
      .single();
    if (data) setSession(data);
  };

  return {
    session, elapsed, loading, actionLoading,
    clockedIn, onBreak,
    clockIn, clockOut, startBreak, endBreak,
    refetch: fetchToday,
  };
}

// Flag as late if clock-in is after 9:30 AM
function isLate() {
  const now = new Date();
  return now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() >= 30);
}