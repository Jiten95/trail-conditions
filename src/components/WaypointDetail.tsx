import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { GeoPoint, PointConditions, Provenance, Signal, WeatherReading } from "../types";
import type { SunOnSlope } from "../lib/sun";
import { StatusBadge } from "./StatusBadge";
import { ReportForm } from "./ReportForm";
import { SLF_WEBSITE_URL } from "../lib/slfAvalanche";

const SWIPE_THRESHOLD_PX = 55;

const PROVENANCE_LABEL: Record<Provenance, string> = {
  official: "official",
  modeled: "modeled",
  computed: "computed",
  reported: "reported",
};

const HOUR_OPTIONS = [
  { value: 0, label: "Now" },
  { value: 2, label: "+2h" },
  { value: 4, label: "+4h" },
  { value: 6, label: "+6h" },
];

interface WaypointDetailProps {
  point: GeoPoint;
  isSample: boolean;
  order?: number;
  totalWaypoints?: number;
  conditions: PointConditions | null;
  weather: WeatherReading | null;
  sun: SunOnSlope | null;
  loading: boolean;
  error: string | null;
  hourOffset: number;
  onHourOffsetChange: (h: number) => void;
}

function SunTimeline({ sun }: { sun: SunOnSlope }) {
  return (
    <div className="sun-timeline">
      <div className="sun-timeline-title">Sun on this slope through the day</div>
      <div className="sun-timeline-bars">
        {sun.timeline.map((cell) => (
          <div
            key={cell.hour}
            className={`sun-cell ${cell.lit ? "lit" : cell.daylight ? "shade" : "night"}`}
            title={`${cell.hour.toString().padStart(2, "0")}:00 — ${cell.lit ? "in sun" : cell.daylight ? "in shade" : "night"}`}
          />
        ))}
      </div>
      <div className="sun-timeline-scale">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <div className="sun-timeline-legend">
        <span>
          <i className="lit" /> in sun
        </span>
        <span>
          <i className="shade" /> shade (daylight)
        </span>
        <span>
          <i className="night" /> night
        </span>
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <div className="signal-row">
      <div className="signal-top">
        <span className="signal-label">{signal.label}</span>
        <span className={`prov-badge prov-${signal.provenance}`}>{PROVENANCE_LABEL[signal.provenance]}</span>
      </div>
      <div className="signal-value">
        {signal.link ? (
          <a href={signal.link} target="_blank" rel="noopener noreferrer">
            {signal.value} ↗
          </a>
        ) : (
          signal.value
        )}
      </div>
      {signal.meaning && <div className="signal-meaning">{signal.meaning}</div>}
      {signal.note && <div className="signal-note">"{signal.note}"</div>}
      <div className="signal-fresh">{signal.freshness}</div>
    </div>
  );
}

export function WaypointDetail({
  point,
  isSample,
  order,
  totalWaypoints,
  conditions,
  weather,
  sun,
  loading,
  error,
  hourOffset,
  onHourOffsetChange,
}: WaypointDetailProps) {
  const [tab, setTab] = useState<"conditions" | "report">("conditions");
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

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

  const facts = conditions?.signals.filter((s) => s.kind !== "observation") ?? [];
  const observations = conditions?.signals.filter((s) => s.kind === "observation") ?? [];

  return (
    <div>
      <p className="waypoint-subtitle">
        {isSample && order && totalWaypoints
          ? `Waypoint ${order} of ${totalWaypoints}`
          : `Dropped point · ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}
      </p>
      <h2 className="waypoint-title">{point.name}</h2>

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
          Add observation
        </button>
      </div>
      <p className="tab-swipe-hint">← swipe to switch →</p>

      <div className="tab-swipe" onPointerDown={onSwipeDown} onPointerUp={onSwipeUp}>
        {tab === "report" ? (
          <ReportForm waypointId={point.id} />
        ) : error ? (
          <p className="why-text">Couldn't load conditions: {error}</p>
        ) : !conditions || !weather ? (
          <p className="why-text">{loading ? "Loading live conditions…" : "No conditions available."}</p>
        ) : (
          <>
            <div className="status-row">
              <StatusBadge severity={conditions.conditionsSeverity} />
            </div>
            <p className="verdict-disclaimer">
              Current weather + avalanche severity — <strong>not</strong> a go/no-go or safety verdict. Every fact below
              is labeled with where it came from; you make the call.
            </p>

            <div className="time-control">
              <span className="time-control-label">Project sun to:</span>
              {HOUR_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className={`time-chip${hourOffset === o.value ? " active" : ""}`}
                  onClick={() => onHourOffsetChange(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {sun && <SunTimeline sun={sun} />}

            <div className="signals-section-title">Conditions &amp; terrain</div>
            <div className="signals-list">
              {facts.map((s, i) => (
                <SignalRow key={`${s.kind}-${i}`} signal={s} />
              ))}
            </div>

            <div className="signals-section-title">
              Reported observations {observations.length > 0 ? `(${observations.length})` : ""}
            </div>
            {observations.length > 0 ? (
              <div className="signals-list">
                {observations.map((s, i) => (
                  <SignalRow key={`obs-${i}`} signal={s} />
                ))}
              </div>
            ) : (
              <p className="signal-empty">No fresh crowd or ranger observations at this point.</p>
            )}

            <div className="sources-footer">
              <span className="sources-footer-label">Data sources:</span>
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                Open-Meteo
              </a>
              <a href={SLF_WEBSITE_URL} target="_blank" rel="noopener noreferrer">
                SLF avalanche
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
