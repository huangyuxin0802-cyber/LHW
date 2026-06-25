import { createClient } from "@/lib/supabase/server";

export type DiscountRecord = {
  id: string;
  restaurant_name: string;
  latitude: number;
  longitude: number;
  platform: string;
  discount_text: string;
  booking_url: string;
  distance: number | null;
  country: string;
  city: string;
  cuisine: string | null;
  description: string | null;
};

function normalizeCity(city: string) {
  return city.trim();
}

function resolveCountryFromCity(city: string) {
  const nzCities = ["Auckland", "Wellington", "Christchurch", "Queenstown"];
  if (nzCities.some((c) => c.toLowerCase() === city.toLowerCase())) {
    return "New Zealand";
  }
  return "Australia";
}

export async function fetchDiscountsByCity(
  city: string,
  country?: string,
  platform?: "First Table" | "EatClub" | "all"
) {
  const supabase = await createClient();
  const normalizedCity = normalizeCity(city);
  const resolvedCountry = country ?? resolveCountryFromCity(normalizedCity);

  let query = supabase
    .from("daily_discounts")
    .select(
      "id, restaurant_name, latitude, longitude, platform, discount_text, booking_url, distance, country, city, cuisine, description"
    )
    .ilike("city", normalizedCity)
    .ilike("country", resolvedCountry);

  if (platform && platform !== "all") {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query.order("restaurant_name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DiscountRecord[];
}
