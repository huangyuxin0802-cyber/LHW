"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { Car, Crosshair, Footprints, MapPin, Train } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import supabase from "@/lib/supabaseClient";
import { formatDistanceKm, haversineKm } from "@/lib/geo-utils";
import type { PlatformAvailability } from "@/lib/platform-availability";
import {
  buildGoogleMapsDirectionsUrl,
  formatDuration,
  type TravelEstimate,
} from "@/lib/travel-utils";
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

export default function DiscountMap() {
  const mapRef = useRef<MapRef>(null);
  const [restaurants, setRestaurants] = useState<DailyDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<DailyDiscount | null>(null);
  const [availability, setAvailability] = useState<PlatformAvailability | null>(
    null
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [travelEstimates, setTravelEstimates] = useState<TravelEstimate[]>([]);
  const [travelLoading, setTravelLoading] = useState(false);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);

  const { userLocation, status: locationStatus, retry } = useGeolocation();

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
    if (!selectedRestaurant) {
      setAvailability(null);
      setTravelEstimates([]);
      return;
    }

    let cancelled = false;
    setAvailabilityLoading(true);

    fetch(
      `/api/availability?platform=${encodeURIComponent(selectedRestaurant.platform)}&url=${encodeURIComponent(selectedRestaurant.booking_url)}`
    )
      .then((response) => response.json())
      .then((data: PlatformAvailability) => {
        if (!cancelled) {
          setAvailability(data);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setAvailability(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRestaurant]);

  useEffect(() => {
    if (!selectedRestaurant || !userLocation) {
      setTravelEstimates([]);
      return;
    }

    let cancelled = false;
    setTravelLoading(true);

    const params = new URLSearchParams({
      fromLat: String(userLocation.latitude),
      fromLng: String(userLocation.longitude),
      toLat: String(selectedRestaurant.latitude),
      toLng: String(selectedRestaurant.longitude),
    });

    fetch(`/api/travel?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { estimates?: TravelEstimate[] }) => {
        if (!cancelled) {
          setTravelEstimates(data.estimates ?? []);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setTravelEstimates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTravelLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRestaurant, userLocation]);

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
      retry();
      return;
    }

    mapRef.current?.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 15,
      duration: 1200,
    });
    setHasCenteredOnUser(true);
  }, [userLocation, retry]);

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

  const drivingEstimate = travelEstimates.find((item) => item.mode === "driving");
  const walkingEstimate = travelEstimates.find((item) => item.mode === "walking");

  return (
    <div className="relative h-screen w-full">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur hover:bg-white"
      >
        ← Home
      </Link>

      <div className="absolute right-4 top-4 z-10 flex max-w-[220px] flex-col items-end gap-2">
        <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-md backdrop-blur">
          {locationLabel}
        </div>
        {(locationStatus === "denied" || locationStatus === "unavailable") && (
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-md"
          >
            开启定位权限
          </button>
        )}
        <button
          type="button"
          onClick={centerOnUser}
          className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur transition hover:bg-white"
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
            maxWidth="none"
            className="[&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!shadow-none [&_.maplibregl-popup-content]:pointer-events-auto"
          >
            <div
              className="max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:w-96"
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

                <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    平台空位 / 优惠时段
                  </p>
                  {availabilityLoading ? (
                    <p className="mt-2 text-sm text-zinc-500">正在连接平台…</p>
                  ) : availability ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-zinc-600">{availability.summary}</p>
                      {availability.slots.map((slot) => (
                        <div
                          key={`${slot.label}-${slot.detail ?? ""}`}
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2"
                        >
                          <p className="text-sm font-medium text-zinc-800">
                            {slot.available ? "✅" : "⛔"} {slot.label}
                          </p>
                          {slot.detail && (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {slot.detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">
                      暂时无法读取平台数据，请直接打开预订页。
                    </p>
                  )}
                </div>

                <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    路线预估
                  </p>
                  {!userLocation ? (
                    <p className="mt-2 text-sm text-zinc-600">
                      开启定位后可显示从你的位置出发的真实路程时间。
                    </p>
                  ) : travelLoading ? (
                    <p className="mt-2 text-sm text-zinc-500">正在计算路线…</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm text-zinc-700">
                      {drivingEstimate && (
                        <p className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          驾车约 {formatDuration(drivingEstimate.durationMinutes)}
                          <span className="text-zinc-400">
                            ({drivingEstimate.distanceKm.toFixed(1)} km)
                          </span>
                        </p>
                      )}
                      {walkingEstimate && (
                        <p className="flex items-center gap-2">
                          <Footprints className="h-4 w-4" />
                          步行约 {formatDuration(walkingEstimate.durationMinutes)}
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-zinc-600">
                        <Train className="h-4 w-4" />
                        公交请在 Google Maps 查看实时班次
                      </p>
                    </div>
                  )}

                  {(() => {
                    const distance = getLiveDistance(selectedRestaurant);
                    if (distance == null) {
                      return null;
                    }

                    return (
                      <p className="mt-2 flex items-center gap-1 text-sm text-zinc-500">
                        <MapPin className="h-3.5 w-3.5" />
                        直线距离 {formatDistanceKm(distance)}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <div className="border-t border-zinc-100 p-3">
                <button
                  type="button"
                  onClick={() =>
                    openExternalUrl(selectedRestaurant.booking_url)
                  }
                  className="mb-2 w-full rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Claim Discount
                </button>

                <div className="grid grid-cols-3 gap-2">
                  {(["driving", "transit", "walking"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        openExternalUrl(
                          buildGoogleMapsDirectionsUrl({
                            originLat: userLocation?.latitude,
                            originLng: userLocation?.longitude,
                            destLat: selectedRestaurant.latitude,
                            destLng: selectedRestaurant.longitude,
                            mode,
                          })
                        )
                      }
                      className="rounded-xl border border-zinc-200 bg-white px-2 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
                    >
                      {mode === "driving"
                        ? "驾车导航"
                        : mode === "transit"
                          ? "公交导航"
                          : "步行导航"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
