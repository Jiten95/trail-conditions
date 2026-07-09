import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ReconciledWaypoint, WeatherReading, Waypoint } from "../types";
import { StatusBadge } from "./StatusBadge";
import { ReportForm } from "./ReportForm";
import { TYPE_LABEL } from "../lib/reconcile";
import { estimateAvalancheRisk, type AvalancheRiskLevel } from "../lib/avalancheRisk";
import { SLF_WEBSITE_URL, type OfficialAvalancheReport } from "../lib/slfAvalanche";
import { getDaylightInfo } from "../lib/daylight";
import { ChevronIcon } from "./icons";

const SOURCE_LABEL: Record<string, string> = {
  weather: "Open-Meteo (live)",
  crowd: "Crowd report",
  ranger: "Ranger advisory",
};

// External providers a source row can link out to. Seeded crowd/ranger data
// has no real feed, so it deliberately has no link (see README — no overclaim).
const SOURCE_LINK: Record<string, (w: Waypoint) => string> = {
  weather: (w) => `https://open-meteo.com/en/docs#latitude=${w.lat}&longitude=${w.lng}`,
};

const SWIPE_THRESHOLD_PX = 55;

interface WaypointDetailProps {
  waypoint: Waypoint;
  routeWaypoints: Waypoint[];
  result: ReconciledWaypoint | null;
  weather: WeatherReading | null;
  avalancheOfficial: OfficialAvalancheReport | null;
}

export function WaypointDetail({ waypoint, routeWaypoints, result, weather, avalancheOfficial }: WaypointDetailProps) {
  const [tab, setTab] = useState<"conditions" | "report">("conditions");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  function toggleRow(i: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  // Horizontal swipe switches tabs (left -> report, right -> conditions),
  // while vertical gestures still scroll the sheet (touch-action: pan-y).
  function onSwipeDown(e: ReactPointerEvent) {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  }
  function onSwipeUp(e: ReactPointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setTab(dx < 0 ? "report" : "conditions");
    }
  }

  const nextWaypoint = routeWaypoints.find((w) => w.order === waypoint.order + 1);
  const activeHazard = result?.contributions
    .filter((c) => c.source !== "weather" && c.effectiveWeight > 0)
    .sort((a, b) => b.hazardLevel * b.effectiveWeight - a.hazardLevel * a.effectiveWeight)[0];

  const heuristic = weather ? estimateAvalancheRisk(weather) : null;
  const avalancheLevel: AvalancheRiskLevel = avalancheOfficial?.level ?? heuristic?.level ?? "unavailable";
  const avalancheIsOfficial = Boolean(avalancheOfficial);
  const avalancheReason = avalancheOfficial
    ? `Official SLF danger level${avalancheOfficial.regionName ? ` — ${avalancheOfficial.regionName}` : ""}.`
    : heuristic?.reason;

  const daylight = weather ? getDaylightInfo(weather.sunrise, weather.sunset, weather.localTime) : null;

  return (
    <div>
      <p className="waypoint-subtitle">
        Waypoint {waypoint.order} of {routeWaypoints.length}
      </p>
      <h2 className="waypoint-title">{waypoint.name}</h2>

      <div className="tabs" role="tablist">
        <button
          className={`tab${tab === "conditions" ? " active" : ""}`}
          role="tab"
          aria-selected={tab === "conditions"}
          onClick={() => setTab("conditions")}
        >
          Conditions
        </button>
        <button
          className={`tab${tab === "report" ? " active" : ""}`}
          role="tab"
          aria-selected={tab === "report"}
          onClick={() => setTab("report")}
        >
          Submit report
        </button>
      </div>
      <p className="tab-swipe-hint">← swipe to switch →</p>

      <div className="tab-swipe" onPointerDown={onSwipeDown} onPointerUp={onSwipeUp}>
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
                <div className={`metric-value risk-${avalancheLevel}`}>{avalancheLevel.replace("-", " ")}</div>
                <div className="metric-sub" title={avalancheReason}>
                  {avalancheIsOfficial ? "SLF official" : "heuristic est."}
                </div>
              </div>
              <div className="metric-col">
                <div className="metric-label">{activeHazard ? "Active hazard" : "Coming up"}</div>
                <div className="metric-value">
                  {activeHazard
                    ? ((activeHazard.hazardType && TYPE_LABEL[activeHazard.hazardType]) ?? "Hazard")
                    : (nextWaypoint?.name ?? "End of trail")}
                </div>
                <div className="metric-sub">
                  {activeHazard ? activeHazard.severity : nextWaypoint ? `Waypoint ${nextWaypoint.order}` : ""}
                </div>
              </div>
            </div>

            {daylight && (
              <div className="daylight-row">
                <span className="daylight-summary">{daylight.summary}</span>
                {daylight.sunriseLabel && daylight.sunsetLabel && (
                  <span className="daylight-times">
                    ↑ {daylight.sunriseLabel} · ↓ {daylight.sunsetLabel}
                  </span>
                )}
              </div>
            )}

            <p className="metrics-caption">
              {avalancheIsOfficial ? (
                <>
                  Avalanche risk is the official live SLF bulletin for this region.{" "}
                  <a href={SLF_WEBSITE_URL} target="_blank" rel="noopener noreferrer">
                    View SLF bulletin
                  </a>
                  .
                </>
              ) : (
                <>
                  Avalanche risk is a simplified estimate from live snowfall, wind, and temperature — not an official
                  bulletin. No active{" "}
                  <a href={SLF_WEBSITE_URL} target="_blank" rel="noopener noreferrer">
                    SLF bulletin
                  </a>{" "}
                  covering this point right now.
                </>
              )}
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
                  const link = SOURCE_LINK[c.source]?.(waypoint);
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
                        {link ? (
                          <a
                            className="source-label source-link"
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {SOURCE_LABEL[c.source]} ↗
                          </a>
                        ) : (
                          <span className="source-label">{SOURCE_LABEL[c.source]}</span>
                        )}
                        <span className="weight">
                          weight {c.baseWeight.toFixed(1)} × decay {c.decayFactor.toFixed(1)} ={" "}
                          {c.effectiveWeight.toFixed(2)}
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

            <div className="sources-footer">
              <span className="sources-footer-label">Data sources:</span>
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                Open-Meteo
              </a>
              <a href={SLF_WEBSITE_URL} target="_blank" rel="noopener noreferrer">
                SLF avalanche
              </a>
              <a href="https://brouter.de/" target="_blank" rel="noopener noreferrer">
                BRouter
              </a>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                © OpenStreetMap
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
