export type TravelMode = "driving" | "walking" | "transit";

export type TravelEstimate = {
  mode: TravelMode;
  durationMinutes: number;
  durationText: string;
  distanceKm: number;
  distanceText: string;
  label: string;
};

export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return "< 1 min";
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function buildGoogleMapsDirectionsUrl({
  originLat,
  originLng,
  destLat,
  destLng,
  mode,
}: {
  originLat?: number;
  originLng?: number;
  destLat: number;
  destLng: number;
  mode: TravelMode;
}) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destLat},${destLng}`,
    travelmode: mode,
  });

  if (originLat != null && originLng != null) {
    params.set("origin", `${originLat},${originLng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

type GoogleDirectionsResponse = {
  status: string;
  routes?: Array<{
    legs?: Array<{
      duration?: { value: number; text: string };
      duration_in_traffic?: { value: number; text: string };
      distance?: { value: number; text: string };
    }>;
  }>;
};

async function fetchGoogleDirection(
  apiKey: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: "driving" | "walking",
  label: string
): Promise<TravelEstimate | null> {
  const params = new URLSearchParams({
    origin: `${fromLat},${fromLng}`,
    destination: `${toLat},${toLng}`,
    mode,
    key: apiKey,
    language: "en-AU",
    region: "au",
  });

  if (mode === "driving") {
    params.set("departure_time", "now");
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    { next: { revalidate: 120 } }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GoogleDirectionsResponse;
  if (data.status !== "OK") {
    console.error("Google Directions error:", data.status);
    return null;
  }

  const leg = data.routes?.[0]?.legs?.[0];
  if (!leg?.duration || !leg.distance) {
    return null;
  }

  const duration = leg.duration_in_traffic ?? leg.duration;

  return {
    mode,
    durationMinutes: duration.value / 60,
    durationText: duration.text,
    distanceKm: leg.distance.value / 1000,
    distanceText: leg.distance.text,
    label,
  };
}

export async function fetchGoogleTravelEstimates(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<TravelEstimate[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const results = await Promise.all([
    fetchGoogleDirection(
      apiKey,
      fromLat,
      fromLng,
      toLat,
      toLng,
      "driving",
      "驾车"
    ),
    fetchGoogleDirection(
      apiKey,
      fromLat,
      fromLng,
      toLat,
      toLng,
      "walking",
      "步行"
    ),
  ]);

  return results.filter((item): item is TravelEstimate => item != null);
}
