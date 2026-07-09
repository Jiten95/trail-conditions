import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CrowdReport, HazardType, Severity } from "../types";
import { seedCrowdReports } from "../data/seedReports";

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

interface ReportsContextValue {
  reports: CrowdReport[];
  addReport: (input: { waypointId: string; type: HazardType; severity: Severity; note?: string }) => void;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [userReports, setUserReports] = useState<CrowdReport[]>(loadUserReports);

  const addReport: ReportsContextValue["addReport"] = useCallback((input) => {
    const report: CrowdReport = {
      id: `cr-user-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      waypointId: input.waypointId,
      type: input.type,
      severity: input.severity,
      note: input.note,
      timestamp: new Date().toISOString(),
      source: "crowd",
    };
    setUserReports((prev) => {
      const next = [report, ...prev];
      saveUserReports(next);
      return next;
    });
  }, []);

  const reports = useMemo(() => [...userReports, ...seedCrowdReports], [userReports]);

  const value = useMemo(() => ({ reports, addReport }), [reports, addReport]);

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within a ReportsProvider");
  return ctx;
}
