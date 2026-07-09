import type { ConditionsSeverity } from "../types";
import { SEVERITY_META } from "../lib/statusMeta";

export function StatusBadge({ severity }: { severity: ConditionsSeverity }) {
  const meta = SEVERITY_META[severity];
  return (
    <div className="status-banner">
      <span className="dot" style={{ background: meta.color }}>
        {meta.symbol}
      </span>
      <span className="status-label">{meta.label}</span>
    </div>
  );
}
