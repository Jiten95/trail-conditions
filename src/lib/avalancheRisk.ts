import type { WeatherReading } from "../types";

export type AvalancheRiskLevel = "low" | "moderate" | "high" | "unavailable";

export interface AvalancheRiskFactor {
  label: string;
  points: number;
}

export interface AvalancheRiskEstimate {
  level: AvalancheRiskLevel;
  score: number;
  factors: AvalancheRiskFactor[];
  reason: string;
}

/**
 * A transparent, point-based heuristic derived entirely from live Open-Meteo
 * data. It is NOT the official avalanche bulletin.
 *
 * The official product for this area is Météo-France's BERA (Bulletin
 * d'Estimation du Risque d'Avalanche) for the Mont-Blanc massif. We don't
 * consume it because it doesn't fit this app's constraints: it requires an
 * authenticated Météo-France API key (which can't be shipped safely in a
 * key-less client-only SPA), it isn't CORS-accessible from the browser
 * (needs a server-side proxy), and it's seasonal — issued only ~November to
 * ~May, so there is no bulletin at all in summer. See README for the full
 * live-vs-seeded breakdown.
 *
 * Instead we score the recognised weather-driven avalanche factors we *can*
 * observe live, and combine them:
 *   - new-snow load (the primary driver of storm-slab instability)
 *   - snow falling right now (active storm loading in progress)
 *   - wind transport building wind slabs on lee slopes (only counts when
 *     there is snow available to move)
 *   - rain-on-snow, which rapidly weakens and overloads the pack
 *   - thermal instability: freeze-thaw cycling and daytime warming that
 *     drive wet-snow releases
 * Each factor contributes points; the total maps to low/moderate/high. The
 * factor list is returned so the estimate stays auditable, not asserted.
 */
export function estimateAvalancheRisk(w: WeatherReading): AvalancheRiskEstimate {
  if (
    !Number.isFinite(w.recentSnowfallCm) ||
    !Number.isFinite(w.snowfallCm) ||
    !Number.isFinite(w.windGustsKph) ||
    !Number.isFinite(w.windSpeedKph) ||
    !Number.isFinite(w.temperatureC)
  ) {
    return {
      level: "unavailable",
      score: 0,
      factors: [],
      reason: "Not enough live snow/wind/temperature data to estimate.",
    };
  }

  const recentSnow = w.recentSnowfallCm;
  const snowAvailable = recentSnow > 0 || w.snowfallCm >= 1;
  const factors: AvalancheRiskFactor[] = [];

  if (recentSnow >= 30) factors.push({ label: `${recentSnow.toFixed(0)}cm new snow (major load)`, points: 4 });
  else if (recentSnow >= 15) factors.push({ label: `${recentSnow.toFixed(0)}cm new snow (heavy load)`, points: 3 });
  else if (recentSnow >= 5) factors.push({ label: `${recentSnow.toFixed(0)}cm new snow`, points: 2 });
  else if (recentSnow > 0) factors.push({ label: `${recentSnow.toFixed(1)}cm new snow (light)`, points: 1 });

  if (w.snowfallCm >= 1) factors.push({ label: "snow falling now (active loading)", points: 1 });

  if (snowAvailable) {
    const gusts = w.windGustsKph;
    const sustained = w.windSpeedKph;
    if (gusts >= 60 || sustained >= 40) {
      factors.push({ label: `strong wind loading (gusts ${gusts.toFixed(0)}kph)`, points: 2 });
    } else if (gusts >= 40 || sustained >= 25) {
      factors.push({ label: `wind loading (gusts ${gusts.toFixed(0)}kph)`, points: 1 });
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
  const reason =
    topFactors.length > 0
      ? `${capitalize(level)}: ${topFactors.join(", ")}.`
      : "Low: no recent snow, wind loading, or thaw signals driving instability.";

  return { level, score, factors, reason };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
