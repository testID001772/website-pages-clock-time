import { useEffect, useState } from "react";
import { fetchWeather, WEATHER_REFRESH_MS, type WeatherData } from "@/lib/weather";
import type { Coordinates } from "@/lib/world-clock";

/** The current instant, ticking once a second. `null` until mounted, so SSR and the first client render agree. */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export type WeatherStatus = "loading" | "ready" | "error";

export interface WeatherState {
  status: WeatherStatus;
  /** The last good reading. Kept on a failed refresh so the card does not go blank. */
  data: WeatherData | null;
  retry: () => void;
}

/**
 * Current weather for a point, refreshed on an interval and cancelled on unmount
 * or when the coordinates change.
 */
export function useWeather(coordinates: Coordinates): WeatherState {
  const [state, setState] = useState<{ status: WeatherStatus; data: WeatherData | null }>({
    status: "loading",
    data: null,
  });
  const [attempt, setAttempt] = useState(0);
  const { latitude, longitude } = coordinates;

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetchWeather({ latitude, longitude }, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setState({ status: "ready", data });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState((previous) => ({ status: "error", data: previous.data }));
        });
    };
    load();
    const id = window.setInterval(load, WEATHER_REFRESH_MS);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [latitude, longitude, attempt]);

  return {
    status: state.status,
    data: state.data,
    retry: () => {
      setState((previous) => ({ ...previous, status: "loading" }));
      setAttempt((n) => n + 1);
    },
  };
}
