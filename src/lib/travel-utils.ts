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

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
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

type LocationIqDirectionsResponse = {
  code?: string;
  routes?: Array<{
    duration?: number;
    distance?: number;
  }>;
};

const LOCATIONIQ_BASE_URL =
  process.env.LOCATIONIQ_BASE_URL ?? "https://us1.locationiq.com/v1";

async function fetchLocationIqDirection(
  apiKey: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  profile: "driving" | "walking",
  label: string
): Promise<TravelEstimate | null> {
  const coordinates = `${fromLng},${fromLat};${toLng},${toLat}`;
  const params = new URLSearchParams({
    key: apiKey,
    overview: "false",
    annotations: "false",
  });

  const response = await fetch(
    `${LOCATIONIQ_BASE_URL}/directions/${profile}/${coordinates}?${params.toString()}`,
    { next: { revalidate: 120 } }
  );

  if (!response.ok) {
    console.error("LocationIQ Directions HTTP error:", response.status);
    return null;
  }

  const data = (await response.json()) as LocationIqDirectionsResponse;
  const route = data.routes?.[0];

  if (!route?.duration || route.distance == null) {
    console.error("LocationIQ Directions error:", data.code ?? "no route");
    return null;
  }

  const durationMinutes = route.duration / 60;

  return {
    mode: profile,
    durationMinutes,
    durationText: formatDuration(durationMinutes),
    distanceKm: route.distance / 1000,
    distanceText: formatDistance(route.distance),
    label,
  };
}

export async function fetchLocationIqTravelEstimates(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<TravelEstimate[]> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;

  if (!apiKey) {
    throw new Error("LOCATIONIQ_API_KEY is not configured");
  }

  const results = await Promise.all([
    fetchLocationIqDirection(
      apiKey,
      fromLat,
      fromLng,
      toLat,
      toLng,
      "driving",
      "驾车"
    ),
    fetchLocationIqDirection(
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
