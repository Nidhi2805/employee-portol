import { useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Calls onUpdate whenever INSERT / UPDATE / DELETE fires.
 *
 * @param {string} table      — table name
 * @param {function} onUpdate — callback with payload
 * @param {string} event      — INSERT | UPDATE | DELETE | *
 */
export function useRealtime(table, onUpdate, event = "*") {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${Date.now()}`)
      .on(
        "postgres_changes",
        { event, schema: "public", table },
        (payload) => onUpdate(payload)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [table, event, onUpdate]);
}