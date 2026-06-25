"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { Crosshair, MapPin } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { formatDistanceKm, haversineKm } from "@/lib/geo-utils";
import "maplibre-gl/dist/maplibre-gl.css";

type DailyDiscount = {
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
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

const BRISBANE_CENTER = {
  latitude: -27.4705,
  longitude: 153.026,
  zoom: 14,
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
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

function UserLocationMarker() {
  return (
    <div className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-8 w-8 animate-ping rounded-full bg-sky-400/40" />
      <span className="relative h-4 w-4 rounded-full border-2 border-white bg-sky-500 shadow-lg" />
    </div>
  );
}

function openExternalUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function buildDirectionsUrl(
  restaurant: DailyDiscount,
  userLocation: UserLocation | null
) {
  const destination = `${restaurant.latitude},${restaurant.longitude}`;
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "transit",
  });

  if (userLocation) {
    params.set("origin", `${userLocation.latitude},${userLocation.longitude}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function DiscountMap() {
  const mapRef = useRef<MapRef>(null);
  const [restaurants, setRestaurants] = useState<DailyDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<DailyDiscount | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "locating" | "active" | "denied" | "unavailable"
  >("idle");
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);

  useEffect(() => {
    async function fetchDiscounts() {
      const { data, error } = await supabase
        .from("daily_discounts")
        .select(
          "id, restaurant_name, latitude, longitude, platform, discount_text, booking_url, distance, cuisine, description, mock_drive_time, mock_transit_info"
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

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("active");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
        } else {
          setLocationStatus("unavailable");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      }
    );
  }, []);

  const getLiveDistance = useCallback(
    (restaurant: DailyDiscount) => {
      if (!userLocation) {
        return restaurant.distance;
      }

      return haversineKm(
        userLocation.latitude,
        userLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      );
    },
    [userLocation]
  );

  const restaurantsWithDistance = useMemo(() => {
    return [...restaurants].sort(
      (a, b) =>
        (getLiveDistance(a) ?? Infinity) - (getLiveDistance(b) ?? Infinity)
    );
  }, [restaurants, getLiveDistance]);

  const centerOnUser = useCallback(() => {
    if (!userLocation) {
      return;
    }

    mapRef.current?.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 15,
      duration: 1200,
    });
    setHasCenteredOnUser(true);
  }, [userLocation]);

  useEffect(() => {
    if (userLocation && !hasCenteredOnUser) {
      centerOnUser();
    }
  }, [userLocation, hasCenteredOnUser, centerOnUser]);

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

  if (restaurants.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white">
        <p className="text-lg font-semibold">No discounts found</p>
        <p className="max-w-md text-sm text-zinc-400">
          Check your Supabase connection and ensure{" "}
          <code className="text-zinc-200">daily_discounts</code> has seed data.
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

  const locationLabel =
    locationStatus === "locating"
      ? "定位中…"
      : locationStatus === "active"
        ? "实时定位已开启"
        : locationStatus === "denied"
          ? "定位权限被拒绝"
          : locationStatus === "unavailable"
            ? "无法获取定位"
            : "等待定位";

  return (
    <div className="relative h-screen w-full">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur hover:bg-white"
      >
        ← Home
      </Link>

      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-md backdrop-blur">
          {locationLabel}
        </div>
        <button
          type="button"
          onClick={centerOnUser}
          disabled={!userLocation}
          className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Crosshair className="h-4 w-4" />
          我的位置
        </button>
      </div>

      <Map
        ref={mapRef}
        initialViewState={BRISBANE_CENTER}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
      >
        {userLocation && (
          <Marker
            latitude={userLocation.latitude}
            longitude={userLocation.longitude}
            anchor="center"
          >
            <UserLocationMarker />
          </Marker>
        )}

        {restaurantsWithDistance.map((restaurant) => (
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
            className="[&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!shadow-none [&_.maplibregl-popup-content]:pointer-events-auto"
          >
            <div
              className="w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:w-96"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold leading-tight text-zinc-900">
                    {selectedRestaurant.restaurant_name}
                  </h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                      selectedRestaurant.platform === "First Table"
                        ? "bg-blue-700"
                        : "bg-orange-500"
                    }`}
                  >
                    {selectedRestaurant.platform}
                  </span>
                </div>

                {selectedRestaurant.cuisine && (
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {selectedRestaurant.cuisine}
                  </p>
                )}

                {selectedRestaurant.description && (
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {selectedRestaurant.description}
                  </p>
                )}

                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5">
                  <p className="text-sm font-bold text-emerald-700">
                    {selectedRestaurant.discount_text}
                  </p>
                </div>

                {(selectedRestaurant.mock_drive_time ||
                  selectedRestaurant.mock_transit_info) && (
                  <p className="mt-3 text-xs text-zinc-500">
                    {selectedRestaurant.mock_drive_time && (
                      <span>🚗 {selectedRestaurant.mock_drive_time}</span>
                    )}
                    {selectedRestaurant.mock_drive_time &&
                      selectedRestaurant.mock_transit_info && (
                        <span className="mx-2 text-zinc-300">|</span>
                      )}
                    {selectedRestaurant.mock_transit_info && (
                      <span>🚌 {selectedRestaurant.mock_transit_info}</span>
                    )}
                  </p>
                )}

                {(() => {
                  const distance = getLiveDistance(selectedRestaurant);
                  if (distance == null) {
                    return null;
                  }

                  return (
                    <p className="mt-2 flex items-center gap-1 text-sm text-zinc-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {formatDistanceKm(distance)}
                    </p>
                  );
                })()}
              </div>

              <div className="flex border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() =>
                    openExternalUrl(selectedRestaurant.booking_url)
                  }
                  className="flex-1 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Claim Discount
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openExternalUrl(
                      buildDirectionsUrl(selectedRestaurant, userLocation)
                    )
                  }
                  className="flex-1 border-l border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Directions
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
