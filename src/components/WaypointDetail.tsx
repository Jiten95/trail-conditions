import { useState } from "react";
import type { ReconciledWaypoint, WeatherReading, Waypoint } from "../types";
import { StatusBadge } from "./StatusBadge";
import { ReportForm } from "./ReportForm";
import { TYPE_LABEL } from "../lib/reconcile";
import { estimateAvalancheRisk } from "../lib/avalancheRisk";
import type { OfficialAvalancheRating } from "../lib/avalancheBulletin";
import { waypoints } from "../data/route";
import { ThermometerIcon, WindIcon, AlertTriangleIcon, FlagIcon, ChevronIcon } from "./icons";

const SOURCE_LABEL: Record<string, string> = {
  weather: "Open-Meteo (live)",
  crowd: "Crowd report",
  ranger: "Ranger advisory",
};

const RISK_ACCENT: Record<string, string> = {
  low: "accent-good",
  moderate: "accent-warning",
  considerable: "accent-warning",
  high: "accent-critical",
  "very-high": "accent-critical",
  unavailable: "accent-muted",
};

const OFFICIAL_LEVEL_SLUG: Record<number, string> = {
  1: "low",
  2: "moderate",
  3: "considerable",
  4: "high",
  5: "very-high",
};

interface WaypointDetailProps {
  waypoint: Waypoint;
  result: ReconciledWaypoint | null;
  weather: WeatherReading | null;
  officialAvalanche: OfficialAvalancheRating | null;
}

export function WaypointDetail({ waypoint, result, weather, officialAvalanche }: WaypointDetailProps) {
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

  const heuristic = weather ? estimateAvalancheRisk(weather) : null;
  const avalanche = officialAvalanche
    ? {
        slug: OFFICIAL_LEVEL_SLUG[officialAvalanche.level] ?? "unavailable",
        value: officialAvalanche.levelText,
        sub: `SLF official · ${officialAvalanche.level}/5`,
        title: `Official SLF avalanche bulletin — danger level ${officialAvalanche.level}/5${
          officialAvalanche.validEnd ? `, valid to ${new Date(officialAvalanche.validEnd).toLocaleString()}` : ""
        }`,
        official: true,
      }
    : heuristic
      ? {
          slug: heuristic.level,
          value: heuristic.level,
          sub: "Heuristic — no live bulletin",
          title: heuristic.reason,
          official: false,
        }
      : { slug: "unavailable", value: "—", sub: "no data", title: "", official: false };
  const hazardAccent = activeHazard && result ? `accent-status-${result.status}` : "accent-info";

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
              <div className="metric-icon">
                <ThermometerIcon />
              </div>
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
              <div className="metric-icon">
                <WindIcon />
              </div>
              <div className="metric-label">Wind</div>
              <div className="metric-value">{weather.windSpeedKph.toFixed(0)} kph</div>
              <div className="metric-sub">gusts {weather.windGustsKph.toFixed(0)} kph</div>
            </div>
            <div className={`metric-col ${RISK_ACCENT[avalanche.slug] ?? "accent-muted"}`}>
              <div className="metric-icon">
                <AlertTriangleIcon />
              </div>
              <div className="metric-label">Avalanche risk</div>
              <div className={`metric-value risk-${avalanche.slug}`}>{avalanche.value}</div>
              <div className={`metric-sub${avalanche.official ? " metric-sub-official" : ""}`} title={avalanche.title}>
                {avalanche.sub}
              </div>
            </div>
            <div className={`metric-col ${hazardAccent}`}>
              <div className="metric-icon">
                <FlagIcon />
              </div>
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
            {avalanche.official
              ? "Avalanche risk is the official SLF avalanche bulletin (EAWS danger scale 1–5) for this waypoint's warning region."
              : "No live SLF bulletin right now (it's issued seasonally, ~Nov–May). Showing a simplified heuristic estimate from live snowfall, wind, and temperature — not an official avalanche bulletin."}
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
