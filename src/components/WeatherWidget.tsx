"use client";

import {
  formatEnvironmentLabel,
  getBrisbaneEnvironment,
  type BrisbaneEnvironment,
  type WeatherKind,
} from "@/lib/environment";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function weatherIcon(weather: WeatherKind, temperature?: number) {
  if (weather === "raining") return "🌧️";
  if (weather === "cloudy") return "☁️";
  if (weather === "clear") return "☀️";
  return temperature != null && temperature >= 20 ? "🌤️" : "🌡️";
}

type WeatherWidgetProps = {
  city?: string;
  className?: string;
  onEnvironment?: (env: BrisbaneEnvironment) => void;
};

export default function WeatherWidget({
  city = "Brisbane",
  className,
  onEnvironment,
}: WeatherWidgetProps) {
  const [environment, setEnvironment] = useState<BrisbaneEnvironment | null>(
    null
  );

  useEffect(() => {
    void getBrisbaneEnvironment().then((env) => {
      const merged = { ...env, city: env.city || city };
      setEnvironment(merged);
      onEnvironment?.(merged);
    });
  }, [city, onEnvironment]);

  const labels = environment ? formatEnvironmentLabel(environment) : null;
  const temp =
    environment?.temperature != null
      ? Math.round(environment.temperature)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/20 bg-white/70 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/75 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] ${className ?? ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {environment?.country ?? "Australia"}
      </p>
      <div className="mt-1 flex items-end gap-3">
        <p className="text-[22px] font-bold leading-none tracking-tight text-zinc-900 dark:text-white">
          {city}
        </p>
        <div className="flex items-center gap-1.5 rounded-xl bg-amber-400/15 px-2.5 py-1 dark:bg-amber-400/10">
          <span className="text-[26px] leading-none">
            {environment
              ? weatherIcon(environment.weather, environment.temperature)
              : "⏳"}
          </span>
          <span className="text-[28px] font-bold leading-none text-amber-600 dark:text-amber-300">
            {temp != null ? `${temp}°C` : "—"}
          </span>
        </div>
      </div>
      {labels && (
        <p className="mt-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
          {labels.weather} · {labels.timeOfDay}
        </p>
      )}
    </motion.div>
  );
}
