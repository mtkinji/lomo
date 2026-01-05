type GeocodedPlace = {
  label: string;
  latitude: number;
  longitude: number;
};

/**
 * Best-effort geocoding using Nominatim.
 *
 * Notes:
 * - This is intentionally lightweight (no API keys).
 * - Results are best-effort; callers should gracefully handle null.
 */
export async function geocodePlaceBestEffort(params: {
  query: string;
  signal?: AbortSignal;
}): Promise<GeocodedPlace | null> {
  const q = params.query.trim();
  if (!q) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, {
      signal: params.signal,
      headers: {
        Accept: 'application/json',
        // Nominatim usage policy requests a UA identifying the application.
        // This is best-effort; some platforms may ignore it.
        'User-Agent': 'Kwilt/1.0 (ai geocode)',
      },
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as unknown;
    const first = Array.isArray(json) ? json[0] : null;
    if (!first || typeof first !== 'object') return null;

    const lat = Number.parseFloat(String((first as any).lat ?? ''));
    const lon = Number.parseFloat(String((first as any).lon ?? ''));
    const label = String((first as any).display_name ?? '').trim();
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !label) return null;
    return { label, latitude: lat, longitude: lon };
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    return null;
  }
}


