import type {
  CrowdReport,
  HazardType,
  RangerAdvisory,
  ReconciledStatus,
  ReconciledWaypoint,
  Severity,
  SourceContribution,
  WeatherReading,
} from "../types";

/**
 * The reconciliation engine. Pure functions only — no fetching, no state —
 * so the core logic is unit-testable and auditable independent of the UI.
 */

// ---- Confidence weights (before decay) ----------------------------------
export const BASE_WEIGHT = {
  weather: 1.0, // live, always current — never decays
  ranger: 0.9, // higher trust than an anonymous crowd report
  crowd: 0.6,
} as const;

// Roughly "all three sources present, fresh, and agreeing."
const MAX_EXPECTED_WEIGHT = BASE_WEIGHT.weather + BASE_WEIGHT.ranger + BASE_WEIGHT.crowd;

// Hazard types whose presence/absence weather can actually corroborate or
// contradict. A rockfall or wildlife report has nothing to do with rain or
// wind, so it should never be flagged as "conflicting" with the weather feed.
const WEATHER_CORRELATED_TYPES = new Set<HazardType>(["flooding", "ice", "high-wind", "lightning"]);

const SEVERITY_LEVEL: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

const TYPE_LABEL: Record<HazardType, string> = {
  flooding: "flooding",
  rockfall: "rockfall",
  ice: "ice",
  "trail-blocked": "trail blocked",
  wildlife: "wildlife",
  "high-wind": "high wind",
  lightning: "lightning",
  other: "other hazard",
};

/**
 * Decay tiers for crowd/ranger reports: full weight under 6h, half from
 * 6-24h, low from 24-72h, and fully expired (excluded) past 72h. Live
 * weather never decays — it's re-fetched on every load.
 */
export function decayFactor(ageHours: number): number {
  const age = Math.max(0, ageHours);
  if (age < 6) return 1;
  if (age < 24) return 0.5;
  if (age < 72) return 0.2;
  return 0;
}

export function ageInHours(timestamp: string, now: Date): number {
  return (now.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
}

/** Maps a live weather reading onto the same 0-3 hazard scale as reports. */
export function weatherHazardLevel(w: WeatherReading): number {
  const precipLevel = w.precipitationMmHr < 1 ? 0 : w.precipitationMmHr < 4 ? 1 : w.precipitationMmHr < 8 ? 2 : 3;
  const windLevel = w.windSpeedKph < 30 ? 0 : w.windSpeedKph < 50 ? 1 : w.windSpeedKph < 70 ? 2 : 3;
  const iceBump = w.temperatureC <= 1 && w.precipitationMmHr > 0 ? 1 : 0;
  return Math.min(3, Math.max(precipLevel, windLevel) + iceBump);
}

function weatherDescription(w: WeatherReading): string {
  const parts: string[] = [];
  if (w.precipitationMmHr >= 0.5) parts.push(`${w.precipitationMmHr.toFixed(1)}mm/h precipitation`);
  if (w.windSpeedKph >= 20) parts.push(`${w.windSpeedKph.toFixed(0)}kph wind`);
  if (w.temperatureC <= 1) parts.push(`${w.temperatureC.toFixed(0)}°C`);
  if (parts.length === 0) return `${w.temperatureC.toFixed(0)}°C, no significant precipitation or wind`;
  return parts.join(" + ");
}

function reportContribution(
  report: CrowdReport | RangerAdvisory,
  now: Date,
): SourceContribution {
  const isRanger = report.source === "ranger";
  const timestamp = isRanger ? (report as RangerAdvisory).issuedAt : (report as CrowdReport).timestamp;
  const age = ageInHours(timestamp, now);
  const decay = decayFactor(age);
  const baseWeight = isRanger ? BASE_WEIGHT.ranger : BASE_WEIGHT.crowd;
  const label = isRanger ? "Ranger advisory" : "Crowd report";
  const expiredNote = decay === 0 ? " — expired, excluded from score" : "";
  return {
    source: isRanger ? "ranger" : "crowd",
    label,
    detail: `${TYPE_LABEL[report.type]} (${report.severity}), ${Math.round(age)}h ago${expiredNote}`,
    hazardLevel: SEVERITY_LEVEL[report.severity],
    baseWeight,
    decayFactor: decay,
    effectiveWeight: baseWeight * decay,
    ageHours: age,
  };
}

function weightedAverage(items: { hazardLevel: number; effectiveWeight: number }[]): number {
  const totalWeight = items.reduce((sum, i) => sum + i.effectiveWeight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((sum, i) => sum + i.hazardLevel * i.effectiveWeight, 0) / totalWeight;
}

export function reconcileWaypoint(
  waypointId: string,
  weather: WeatherReading,
  crowdReports: CrowdReport[],
  rangerAdvisories: RangerAdvisory[],
  now: Date = new Date(),
): ReconciledWaypoint {
  const weatherLevel = weatherHazardLevel(weather);
  const weatherContribution: SourceContribution = {
    source: "weather",
    label: "Open-Meteo (live)",
    detail: weatherDescription(weather),
    hazardLevel: weatherLevel,
    baseWeight: BASE_WEIGHT.weather,
    decayFactor: 1,
    effectiveWeight: BASE_WEIGHT.weather,
  };

  const waypointReports: (CrowdReport | RangerAdvisory)[] = [
    ...crowdReports.filter((r) => r.waypointId === waypointId),
    ...rangerAdvisories.filter((r) => r.waypointId === waypointId),
  ];
  const reportContributions = waypointReports.map((r) => reportContribution(r, now));

  const activePairs = waypointReports
    .map((report, i) => ({ report, contribution: reportContributions[i] }))
    .filter((p) => p.contribution.effectiveWeight > 0);

  const active = activePairs.map((p) => p.contribution);
  const weatherRelated = activePairs.filter((p) => WEATHER_CORRELATED_TYPES.has(p.report.type)).map((p) => p.contribution);
  const independent = activePairs.filter((p) => !WEATHER_CORRELATED_TYPES.has(p.report.type)).map((p) => p.contribution);

  const weatherRelatedWeight = weatherRelated.reduce((s, c) => s + c.effectiveWeight, 0);
  const weatherRelatedHazard = weightedAverage(weatherRelated);
  const independentWeight = independent.reduce((s, c) => s + c.effectiveWeight, 0);
  const independentHazard = weightedAverage(independent);

  const conflicting = weatherRelatedWeight >= 0.2 && Math.abs(weatherLevel - weatherRelatedHazard) >= 2;

  // Weather and weather-correlated reports (flooding/ice/wind/lightning) share
  // one axis, since they're describing the same phenomenon and can corroborate
  // or conflict. Independent hazards (rockfall, trail-blocked, wildlife...)
  // are a *separate* concern — a clear weather reading must never dilute a
  // fresh, serious rockfall report down toward "clear," so that axis is
  // combined with max(), not averaged in.
  const weatherAxisWeight = BASE_WEIGHT.weather + weatherRelatedWeight;
  const weatherAxisHazard = (weatherLevel * BASE_WEIGHT.weather + weatherRelatedHazard * weatherRelatedWeight) / weatherAxisWeight;
  const combinedHazard = independentWeight > 0 ? Math.max(weatherAxisHazard, independentHazard) : weatherAxisHazard;

  const totalWeight = BASE_WEIGHT.weather + weatherRelatedWeight + independentWeight;
  let confidence = Math.round(Math.min(100, (totalWeight / MAX_EXPECTED_WEIGHT) * 100));

  let status: ReconciledStatus;
  if (conflicting) {
    status = "unconfirmed";
    confidence = Math.min(confidence, 40);
  } else if (combinedHazard >= 2) {
    status = "hazard";
  } else if (combinedHazard >= 1) {
    status = "caution";
  } else {
    status = "clear";
  }

  const describe = (c: SourceContribution) => `1 ${c.label.toLowerCase()} (${c.detail.replace(/ — expired.*$/, "")})`;
  const otherDescriptions = active.map(describe);

  let why: string;
  if (conflicting) {
    const verdict = weatherRelatedHazard >= 2 ? "flags a hazard" : "reads as clear";
    why = `Unconfirmed — conflicting signals: Open-Meteo shows ${weatherDescription(weather)}, while ${weatherRelated
      .map(describe)
      .join(" and ")} ${verdict}.`;
  } else {
    const statusLabel = status === "clear" ? "Clear" : status === "caution" ? "Caution" : "Flagged hazard";
    const extra = otherDescriptions.length > 0 ? `, plus ${otherDescriptions.join(" and ")}` : ", no active crowd or ranger reports";
    why = `${statusLabel}: Open-Meteo shows ${weatherDescription(weather)}${extra} — combined hazard ${combinedHazard.toFixed(
      1,
    )}/3, confidence ${confidence}%.`;
  }

  return {
    waypointId,
    status,
    confidence,
    why,
    contributions: [weatherContribution, ...reportContributions],
    conflicting,
  };
}
