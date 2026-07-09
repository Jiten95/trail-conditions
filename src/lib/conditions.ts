import type {
  ConditionsSeverity,
  CrowdReport,
  GeoPoint,
  HazardType,
  PointConditions,
  RangerAdvisory,
  Severity,
  Signal,
  WeatherReading,
} from "../types";
import type { TerrainInfo } from "./terrain";
import type { SunOnSlope } from "./sun";
import type { FreezeThawInfo, WindLoadingInfo } from "./derivations";
import type { AvalancheRiskLevel } from "./avalancheRisk";
import { getDaylightInfo } from "./daylight";

/**
 * The conditions engine. Pure functions only — no fetching, no state — so the
 * core logic is unit-testable and auditable independent of the UI.
 *
 * This does NOT produce a go/no-go verdict or a blended confidence score. It
 * assembles the independent facts (weather, terrain, sun, freeze-thaw, wind
 * loading, avalanche, human observations), each tagged with its provenance and
 * freshness, and leaves the judgement to the user. The only synthesized value
 * is `conditionsSeverity`, which describes the current weather/avalanche state
 * for the map marker and is explicitly not a safety verdict.
 */

export const TYPE_LABEL: Record<HazardType, string> = {
  flooding: "flooding",
  rockfall: "rockfall",
  ice: "ice",
  "trail-blocked": "trail blocked",
  wildlife: "wildlife",
  "high-wind": "high wind",
  lightning: "lightning",
  other: "other hazard",
};

const SEVERITY_LABEL: Record<Severity, string> = { low: "low", medium: "medium", high: "high" };

/**
 * Reported observations age out of relevance: fresh under 6h, recent 6-24h,
 * aging 24-72h, and dropped past 72h. (Live model and computed facts don't
 * age — they're recomputed on every load.)
 */
export function reportFreshness(ageHours: number): { label: string; expired: boolean } {
  const age = Math.max(0, ageHours);
  if (age >= 72) return { label: `${Math.round(age)}h ago — expired`, expired: true };
  const tier = age < 6 ? "fresh" : age < 24 ? "recent" : "aging";
  return { label: `${Math.round(age)}h ago (${tier})`, expired: false };
}

export function ageInHours(timestamp: string, now: Date): number {
  return (now.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
}

/** Maps a live weather reading onto a 0-3 conditions scale (not a verdict). */
export function weatherHazardLevel(w: WeatherReading): number {
  const precipLevel = w.precipitationMmHr < 1 ? 0 : w.precipitationMmHr < 4 ? 1 : w.precipitationMmHr < 8 ? 2 : 3;
  const effectiveWind = Math.max(w.windSpeedKph, w.windGustsKph);
  const windLevel = effectiveWind < 30 ? 0 : effectiveWind < 50 ? 1 : effectiveWind < 70 ? 2 : 3;
  const iceBump = w.temperatureC <= 1 && w.precipitationMmHr > 0 ? 1 : 0;
  return Math.min(3, Math.max(precipLevel, windLevel) + iceBump);
}

function levelToSeverity(level: number): ConditionsSeverity {
  if (level >= 2) return "severe";
  if (level >= 1) return "elevated";
  return "calm";
}

const SEVERITY_RANK: Record<ConditionsSeverity, number> = { unknown: -1, calm: 0, elevated: 1, severe: 2 };

function worse(a: ConditionsSeverity, b: ConditionsSeverity): ConditionsSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function avalancheSeverity(level: AvalancheRiskLevel): ConditionsSeverity {
  switch (level) {
    case "low":
      return "calm";
    case "moderate":
      return "elevated";
    case "considerable":
    case "high":
    case "very-high":
      return "severe";
    default:
      return "unknown";
  }
}

function windSeverity(w: WeatherReading): ConditionsSeverity {
  const effectiveWind = Math.max(w.windSpeedKph, w.windGustsKph);
  if (effectiveWind >= 50) return "severe";
  if (effectiveWind >= 30) return "elevated";
  return "calm";
}

function weatherDescription(w: WeatherReading): string {
  const parts: string[] = [];
  if (w.snowfallCm >= 0.1) parts.push(`${w.snowfallCm.toFixed(1)}cm/h snowfall`);
  else if (w.precipitationMmHr >= 0.1) parts.push(`${w.precipitationMmHr.toFixed(1)}mm/h precipitation`);
  if (w.temperatureC <= 1) parts.push(`${w.temperatureC.toFixed(0)}°C`);
  if (parts.length === 0) return `${w.temperatureC.toFixed(0)}°C, no significant precipitation`;
  return `${w.temperatureC.toFixed(0)}°C, ${parts.join(", ")}`;
}

function openMeteoLink(point: GeoPoint): string {
  return `https://open-meteo.com/en/docs#latitude=${point.lat}&longitude=${point.lng}`;
}

export interface AssembleInputs {
  point: GeoPoint;
  weather: WeatherReading;
  terrain?: TerrainInfo | null;
  sun?: SunOnSlope | null;
  freezeThaw?: FreezeThawInfo | null;
  windLoading?: WindLoadingInfo | null;
  avalanche?: { level: AvalancheRiskLevel; isOfficial: boolean; reason: string; regionName?: string | null } | null;
  crowdReports?: CrowdReport[];
  rangerAdvisories?: RangerAdvisory[];
  now?: Date;
}

export function assembleConditions(inputs: AssembleInputs): PointConditions {
  const {
    point,
    weather,
    terrain = null,
    sun = null,
    freezeThaw = null,
    windLoading = null,
    avalanche = null,
    crowdReports = [],
    rangerAdvisories = [],
    now = new Date(),
  } = inputs;

  const signals: Signal[] = [];
  const weatherFresh = "live model";

  const weatherSev = levelToSeverity(weatherHazardLevel(weather));
  signals.push({
    kind: "weather",
    label: "Weather",
    value: weatherDescription(weather),
    provenance: "modeled",
    observedAt: weather.fetchedAt,
    freshness: weatherFresh,
    link: openMeteoLink(point),
    severityHint: weatherSev,
  });

  const windGustNote = weather.windGustsKph > weather.windSpeedKph + 5 ? `, gusts ${weather.windGustsKph.toFixed(0)}` : "";
  signals.push({
    kind: "wind",
    label: "Wind",
    value: `${weather.windSpeedKph.toFixed(0)} kph${windGustNote} from ${directionLabel(weather.windDirectionDeg)}`,
    provenance: "modeled",
    observedAt: weather.fetchedAt,
    freshness: weatherFresh,
    meaning: "Gusts are what knock people off exposed ridges; direction drives where snow loads.",
    severityHint: windSeverity(weather),
  });

  let avalancheSev: ConditionsSeverity = "unknown";
  if (avalanche && avalanche.level !== "unavailable") {
    avalancheSev = avalancheSeverity(avalanche.level);
    signals.push({
      kind: "avalanche",
      label: "Avalanche danger",
      value: avalanche.level.replace("-", " "),
      provenance: avalanche.isOfficial ? "official" : "modeled",
      observedAt: weather.fetchedAt,
      freshness: avalanche.isOfficial ? "official SLF bulletin" : "heuristic from live weather",
      meaning: avalanche.isOfficial
        ? `Official SLF danger level${avalanche.regionName ? ` (${avalanche.regionName})` : ""}.`
        : "Simplified estimate from snow/wind/temperature — not an official bulletin.",
    });
  }

  if (terrain) {
    const inBand = terrain.slopeDeg >= 30 && terrain.slopeDeg <= 45;
    signals.push({
      kind: "slope",
      label: "Slope angle",
      value: `${terrain.slopeDeg.toFixed(0)}°`,
      provenance: "computed",
      observedAt: null,
      freshness: "computed from DEM",
      meaning: inBand
        ? "30-45° is the band where slab avalanches most commonly release."
        : "Steepness of the terrain at this point.",
    });
    signals.push({
      kind: "aspect",
      label: "Aspect",
      value: terrain.aspectDeg === null ? "flat" : `${terrain.aspectCompass} (${terrain.aspectDeg.toFixed(0)}°)`,
      provenance: "computed",
      observedAt: null,
      freshness: "computed from DEM",
      meaning: "The compass direction the slope faces — drives sun exposure and wind loading.",
    });
  }

  if (sun) {
    const value = sun.litNow
      ? `In sun now · ~${sun.sunHoursOnSlope}h direct sun today`
      : sun.firstLitLabel
        ? `In shade — first sun ${sun.firstLitLabel} · ~${sun.sunHoursOnSlope}h direct sun today`
        : `In shade all day`;
    signals.push({
      kind: "sun",
      label: "Sun on slope",
      value,
      provenance: "computed",
      observedAt: null,
      freshness: "computed (solar geometry)",
      meaning: "Shaded aspects hold overnight verglas and firm snow far longer into the day.",
    });
  }

  if (freezeThaw) {
    const state = freezeThaw.currentlyBelowZero ? "below 0°C now" : "above 0°C now";
    signals.push({
      kind: "freeze-thaw",
      label: "Freeze-thaw",
      value: `${freezeThaw.crossings} crossing${freezeThaw.crossings === 1 ? "" : "s"} of 0°C in ~${freezeThaw.windowHours}h (${freezeThaw.minC.toFixed(0)} to ${freezeThaw.maxC.toFixed(0)}°C); ${state}`,
      provenance: "modeled",
      observedAt: weather.fetchedAt,
      freshness: "from modeled hourly temps",
      meaning: "Repeated freeze-thaw loosens rock (ice-wedging) and weakens spring snow.",
    });
  }

  if (windLoading && windLoading.transporting) {
    const own = windLoading.thisSlopeLoaded === true ? " — including this slope" : "";
    signals.push({
      kind: "wind-loading",
      label: "Wind loading",
      value: `Wind from ${windLoading.fromCompass} loading ${windLoading.loadedAspectCompass}-facing lee slopes${own}`,
      provenance: "modeled",
      observedAt: weather.fetchedAt,
      freshness: "from modeled wind",
      meaning: "Wind-transported snow builds slabs on lee slopes.",
    });
  }

  const daylight = getDaylightInfo(weather.sunrise, weather.sunset, weather.localTime);
  if (daylight.phase !== "unknown") {
    signals.push({
      kind: "daylight",
      label: "Daylight",
      value: daylight.summary,
      provenance: "modeled",
      observedAt: weather.fetchedAt,
      freshness: "live model",
      meaning: "Running out of daylight on exposed terrain is a hazard in itself.",
    });
  }

  const observations: (CrowdReport | RangerAdvisory)[] = [
    ...rangerAdvisories.filter((r) => r.waypointId === point.id),
    ...crowdReports.filter((r) => r.waypointId === point.id),
  ];
  for (const obs of observations) {
    const isRanger = obs.source === "ranger";
    const timestamp = isRanger ? (obs as RangerAdvisory).issuedAt : (obs as CrowdReport).timestamp;
    const age = ageInHours(timestamp, now);
    const fresh = reportFreshness(age);
    if (fresh.expired) continue;
    signals.push({
      kind: "observation",
      label: isRanger ? "Ranger advisory" : "Crowd observation",
      value: `${TYPE_LABEL[obs.type]} (${SEVERITY_LABEL[obs.severity]})`,
      provenance: "reported",
      observedAt: timestamp,
      freshness: fresh.label,
      note: isRanger ? (obs as RangerAdvisory).message : (obs as CrowdReport).note,
    });
  }

  const conditionsSeverity = worse(worse(weatherSev, windSeverity(weather)), avalancheSev);

  return { pointId: point.id, conditionsSeverity, signals };
}

/** Marker severity from just weather (+ optional avalanche), without the full assembly. */
export function conditionsSeverityFor(weather: WeatherReading, avalancheLevel?: AvalancheRiskLevel): ConditionsSeverity {
  const weatherSev = levelToSeverity(weatherHazardLevel(weather));
  const av = avalancheLevel ? avalancheSeverity(avalancheLevel) : "unknown";
  return SEVERITY_RANK[av] > SEVERITY_RANK[weatherSev] ? av : weatherSev;
}

const DIRECTIONS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
function directionLabel(deg: number): string {
  return DIRECTIONS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}
