export type MapCoordinates = { latitude: number; longitude: number };

export function normalizeGoogleMapsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const allowedHost = host === 'google.com' || host.endsWith('.google.com') || host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps'));
    if (url.protocol !== 'https:' || !allowedHost) return null;
    return url.toString();
  } catch { return null; }
}

export function extractGoogleMapsCoordinates(value: unknown): MapCoordinates | null {
  const safeUrl = normalizeGoogleMapsUrl(value);
  if (!safeUrl) return null;
  let decoded = safeUrl;
  try { decoded = decodeURIComponent(safeUrl); } catch { /* use original URL */ }
  const patterns = [
    /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
    /[?&](?:q|query|destination|center)=(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/i,
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]); const longitude = Number(match[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) return { latitude, longitude };
  }
  return null;
}

export function googleMapsDirectionsUrl(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
