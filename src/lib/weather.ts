/** Open-Meteo client helpers + WMO weather-code → icon mapping (no API key). */

export type WeatherIconKind = "sun" | "cloud" | "fog" | "rain" | "snow" | "storm";

export interface WeatherSnapshot {
  currentTemp: number;
  high: number;
  low: number;
  weatherCode: number;
  precipProbability: number;
  rainExpected: boolean;
  icon: WeatherIconKind;
  label: string;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
}

/** Map WMO codes (Open-Meteo) to a simple icon + short label. */
export function weatherFromCode(code: number): { icon: WeatherIconKind; label: string } {
  if (code === 0) return { icon: "sun", label: "Clear" };
  if (code === 1 || code === 2) return { icon: "sun", label: "Partly cloudy" };
  if (code === 3) return { icon: "cloud", label: "Cloudy" };
  if (code === 45 || code === 48) return { icon: "fog", label: "Fog" };
  if (code >= 51 && code <= 67) return { icon: "rain", label: "Rain" };
  if (code >= 71 && code <= 77) return { icon: "snow", label: "Snow" };
  if (code >= 80 && code <= 82) return { icon: "rain", label: "Showers" };
  if (code >= 85 && code <= 86) return { icon: "snow", label: "Snow showers" };
  if (code >= 95 && code <= 99) return { icon: "storm", label: "Storm" };
  return { icon: "cloud", label: "Cloudy" };
}

export async function fetchOpenMeteoWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    temperature_unit: "fahrenheit",
    forecast_days: "1",
    timezone: "auto",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error("Weather unavailable");
  const data = (await res.json()) as OpenMeteoResponse;

  const weatherCode = data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 3;
  const precip = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const { icon, label } = weatherFromCode(weatherCode);

  return {
    currentTemp: Math.round(data.current?.temperature_2m ?? data.daily?.temperature_2m_max?.[0] ?? 0),
    high: Math.round(data.daily?.temperature_2m_max?.[0] ?? data.current?.temperature_2m ?? 0),
    low: Math.round(data.daily?.temperature_2m_min?.[0] ?? data.current?.temperature_2m ?? 0),
    weatherCode,
    precipProbability: Math.round(precip),
    rainExpected: precip >= 40 || icon === "rain" || icon === "storm",
    icon,
    label,
  };
}
