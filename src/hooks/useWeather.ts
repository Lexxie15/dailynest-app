import { useEffect, useState } from 'react';
import type { Weather, WeatherOk, WeatherTown } from '../state/types';

/** Today's forecast for the chosen town from Open-Meteo. Keeps the last good answer for offline use. */
export function useWeather(town: WeatherTown | null): Weather {
  const [weather, setWeather] = useState<Weather>(null);
  const lat = town?.lat;
  const lon = town?.lon;

  useEffect(() => {
    if (lat === undefined || lon === undefined) {
      setWeather({ err: true });
      return;
    }
    let cancelled = false;
    const key = 'dailynest.weather.' + lat + ',' + lon;

    let cached: WeatherOk | null = null;
    try {
      cached = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      cached = null;
    }
    setWeather(cached);

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);

    (async () => {
      try {
        const q = new URLSearchParams({
          latitude: String(lat),
          longitude: String(lon),
          current: 'temperature_2m,weather_code',
          daily: 'temperature_2m_max,precipitation_probability_max,uv_index_max',
          timezone: 'auto',
          forecast_days: '1'
        });
        const r = await fetch('https://api.open-meteo.com/v1/forecast?' + q, { signal: ctl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        const result: WeatherOk = {
          temp: j.current.temperature_2m,
          code: j.current.weather_code,
          hi: j.daily.temperature_2m_max[0],
          rain: j.daily.precipitation_probability_max[0] ?? 0,
          uv: j.daily.uv_index_max[0] ?? 0,
          fetched: Date.now()
        };
        if (cancelled) return;
        setWeather(result);
        try {
          localStorage.setItem(key, JSON.stringify(result));
        } catch {
          /* storage blocked: fine */
        }
      } catch {
        if (cancelled) return;
        setWeather((prev) => (prev && !prev.err ? prev : { err: true }));
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctl.abort();
    };
  }, [lat, lon]);

  return weather;
}
