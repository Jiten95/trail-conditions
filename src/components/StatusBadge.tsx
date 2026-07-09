import type { ReconciledStatus } from "../types";
import { STATUS_META } from "../lib/statusMeta";

export function StatusBadge({ status }: { status: ReconciledStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className="status-banner">
      <span className="dot" style={{ background: meta.color }}>
        {meta.symbol}
      </span>
      <span className="status-label">{meta.label}</span>
    </div>
  );
}
