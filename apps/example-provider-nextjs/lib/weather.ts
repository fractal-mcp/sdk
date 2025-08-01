import type { Json, NWSPoint, NWSForecast, NWSHourlyForecast, NWSForecastPeriod, NWSHourlyForecastPeriod, NWSCurrentObs } from "./types";
// Requires Node ≥18 for global fetch. 4-space tabs, camelCase.
const BASE = "https://api.weather.gov";

// geo.ts – quick geocoder + in-memory cache
const geoCache = new Map<string, { lat: number; lon: number }>();

export default async function geocode(city: string) {
    city = city.trim().toLowerCase();
    const cached = geoCache.get(city);
    if (cached) return cached;

    const url =
        "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
        encodeURIComponent(city);

    const data = await fetch(url).then(r => r.json()) as {
        results?: { latitude: number; longitude: number }[];
    };

    if (!data.results?.length) throw new Error(`City not found: ${city}`);

    const { latitude: lat, longitude: lon } = data.results[0];
    geoCache.set(city, { lat, lon });
    return { lat, lon };
}


/** Your app's identifier; NWS blocks generic UA strings. */
const userAgent = "my-weatherbot (max@cambridgearbiter.com)";

/** Core fetch helper – no retries, throttling, or caching. */
async function apiGet<T extends Json>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: {
            "User-Agent": userAgent,
            "Accept": "application/geo+json"
        }
    });
    if (!res.ok) throw new Error(`NWS ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
}

/** Resolve NWS grid + forecast URLs for a point. */
export async function getPoints(city: string): Promise<NWSPoint> {
    const { lat, lon } = await geocode(city);
    return apiGet<NWSPoint>(`/points/${lat},${lon}`);
}

// currentWeather.ts
// Assumes you already have `apiGet`, `geocode`, and `userAgent` from the previous snippets.

/** The shape of `/observations/latest` you're likely to use. Add fields as needed. */

/** Resolve the latest surface observation for a city name. */
export async function getCurrentWeather(city: string): Promise<NWSCurrentObs> {
    // 1) Geocode → lat/lon
    const { lat, lon } = await geocode(city);

    // 2) NWS "points" metadata (gives us nearby stations URL)
    const meta = await apiGet<{ properties: { observationStations: string } }>(
        `/points/${lat},${lon}`
    );

    // 3) Fetch the list of stations (GeoJSON FeatureCollection)
    const stationList = await fetch(meta.properties.observationStations, {
        headers: { "User-Agent": userAgent, Accept: "application/geo+json" }
    }).then(r => r.json()) as { features: { id: string }[] };

    if (!stationList.features.length) throw new Error("No observation station found");

    // 4) First feature = closest station → /stations/XXXX/observations/latest
    const stationPath = new URL(stationList.features[0].id).pathname;
    return apiGet<NWSCurrentObs>(`${stationPath}/observations/latest`);
}

/** 7-day forecast. */
export async function getForecast(city: string): Promise<NWSForecast> {
    const meta = await getPoints(city);
    const path = new URL(meta.properties.forecast).pathname;
    return apiGet<NWSForecast>(path);
}

/** Hourly forecast (next ~48 h). */
export async function getHourlyForecast(city: string): Promise<NWSHourlyForecast> {
    const meta = await getPoints(city);
    const path = new URL(meta.properties.forecastHourly).pathname;
    return apiGet<NWSHourlyForecast>(path).catch(error => {
        console.log(error)
        throw error
    })
}

/** Active alerts for a U.S. state (e.g. "CA"). */
export async function getActiveAlerts(area: string) {
    return apiGet(`/alerts/active?area=${area}`);
}
