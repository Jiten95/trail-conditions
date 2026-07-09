import type { ReconciledWaypoint, Waypoint } from "../types";
import { StatusBadge } from "./StatusBadge";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { ReportForm } from "./ReportForm";

const SOURCE_LABEL: Record<string, string> = {
  weather: "Open-Meteo (live)",
  crowd: "Crowd report",
  ranger: "Ranger advisory",
};

export function WaypointDetail({ waypoint, result }: { waypoint: Waypoint; result: ReconciledWaypoint | null }) {
  return (
    <div>
      <p className="waypoint-subtitle">
        Waypoint {waypoint.order} of 7
      </p>
      <h2 className="waypoint-title">{waypoint.name}</h2>

      {!result ? (
        <p className="why-text">Loading live weather…</p>
      ) : (
        <>
          <StatusBadge status={result.status} />
          <ConfidenceMeter confidence={result.confidence} />
          <p className="why-text">{result.why}</p>

          <h3 className="section-title">Source breakdown</h3>
          {result.contributions.map((c, i) => {
            const expired = c.effectiveWeight === 0 && c.source !== "weather";
            return (
              <div key={i} className={`source-row${expired ? " expired" : ""}`}>
                <div className="source-row-top">
                  <span className="source-label">{SOURCE_LABEL[c.source]}</span>
                  <span className="weight">
                    weight {c.baseWeight.toFixed(1)} × decay {c.decayFactor.toFixed(1)} = {c.effectiveWeight.toFixed(2)}
                  </span>
                </div>
                <div className="detail">{c.detail}</div>
              </div>
            );
          })}
        </>
      )}

      <h3 className="section-title">Submit a report</h3>
      <ReportForm waypointId={waypoint.id} />
    </div>
  );
}
