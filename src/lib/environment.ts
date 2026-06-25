export type TimeOfDay =
  | "late_night"
  | "morning"
  | "afternoon"
  | "evening";

export type WeatherKind = "clear" | "raining" | "cloudy" | "unknown";

export type BrisbaneEnvironment = {
  timeOfDay: TimeOfDay;
  hour: number;
  isSleepy: boolean;
  weather: WeatherKind;
  temperature?: number;
};

const BRISBANE_TZ = "Australia/Brisbane";
const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=-27.47&longitude=153.02&current_weather=true";

function resolveTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 23 || hour < 5) return "late_night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function isRainCode(code: number) {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  );
}

function mapWeatherCode(code: number): WeatherKind {
  if (isRainCode(code)) return "raining";
  if (code === 0 || code === 1) return "clear";
  if (code >= 2 && code <= 3) return "cloudy";
  return "unknown";
}

export function getBrisbaneHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hourPart = parts.find((p) => p.type === "hour");
  return hourPart ? Number(hourPart.value) : now.getHours();
}

export function getBrisbaneEnvironmentFromHour(
  hour: number,
  weather: WeatherKind = "unknown",
  temperature?: number
): BrisbaneEnvironment {
  return {
    timeOfDay: resolveTimeOfDay(hour),
    hour,
    isSleepy: hour >= 23 || hour < 5,
    weather,
    temperature,
  };
}

export async function getBrisbaneEnvironment(): Promise<BrisbaneEnvironment> {
  const hour = getBrisbaneHour();

  try {
    const response = await fetch(OPEN_METEO_URL, { cache: "no-store" });
    if (!response.ok) {
      return getBrisbaneEnvironmentFromHour(hour);
    }

    const data = (await response.json()) as {
      current_weather?: { weathercode?: number; temperature?: number };
    };

    const code = data.current_weather?.weathercode ?? -1;
    const temperature = data.current_weather?.temperature;

    return getBrisbaneEnvironmentFromHour(
      hour,
      code >= 0 ? mapWeatherCode(code) : "unknown",
      temperature
    );
  } catch {
    return getBrisbaneEnvironmentFromHour(hour);
  }
}

export function formatEnvironmentLabel(env: BrisbaneEnvironment) {
  const timeLabels: Record<TimeOfDay, string> = {
    late_night: "深夜",
    morning: "清晨",
    afternoon: "午后",
    evening: "傍晚",
  };

  const weatherLabels: Record<WeatherKind, string> = {
    clear: "晴朗",
    raining: "下雨",
    cloudy: "多云",
    unknown: "未知",
  };

  return {
    timeOfDay: timeLabels[env.timeOfDay],
    weather: weatherLabels[env.weather],
  };
}
