import { useState } from "react";
import type { ReconciledWaypoint, WeatherReading, Waypoint } from "../types";
import { StatusBadge } from "./StatusBadge";
import { ReportForm } from "./ReportForm";
import { TYPE_LABEL } from "../lib/reconcile";
import { estimateAvalancheRisk } from "../lib/avalancheRisk";
import { waypoints } from "../data/route";
import { ChevronIcon } from "./icons";

const SOURCE_LABEL: Record<string, string> = {
  weather: "Open-Meteo (live)",
  crowd: "Crowd report",
  ranger: "Ranger advisory",
};

interface WaypointDetailProps {
  waypoint: Waypoint;
  result: ReconciledWaypoint | null;
  weather: WeatherReading | null;
}

export function WaypointDetail({ waypoint, result, weather }: WaypointDetailProps) {
  const [tab, setTab] = useState<"conditions" | "report">("conditions");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  function toggleRow(i: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const nextWaypoint = waypoints.find((w) => w.order === waypoint.order + 1);
  const activeHazard = result?.contributions
    .filter((c) => c.source !== "weather" && c.effectiveWeight > 0)
    .sort((a, b) => b.hazardLevel * b.effectiveWeight - a.hazardLevel * a.effectiveWeight)[0];

  const avalanche = weather ? estimateAvalancheRisk(weather) : null;

  return (
    <div>
      <p className="waypoint-subtitle">
        Waypoint {waypoint.order} of {waypoints.length}
      </p>
      <h2 className="waypoint-title">{waypoint.name}</h2>

      <div className="tabs">
        <button className={`tab${tab === "conditions" ? " active" : ""}`} onClick={() => setTab("conditions")}>
          Conditions
        </button>
        <button className={`tab${tab === "report" ? " active" : ""}`} onClick={() => setTab("report")}>
          Submit report
        </button>
      </div>

      {tab === "report" ? (
        <ReportForm waypointId={waypoint.id} />
      ) : !result || !weather ? (
        <p className="why-text">Loading live weather…</p>
      ) : (
        <>
          <div className="status-row">
            <StatusBadge status={result.status} />
            <span className="confidence-pill">{result.confidence}% confidence</span>
          </div>

          <div className="metrics-row">
            <div className="metric-col">
              <div className="metric-label">Weather</div>
              <div className="metric-value">{weather.temperatureC.toFixed(0)}°C</div>
              <div className="metric-sub">
                {weather.snowfallCm >= 0.1
                  ? `${weather.snowfallCm.toFixed(1)}cm/h snow`
                  : weather.precipitationMmHr >= 0.1
                    ? `${weather.precipitationMmHr.toFixed(1)}mm/h precip`
                    : "No precip"}
              </div>
            </div>
            <div className="metric-col">
              <div className="metric-label">Wind</div>
              <div className="metric-value">{weather.windSpeedKph.toFixed(0)} kph</div>
              <div className="metric-sub">gusts {weather.windGustsKph.toFixed(0)} kph</div>
            </div>
            <div className="metric-col">
              <div className="metric-label">Avalanche risk</div>
              <div className={`metric-value risk-${avalanche?.level ?? "unavailable"}`}>
                {avalanche ? avalanche.level : "—"}
              </div>
              <div className="metric-sub" title={avalanche?.reason}>
                heuristic est.
              </div>
            </div>
            <div className="metric-col">
              <div className="metric-label">{activeHazard ? "Active hazard" : "Coming up"}</div>
              <div className="metric-value">
                {activeHazard
                  ? ((activeHazard.hazardType && TYPE_LABEL[activeHazard.hazardType]) ?? "Hazard")
                  : (nextWaypoint?.name ?? "Summit reached")}
              </div>
              <div className="metric-sub">
                {activeHazard ? activeHazard.severity : nextWaypoint ? `Waypoint ${nextWaypoint.order}` : ""}
              </div>
            </div>
          </div>
          <p className="metrics-caption">
            Avalanche risk is a simplified estimate from live snowfall, wind, and temperature data — not an official
            avalanche bulletin.
          </p>

          <p className="why-text">{result.why}</p>

          <button className="sources-toggle" onClick={() => setSourcesOpen((v) => !v)}>
            <ChevronIcon open={sourcesOpen} />
            {sourcesOpen ? "Hide" : "Show"} source breakdown ({result.contributions.length})
          </button>
          {sourcesOpen && (
            <div className="sources-list">
              {result.contributions.map((c, i) => {
                const expired = c.effectiveWeight === 0 && c.source !== "weather";
                const expandable = Boolean(c.note);
                const expanded = expandedRows.has(i);
                return (
                  <div
                    key={i}
                    className={`source-row${expired ? " expired" : ""}${expandable ? " clickable" : ""}`}
                    onClick={expandable ? () => toggleRow(i) : undefined}
                    role={expandable ? "button" : undefined}
                    tabIndex={expandable ? 0 : undefined}
                    aria-expanded={expandable ? expanded : undefined}
                  >
                    <div className="source-row-top">
                      <span className="source-label">{SOURCE_LABEL[c.source]}</span>
                      <span className="weight">
                        weight {c.baseWeight.toFixed(1)} × decay {c.decayFactor.toFixed(1)} = {c.effectiveWeight.toFixed(2)}
                      </span>
                    </div>
                    <div className="detail">
                      {c.detail}
                      {expandable && <ChevronIcon open={expanded} />}
                    </div>
                    {expandable && expanded && <div className="source-note">"{c.note}"</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
