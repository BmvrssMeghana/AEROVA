/**
 * Open-Meteo External Weather API Integration Service
 * Fetches ambient meteorological readings without requiring proprietary API keys.
 * Includes graceful offline fallback and AbortController timeout handling.
 */

export const SITE_PRESETS = {
  londonUrban: {
    id: 'londonUrban',
    name: 'London Urban Redevelopment',
    lat: 51.5074,
    lng: -0.1278,
    ambientBaselinePm10: 18,
    defaultWindSpeed: 15,
    defaultWindDir: 225
  },
  industrialEast: {
    id: 'industrialEast',
    name: 'Thames Gateway Industrial',
    lat: 51.4883,
    lng: 0.3125,
    ambientBaselinePm10: 24,
    defaultWindSpeed: 18,
    defaultWindDir: 90
  },
  birminghamMidlands: {
    id: 'birminghamMidlands',
    name: 'Midlands Infrastructure Corridor',
    lat: 52.4862,
    lng: -1.8904,
    ambientBaselinePm10: 20,
    defaultWindSpeed: 12,
    defaultWindDir: 180
  }
};

export function degToCompass(degrees) {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const val = Math.floor((degrees / 22.5) + 0.5);
  return cardinals[val % 16];
}

/**
 * Fetch real-time environmental data for the site coordinates
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {Promise<Object>} Weather payload
 */
export async function fetchSiteWeather(lat = 51.5074, lng = -0.1278) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`;
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Open-Meteo responded with status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;

    const windDir = Math.round(current.wind_direction_10m || 0);
    return {
      source: 'Open-Meteo API (Live)',
      isLive: true,
      temperature_c: Math.round(current.temperature_2m * 10) / 10,
      humidity_pct: Math.round(current.relative_humidity_2m),
      wind_speed_kmh: Math.round(current.wind_speed_10m * 10) / 10,
      wind_dir_deg: windDir,
      wind_dir_cardinal: degToCompass(windDir),
      updated_at: new Date().toISOString()
    };
  } catch (err) {
    // Graceful offline fallback
    return {
      source: 'Meteorological Baseline (Offline)',
      isLive: false,
      temperature_c: 19.5,
      humidity_pct: 62,
      wind_speed_kmh: 14.0,
      wind_dir_deg: 225,
      wind_dir_cardinal: 'SW',
      updated_at: new Date().toISOString(),
      fallback_reason: err.name === 'AbortError' ? 'Request timed out' : err.message
    };
  }
}
