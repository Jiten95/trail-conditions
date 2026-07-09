import type { WeatherReading } from "../types";

export type AvalancheRiskLevel = "low" | "moderate" | "high" | "unavailable";

export interface AvalancheRiskEstimate {
  level: AvalancheRiskLevel;
  reason: string;
}

/**
 * A simplified, transparent heuristic derived from live Open-Meteo data
 * (recent snow loading, wind transport, freeze-thaw instability) — this is
 * NOT an official avalanche bulletin and does not consult avalanche.org or
 * any real avalanche center (that integration is explicitly out of scope,
 * see README). It exists to turn genuinely live snow/wind/temperature data
 * into a rough, clearly-labeled estimate rather than nothing at all.
 */
export function estimateAvalancheRisk(w: WeatherReading): AvalancheRiskEstimate {
  if (!Number.isFinite(w.recentSnowfallCm) || !Number.isFinite(w.windGustsKph) || !Number.isFinite(w.temperatureC)) {
    return { level: "unavailable", reason: "Not enough recent snow/wind data to estimate." };
  }

  const freshSnow = w.recentSnowfallCm;
  const windLoaded = w.windGustsKph >= 40;
  const freezeThaw = w.temperatureC >= -2 && w.temperatureC <= 3;

  if (freshSnow >= 15 && windLoaded) {
    return {
      level: "high",
      reason: `${freshSnow.toFixed(0)}cm of recent snowfall with gusts to ${w.windGustsKph.toFixed(0)}kph — significant wind-slab loading.`,
    };
  }
  if (freshSnow >= 5 || (freshSnow > 0 && (windLoaded || freezeThaw))) {
    const cause = windLoaded ? "wind loading" : freezeThaw ? "freeze-thaw cycling" : "recent snow accumulation";
    return { level: "moderate", reason: `${freshSnow.toFixed(0)}cm recent snowfall with ${cause}.` };
  }
  return {
    level: "low",
    reason:
      freshSnow > 0
        ? `${freshSnow.toFixed(1)}cm recent snowfall, no wind loading or freeze-thaw signal.`
        : "No recent snowfall or significant wind loading detected.",
  };
}
