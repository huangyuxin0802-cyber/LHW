export type TravelMode = "driving" | "walking" | "transit";

export type TravelEstimate = {
  mode: TravelMode;
  durationMinutes: number;
  distanceKm: number;
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

export async function fetchOsrmTravelEstimates(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<TravelEstimate[]> {
  const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
  const profiles: Array<{ mode: TravelMode; profile: string; label: string }> = [
    { mode: "driving", profile: "driving", label: "驾车" },
    { mode: "walking", profile: "foot", label: "步行" },
  ];

  const results = await Promise.all(
    profiles.map(async ({ mode, profile, label }) => {
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=false`;
      const response = await fetch(url, { next: { revalidate: 300 } });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        routes?: Array<{ duration: number; distance: number }>;
      };

      const route = data.routes?.[0];
      if (!route) {
        return null;
      }

      return {
        mode,
        durationMinutes: route.duration / 60,
        distanceKm: route.distance / 1000,
        label,
      };
    })
  );

  return results.filter((item): item is TravelEstimate => item != null);
}
