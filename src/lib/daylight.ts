/**
 * Daylight helpers — pure and timezone-safe. Open-Meteo returns sunrise,
 * sunset, and the current time all as *local* wall-clock strings for the
 * waypoint's own timezone ("YYYY-MM-DDThh:mm"), so we compare them as naive
 * local times without ever routing through the browser's timezone.
 */

export type DaylightPhase = "before-sunrise" | "daylight" | "after-sunset" | "unknown";

export interface DaylightInfo {
  sunriseLabel: string | null; // "05:52"
  sunsetLabel: string | null; // "21:23"
  phase: DaylightPhase;
  minutesToSunset: number | null; // only during daylight
  summary: string; // one-liner for the UI
}

/** Absolute minutes for ordering naive local timestamps (tz-agnostic). */
function toMinutes(iso: string | null): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000;
}

function hhmm(iso: string | null): string | null {
  if (!iso) return null;
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : null;
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getDaylightInfo(
  sunrise: string | null,
  sunset: string | null,
  localTime: string | null,
): DaylightInfo {
  const sunriseLabel = hhmm(sunrise);
  const sunsetLabel = hhmm(sunset);
  const riseM = toMinutes(sunrise);
  const setM = toMinutes(sunset);
  const nowM = toMinutes(localTime);

  if (riseM === null || setM === null || nowM === null) {
    return { sunriseLabel, sunsetLabel, phase: "unknown", minutesToSunset: null, summary: "Daylight times unavailable" };
  }

  if (nowM < riseM) {
    return {
      sunriseLabel,
      sunsetLabel,
      phase: "before-sunrise",
      minutesToSunset: null,
      summary: `Before sunrise — first light at ${sunriseLabel}`,
    };
  }

  if (nowM >= setM) {
    return {
      sunriseLabel,
      sunsetLabel,
      phase: "after-sunset",
      minutesToSunset: null,
      summary: `After sunset — it set at ${sunsetLabel}`,
    };
  }

  const minutesToSunset = setM - nowM;
  return {
    sunriseLabel,
    sunsetLabel,
    phase: "daylight",
    minutesToSunset,
    summary: `${formatDuration(minutesToSunset)} of daylight left (sunset ${sunsetLabel})`,
  };
}
