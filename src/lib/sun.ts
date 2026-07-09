/**
 * Deterministic solar geometry — pure astronomy, no network, no model. Used to
 * state a factual "is this slope in the sun right now / when does it catch
 * sun today," which is the single biggest driver of whether shaded alpine
 * terrain holds overnight verglas and firm snow. We report the geometry as a
 * fact; we never predict the ice itself (that would be Tier C).
 */

const RAD = Math.PI / 180;

export interface SolarPosition {
  elevationDeg: number; // angle above the horizon; <= 0 means below the horizon
  azimuthDeg: number; // 0-360 clockwise from north
}

/** Sun elevation + azimuth for a UTC instant at a location. */
export function solarPosition(dateUtc: Date, lat: number, lng: number): SolarPosition {
  const jd = dateUtc.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0; // days since J2000.0

  const meanLng = (280.46 + 0.9856474 * n) % 360;
  const meanAnom = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const eclLng = (meanLng + 1.915 * Math.sin(meanAnom) + 0.02 * Math.sin(2 * meanAnom)) * RAD;
  const obliquity = (23.439 - 0.0000004 * n) * RAD;

  const dec = Math.asin(Math.sin(obliquity) * Math.sin(eclLng));
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(eclLng), Math.cos(eclLng));

  let gmst = (280.46061837 + 360.98564736629 * n) % 360;
  if (gmst < 0) gmst += 360;
  const lstRad = ((gmst + lng) % 360) * RAD;

  let ha = lstRad - ra;
  ha = Math.atan2(Math.sin(ha), Math.cos(ha)); // normalize to [-pi, pi]

  const latR = lat * RAD;
  const sinAlt = Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz = (Math.sin(dec) - Math.sin(latR) * sinAlt) / (Math.cos(latR) * Math.cos(alt));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az; // afternoon: sun in the west

  return { elevationDeg: alt / RAD, azimuthDeg: (az / RAD + 360) % 360 };
}

/**
 * Is a slope of the given angle/aspect illuminated by the sun at this position?
 * A flat slope (aspectDeg null) is lit whenever the sun is above the horizon.
 */
export function isSlopeLit(slopeDeg: number, aspectDeg: number | null, sun: SolarPosition): boolean {
  if (sun.elevationDeg <= 0) return false;
  if (aspectDeg === null || slopeDeg < 1) return true;
  const s = slopeDeg * RAD;
  const el = sun.elevationDeg * RAD;
  const cosIncidence =
    Math.cos(s) * Math.sin(el) + Math.sin(s) * Math.cos(el) * Math.cos((sun.azimuthDeg - aspectDeg) * RAD);
  return cosIncidence > 0;
}

/** Convert a waypoint-local naive wall-clock ("YYYY-MM-DDThh:mm") to a UTC instant. */
export function localNaiveToUtc(naive: string, utcOffsetSeconds: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(naive);
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return new Date(asUtc - utcOffsetSeconds * 1000);
}

export interface SunOnSlope {
  litNow: boolean;
  solarElevationDeg: number;
  solarAzimuthDeg: number;
  sunHoursOnSlope: number; // whole daylight hours today the slope is in direct sun
  firstLitLabel: string | null; // "~10:00" when the slope first catches sun today
  timeline: { hour: number; lit: boolean; daylight: boolean }[];
}

/**
 * Sun-on-slope facts for the local day of `referenceLocalIso`. `litNow` is
 * evaluated at the reference time (which the UI can shift to project later in
 * the day); the timeline and hour counts span the whole local day.
 */
export function computeSunOnSlope(
  slopeDeg: number,
  aspectDeg: number | null,
  lat: number,
  lng: number,
  referenceLocalIso: string,
  utcOffsetSeconds: number,
): SunOnSlope | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(referenceLocalIso);
  if (!dateMatch) return null;
  const datePart = dateMatch[0];

  const refUtc = localNaiveToUtc(referenceLocalIso, utcOffsetSeconds);
  if (!refUtc) return null;
  const refSun = solarPosition(refUtc, lat, lng);
  const litNow = isSlopeLit(slopeDeg, aspectDeg, refSun);

  const timeline: { hour: number; lit: boolean; daylight: boolean }[] = [];
  let sunHours = 0;
  let firstLitHour: number | null = null;
  for (let hour = 0; hour < 24; hour++) {
    const hh = hour.toString().padStart(2, "0");
    const utc = localNaiveToUtc(`${datePart}T${hh}:30`, utcOffsetSeconds);
    if (!utc) continue;
    const sun = solarPosition(utc, lat, lng);
    const daylight = sun.elevationDeg > 0;
    const lit = isSlopeLit(slopeDeg, aspectDeg, sun);
    if (lit) {
      sunHours++;
      if (firstLitHour === null) firstLitHour = hour;
    }
    timeline.push({ hour, lit, daylight });
  }

  return {
    litNow,
    solarElevationDeg: refSun.elevationDeg,
    solarAzimuthDeg: refSun.azimuthDeg,
    sunHoursOnSlope: sunHours,
    firstLitLabel: firstLitHour === null ? null : `~${firstLitHour.toString().padStart(2, "0")}:00`,
    timeline,
  };
}
