import { createClient } from "@/lib/supabase/client";

export type MapDiscount = {
  id: string;
  restaurant_name: string;
  latitude: number;
  longitude: number;
  platform: "First Table" | "EatClub";
  discount_text: string;
  booking_url: string;
  distance: number | null;
  cuisine: string | null;
  description: string | null;
  mock_drive_time: string | null;
  mock_transit_info: string | null;
  image_url: string | null;
  country: string | null;
  city: string | null;
};

export type BoundsQuery = {
  north: number;
  south: number;
  east: number;
  west: number;
};

const SELECT_FIELDS =
  "id, restaurant_name, latitude, longitude, platform, discount_text, booking_url, distance, cuisine, description, mock_drive_time, mock_transit_info, image_url, country, city";

export async function fetchDiscountsInBounds(
  bounds: BoundsQuery,
  city?: string
) {
  const supabase = createClient();
  const minLat = Math.min(bounds.south, bounds.north);
  const maxLat = Math.max(bounds.south, bounds.north);
  const minLng = Math.min(bounds.west, bounds.east);
  const maxLng = Math.max(bounds.west, bounds.east);

  let query = supabase
    .from("daily_discounts")
    .select(SELECT_FIELDS)
    .gte("latitude", minLat)
    .lte("latitude", maxLat)
    .gte("longitude", minLng)
    .lte("longitude", maxLng);

  if (city) {
    query = query.ilike("city", city);
  }

  const { data, error } = await query.limit(5000);

  if (error) {
    throw error;
  }

  return (data ?? []) as MapDiscount[];
}

export function discountsToGeoJSON(restaurants: MapDiscount[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: restaurants.map((r) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [r.longitude, r.latitude],
      },
      properties: {
        id: r.id,
        platform: r.platform,
        name: r.restaurant_name,
      },
    })),
  };
}
