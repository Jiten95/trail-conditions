import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CrowdReport, HazardType, Severity } from "../types";
import { seedCrowdReports } from "../data/seedReports";
import { fetchRemoteReports, insertRemoteReport, isSupabaseConfigured } from "../lib/supabase";

const STORAGE_KEY = "trail-conditions:user-reports";

function loadUserReports(): CrowdReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CrowdReport[];
  } catch {
    return [];
  }
}

function saveUserReports(reports: CrowdReport[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Storage unavailable (private browsing, quota) — reports still work for this session.
  }
}

function makeLocalReport(input: NewReport): CrowdReport {
  return {
    id: `cr-user-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    waypointId: input.waypointId,
    type: input.type,
    severity: input.severity,
    note: input.note,
    timestamp: new Date().toISOString(),
    source: "crowd",
  };
}

interface NewReport {
  waypointId: string;
  type: HazardType;
  severity: Severity;
  note?: string;
}

interface ReportsContextValue {
  reports: CrowdReport[];
  addReport: (input: NewReport) => void;
  // True when submissions are shared through Supabase; false when they only
  // live in this browser's localStorage.
  backendConnected: boolean;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  // Seeded from localStorage so a submission is never lost even before/without
  // a backend round-trip; replaced by the shared feed once Supabase responds.
  const [userReports, setUserReports] = useState<CrowdReport[]>(loadUserReports);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    fetchRemoteReports()
      .then((remote) => {
        if (cancelled) return;
        setUserReports(remote);
        setBackendConnected(true);
      })
      .catch((err) => {
        // Degrade to localStorage-only rather than failing the whole app.
        console.warn("Supabase reports unavailable, using local reports only:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addReport: ReportsContextValue["addReport"] = useCallback(
    (input) => {
      if (isSupabaseConfigured) {
        insertRemoteReport(input)
          .then((saved) => {
            setBackendConnected(true);
            setUserReports((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
          })
          .catch((err) => {
            // Backend write failed — keep the report locally so the user's
            // submission still reconciles this session.
            console.warn("Supabase insert failed, saving report locally:", err);
            const local = makeLocalReport(input);
            setUserReports((prev) => {
              const next = [local, ...prev];
              saveUserReports(next);
              return next;
            });
          });
        return;
      }

      const local = makeLocalReport(input);
      setUserReports((prev) => {
        const next = [local, ...prev];
        saveUserReports(next);
        return next;
      });
    },
    [],
  );

  const reports = useMemo(() => [...userReports, ...seedCrowdReports], [userReports]);

  const value = useMemo(
    () => ({ reports, addReport, backendConnected }),
    [reports, addReport, backendConnected],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within a ReportsProvider");
  return ctx;
}
