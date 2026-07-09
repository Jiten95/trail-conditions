import type { HourlySeries } from "../types";
import { compassFromDeg } from "./terrain";

/**
 * Tier-B derivations: deterministic facts computed from modeled weather. These
 * describe the physical setup (freeze-thaw history, where wind is loading
 * snow) that a mountaineer weighs — they are never a hazard verdict.
 */

export interface FreezeThawInfo {
  crossings: number; // times air temp crossed 0°C in the window
  currentlyBelowZero: boolean;
  minC: number;
  maxC: number;
  lastCrossLabel: string | null; // local time of the most recent 0°C crossing
  windowHours: number;
}

function hhmm(iso: string): string | null {
  const m = /T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] : null;
}

/**
 * Freeze-thaw over the trailing window up to `nowLocalIso`. Repeated crossings
 * of 0°C are the classic driver of rockfall (ice-wedging) and unstable spring
 * snow — we report the count and the current state as facts.
 */
export function freezeThaw(hourly: HourlySeries, nowLocalIso: string | null, maxWindow = 30): FreezeThawInfo | null {
  const { times, temperatureC } = hourly;
  if (!times.length || times.length !== temperatureC.length) return null;

  let upTo = times.length;
  if (nowLocalIso) {
    const idx = times.findIndex((t) => t > nowLocalIso);
    if (idx > 0) upTo = idx;
  }
  const start = Math.max(0, upTo - maxWindow);
  const temps = temperatureC.slice(start, upTo).filter((v) => Number.isFinite(v));
  const windowTimes = times.slice(start, upTo);
  if (temps.length < 2) return null;

  let crossings = 0;
  let lastCrossLabel: string | null = null;
  for (let i = 1; i < temps.length; i++) {
    const prevBelow = temps[i - 1] <= 0;
    const currBelow = temps[i] <= 0;
    if (prevBelow !== currBelow) {
      crossings++;
      lastCrossLabel = hhmm(windowTimes[i]) ?? lastCrossLabel;
    }
  }

  return {
    crossings,
    currentlyBelowZero: temps[temps.length - 1] <= 0,
    minC: Math.min(...temps),
    maxC: Math.max(...temps),
    lastCrossLabel,
    windowHours: temps.length - 1,
  };
}

export interface WindLoadingInfo {
  fromCompass: string; // direction the wind blows FROM
  loadedAspectCompass: string; // aspect of lee slopes collecting wind-transported snow
  transporting: boolean; // wind strong enough to move snow
  thisSlopeLoaded: boolean | null; // whether the point's own slope is a lee/loading aspect
}

const TRANSPORT_THRESHOLD_KPH = 25;

/**
 * Wind loading geometry. Wind blows FROM `windDirectionDeg`; it strips snow off
 * windward slopes and deposits it on lee slopes (which face downwind). If the
 * point's own slope faces roughly downwind, it is a loading aspect.
 */
export function windLoading(
  windDirectionDeg: number,
  windSpeedKph: number,
  slopeAspectDeg: number | null,
): WindLoadingInfo {
  const downwind = (windDirectionDeg + 180) % 360;
  let thisSlopeLoaded: boolean | null = null;
  if (slopeAspectDeg !== null) {
    const diff = Math.abs(((slopeAspectDeg - downwind + 540) % 360) - 180);
    thisSlopeLoaded = diff <= 60;
  }
  return {
    fromCompass: compassFromDeg(windDirectionDeg),
    loadedAspectCompass: compassFromDeg(downwind),
    transporting: windSpeedKph >= TRANSPORT_THRESHOLD_KPH,
    thisSlopeLoaded,
  };
}
