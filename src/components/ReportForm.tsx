import { useState } from "react";
import type { FormEvent } from "react";
import type { HazardType, Severity } from "../types";
import { useReports } from "../state/reportsStore";

const TYPE_OPTIONS: { value: HazardType; label: string }[] = [
  { value: "flooding", label: "Flooding" },
  { value: "rockfall", label: "Rockfall" },
  { value: "ice", label: "Ice" },
  { value: "trail-blocked", label: "Trail blocked" },
  { value: "wildlife", label: "Wildlife" },
  { value: "high-wind", label: "High wind" },
  { value: "lightning", label: "Lightning" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function ReportForm({ waypointId }: { waypointId: string }) {
  const { addReport, backendConnected } = useReports();
  const [type, setType] = useState<HazardType>("other");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [note, setNote] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    addReport({ waypointId, type, severity, note: note.trim() || undefined });
    setNote("");
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 3000);
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <label>
        Hazard type
        <select value={type} onChange={(e) => setType(e.target.value as HazardType)}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Severity
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Note (optional)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you see?" />
      </label>
      <button type="submit">Submit report</button>
      {justSubmitted && (
        <span className="report-success">
          {backendConnected
            ? "Report submitted — shared and reconciled."
            : "Report added — reconciled status updated."}
        </span>
      )}
    </form>
  );
}
