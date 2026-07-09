import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CrowdReport, HazardType, Severity } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When the env vars aren't set (local dev without a project, CI, offline),
// the app falls back to localStorage-only reports. Keeping this a boolean the
// rest of the app can read means no code path throws just because Supabase
// isn't wired up.
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

const TABLE = "reports";

// DB row shape (snake_case) as stored in the `reports` table.
interface ReportRow {
  id: string;
  waypoint_id: string;
  type: string;
  severity: string;
  note: string | null;
  created_at: string;
}

function rowToReport(row: ReportRow): CrowdReport {
  return {
    id: row.id,
    waypointId: row.waypoint_id,
    type: row.type as HazardType,
    severity: row.severity as Severity,
    note: row.note ?? undefined,
    timestamp: row.created_at,
    source: "crowd",
  };
}

// Reports newer than this are worth fetching; anything older is already past
// the reconciliation engine's expiry tier (>72h), so we don't pull it.
const FETCH_WINDOW_HOURS = 72;

export async function fetchRemoteReports(): Promise<CrowdReport[]> {
  if (!supabase) return [];
  const since = new Date(Date.now() - FETCH_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, waypoint_id, type, severity, note, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ReportRow[]).map(rowToReport);
}

export interface NewReportInput {
  waypointId: string;
  type: HazardType;
  severity: Severity;
  note?: string;
}

export async function insertRemoteReport(input: NewReportInput): Promise<CrowdReport> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      waypoint_id: input.waypointId,
      type: input.type,
      severity: input.severity,
      note: input.note ?? null,
    })
    .select("id, waypoint_id, type, severity, note, created_at")
    .single();
  if (error) throw error;
  return rowToReport(data as ReportRow);
}
