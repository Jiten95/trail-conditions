import type { WeatherReading } from "../types";

// Full EAWS 5-level scale so we can render an official SLF bulletin faithfully
// (see slfAvalanche.ts). The weather-derived heuristic below only ever emits
// low/moderate/high — the extra levels exist for the official source.
export type AvalancheRiskLevel = "low" | "moderate" | "considerable" | "high" | "very-high" | "unavailable";

export interface AvalancheRiskEstimate {
  level: AvalancheRiskLevel;
  reason: string;
}

/**
 * A transparent, point-based heuristic derived entirely from live Open-Meteo
 * data — used ONLY as a fallback when there is no live official SLF bulletin
 * (off-season, ~Jun–Oct, or fetch failure; see slfAvalanche.ts). It is NOT an
 * official avalanche bulletin and does not consult any real avalanche center.
 *
 * It scores the recognised weather-driven avalanche factors we can observe
 * live and combines them: new-snow load (the primary storm-slab driver), snow
 * falling now (active loading), wind transport building wind slabs (only when
 * there is snow available to move), rain-on-snow (rapidly weakens/overloads
 * the pack), and thermal instability (freeze-thaw / daytime warming). Each
 * factor contributes points; the total maps to low/moderate/high. Only the
 * three lower danger words are ever emitted — the "considerable"/"very-high"
 * levels of AvalancheRiskLevel are reserved for the official SLF source.
 */
export function estimateAvalancheRisk(w: WeatherReading): AvalancheRiskEstimate {
  if (
    !Number.isFinite(w.recentSnowfallCm) ||
    !Number.isFinite(w.snowfallCm) ||
    !Number.isFinite(w.windGustsKph) ||
    !Number.isFinite(w.windSpeedKph) ||
    !Number.isFinite(w.temperatureC)
  ) {
    return { level: "unavailable", reason: "Not enough live snow/wind/temperature data to estimate." };
  }

  const recentSnow = w.recentSnowfallCm;
  const snowAvailable = recentSnow > 0 || w.snowfallCm >= 1;
  const factors: { label: string; points: number }[] = [];

  if (recentSnow >= 30) factors.push({ label: `${recentSnow.toFixed(0)}cm new snow (major load)`, points: 4 });
  else if (recentSnow >= 15) factors.push({ label: `${recentSnow.toFixed(0)}cm new snow (heavy load)`, points: 3 });
  else if (recentSnow >= 5) factors.push({ label: `${recentSnow.toFixed(0)}cm new snow`, points: 2 });
  else if (recentSnow > 0) factors.push({ label: `${recentSnow.toFixed(1)}cm new snow (light)`, points: 1 });

  if (w.snowfallCm >= 1) factors.push({ label: "snow falling now (active loading)", points: 1 });

  if (snowAvailable) {
    if (w.windGustsKph >= 60 || w.windSpeedKph >= 40) {
      factors.push({ label: `strong wind loading (gusts ${w.windGustsKph.toFixed(0)}kph)`, points: 2 });
    } else if (w.windGustsKph >= 40 || w.windSpeedKph >= 25) {
      factors.push({ label: `wind loading (gusts ${w.windGustsKph.toFixed(0)}kph)`, points: 1 });
    }
  }

  if (recentSnow > 0 && w.rainMmHr >= 0.5 && w.temperatureC > 0) {
    factors.push({ label: `rain on snow (${w.rainMmHr.toFixed(1)}mm/h)`, points: 2 });
  }

  if (recentSnow > 0) {
    if (w.temperatureC > 3) factors.push({ label: `daytime warming (${w.temperatureC.toFixed(0)}°C, wet-snow risk)`, points: 1 });
    else if (w.temperatureC >= -2) factors.push({ label: `freeze-thaw cycling near ${w.temperatureC.toFixed(0)}°C`, points: 1 });
  }

  const score = factors.reduce((sum, f) => sum + f.points, 0);
  const level: AvalancheRiskLevel = score >= 4 ? "high" : score >= 2 ? "moderate" : "low";
  const topFactors = [...factors].sort((a, b) => b.points - a.points).map((f) => f.label);
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  const reason =
    topFactors.length > 0
      ? `${label}: ${topFactors.join(", ")}.`
      : "Low: no recent snow, wind loading, or thaw signals driving instability.";

  return { level, reason };
}
