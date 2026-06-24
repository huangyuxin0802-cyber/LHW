"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import supabase from "@/lib/supabaseClient";
import "mapbox-gl/dist/mapbox-gl.css";

type DailyDiscount = {
  id: string;
  restaurant_name: string;
  latitude: number;
  longitude: number;
  platform: "First Table" | "EatClub";
  discount_text: string;
  booking_url: string;
};

const INITIAL_VIEW = {
  latitude: -27.4705,
  longitude: 153.026,
  zoom: 14,
};

function PlatformMarker({
  platform,
  onClick,
}: {
  platform: DailyDiscount["platform"];
  onClick: () => void;
}) {
  const isFirstTable = platform === "First Table";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg transition hover:scale-110 ${
        isFirstTable
          ? "bg-blue-700 ring-2 ring-blue-300/50"
          : "bg-orange-500 ring-2 ring-orange-300/50"
      }`}
      aria-label={platform}
    >
      <span className="text-[10px] font-bold text-white">
        {isFirstTable ? "FT" : "EC"}
      </span>
    </button>
  );
}

export default function DiscountMap() {
  const [restaurants, setRestaurants] = useState<DailyDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<DailyDiscount | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    async function fetchDiscounts() {
      const { data, error } = await supabase
        .from("daily_discounts")
        .select(
          "id, restaurant_name, latitude, longitude, platform, discount_text, booking_url"
        );

      if (error) {
        console.error(error);
        setRestaurants([]);
      } else {
        setRestaurants((data ?? []) as DailyDiscount[]);
      }

      setLoading(false);
    }

    void fetchDiscounts();
  }, []);

  if (!mapboxToken) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white">
        <p className="text-lg font-semibold">Mapbox token required</p>
        <p className="max-w-md text-sm text-zinc-400">
          Add{" "}
          <code className="text-zinc-200">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code>{" "}
          to <code className="text-zinc-200">.env.local</code> and Vercel env
          vars. Get a free token at mapbox.com.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-zinc-900"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm text-zinc-400">Loading Brisbane discounts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur hover:bg-white"
      >
        ← Home
      </Link>

      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={INITIAL_VIEW}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            anchor="center"
          >
            <PlatformMarker
              platform={restaurant.platform}
              onClick={() => setSelectedRestaurant(restaurant)}
            />
          </Marker>
        ))}

        {selectedRestaurant && (
          <Popup
            latitude={selectedRestaurant.latitude}
            longitude={selectedRestaurant.longitude}
            anchor="bottom"
            onClose={() => setSelectedRestaurant(null)}
            closeOnClick={false}
            className="[&_.mapboxgl-popup-content]:!p-0 [&_.mapboxgl-popup-content]:!bg-transparent [&_.mapboxgl-popup-content]:!shadow-none"
          >
            <div className="w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
              <div className="p-4">
                <h2 className="text-lg font-bold text-zinc-900">
                  {selectedRestaurant.restaurant_name}
                </h2>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                    selectedRestaurant.platform === "First Table"
                      ? "bg-blue-700"
                      : "bg-orange-500"
                  }`}
                >
                  {selectedRestaurant.platform}
                </span>
                <p className="mt-3 text-base font-semibold text-emerald-600">
                  {selectedRestaurant.discount_text}
                </p>
              </div>
              <a
                href={selectedRestaurant.booking_url}
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Check Availability
              </a>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
