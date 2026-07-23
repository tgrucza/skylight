"use client";

import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { useClock } from "@/hooks/useClock";
import { useWeather } from "@/hooks/useWeather";
import type { WeatherIconKind } from "@/lib/weather";

const WEATHER_ICONS: Record<WeatherIconKind, typeof Sun> = {
  sun: Sun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

function WeatherBlock({ latitude, longitude }: { latitude: number | null | undefined; longitude: number | null | undefined }) {
  const hasLocation =
    typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude);
  const { data, isLoading, isError } = useWeather(latitude, longitude);

  if (!hasLocation) {
    return (
      <Link
        href="/settings"
        className="flex flex-col items-start gap-0.5 text-ink-3 hover:text-ink-2 no-underline"
        title="Set your location for weather"
      >
        <span className="font-mono text-[10px] tracking-[0.06em] uppercase">Weather</span>
        <span className="text-[12px] font-medium">Set location in Settings</span>
      </Link>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-0.5 text-ink-3 min-w-[72px]">
        <span className="font-mono text-[10px] tracking-[0.06em] uppercase">Weather</span>
        <span className="text-[12px]">…</span>
      </div>
    );
  }

  if (isError || !data) return null;

  const Icon = WEATHER_ICONS[data.icon];

  return (
    <div className="flex items-center gap-2.5" title={`${data.label}${data.rainExpected ? " · rain likely" : ""}`}>
      <Icon className="size-7 text-primary shrink-0" strokeWidth={1.75} aria-hidden />
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-[18px] tracking-[-0.01em] tabular-nums">
          {data.high}° / {data.low}°
        </span>
        <span className="text-[11px] text-ink-3 mt-0.5">
          {data.rainExpected ? "Rain likely" : "Dry"}
        </span>
      </div>
    </div>
  );
}

/** Header day + clock + weather (Home Hub design §7.2; weather via Open-Meteo). */
export function ClockBlock({
  timezone,
  latitude,
  longitude,
}: {
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const now = useClock();
  const dayName = formatInTimeZone(now, timezone, "EEEE");
  const dateLabel = formatInTimeZone(now, timezone, "MMM d");
  const time = formatInTimeZone(now, timezone, "h:mm");
  const ampm = formatInTimeZone(now, timezone, "a");

  return (
    <div className="flex items-center gap-3.5">
      <div>
        <div className="font-serif text-[28px] leading-none">{dayName}</div>
        <div className="font-mono text-[11px] tracking-[0.06em] text-ink-3 mt-0.5">{dateLabel.toUpperCase()}</div>
      </div>
      <div className="w-px h-8.5 bg-line" />
      <div className="flex items-baseline">
        <span className="font-bold text-[32px] tracking-[-0.01em]">{time}</span>
        <span className="font-semibold text-sm text-ink-2 ml-1">{ampm}</span>
      </div>
      <div className="w-px h-8.5 bg-line" />
      <WeatherBlock latitude={latitude} longitude={longitude} />
    </div>
  );
}
