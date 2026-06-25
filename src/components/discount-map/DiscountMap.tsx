"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { Car, Crosshair, Footprints, MapPin } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import supabase from "@/lib/supabaseClient";
import { formatDistanceKm, haversineKm } from "@/lib/geo-utils";
import type { PlatformAvailability } from "@/lib/platform-availability";
import {
  buildGoogleMapsDirectionsUrl,
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
  image_url: string | null;
};

const BRISBANE_CENTER = {
  latitude: -27.4705,
  longitude: 153.026,
  zoom: 14,
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

const RESTAURANT_IMAGES: Record<string, string> = {
  "The Lex":
    "https://images.firsttable.net/1292x800/public/restaurant/36e6e7bf08/Facetune_08-05-2026-14-05-14.jpeg",
  Ciao: "https://eccdn.com.au/images/C400B823-82FB-47A5-BAEF-16D79F9586FE/C400B823-82FB-47A5-BAEF-16D79F9586FE_image_3_1775021008863.jpg",
  "Lennons Restaurant & Bar":
    "https://images.firsttable.net/1292x800/public/restaurant/3bdc2910e8/Photo-size-for-QR-codes-2025-07-21T130515.902.jpg",
};

function getRestaurantImage(restaurant: DailyDiscount) {
  return restaurant.image_url ?? RESTAURANT_IMAGES[restaurant.restaurant_name] ?? null;
}

function formatArrivalTime(minutesFromNow: number) {
  const arrival = new Date(Date.now() + minutesFromNow * 60_000);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Australia/Brisbane",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(arrival);
}

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
      data-restaurant-marker
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
          "id, restaurant_name, latitude, longitude, platform, discount_text, booking_url, distance, cuisine, description, mock_drive_time, mock_transit_info, image_url"
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
      .then(async (response) => {
        const data = (await response.json()) as PlatformAvailability & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "availability fetch failed");
        }
        return data;
      })
      .then((data) => {
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
      .then(async (response) => {
        const data = (await response.json()) as {
          estimates?: TravelEstimate[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "travel fetch failed");
        }
        return data.estimates ?? [];
      })
      .then((estimates) => {
        if (!cancelled) {
          setTravelEstimates(estimates);
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

  useEffect(() => {
    if (!selectedRestaurant) {
      return;
    }

    const dismissPopup = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(".maplibregl-popup") ||
        target.closest("[data-restaurant-marker]")
      ) {
        return;
      }

      setSelectedRestaurant(null);
    };

    document.addEventListener("pointerdown", dismissPopup, true);
    return () => document.removeEventListener("pointerdown", dismissPopup, true);
  }, [selectedRestaurant]);

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
  const selectedHeroImage = selectedRestaurant
    ? getRestaurantImage(selectedRestaurant)
    : null;
  const showLiveCommute = travelEstimates.length > 0;
  const commuteDriveText = showLiveCommute
    ? drivingEstimate?.durationText
    : selectedRestaurant?.mock_drive_time;
  const commuteTransitText = showLiveCommute
    ? null
    : selectedRestaurant?.mock_transit_info;

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
            closeOnClick
            maxWidth="none"
            className="[&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!shadow-none [&_.maplibregl-popup-content]:pointer-events-auto"
          >
            <div
              className="flex h-[14rem] w-[min(calc(100vw-0.75rem),42rem)] overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl sm:h-[15rem] sm:w-[min(calc(100vw-1rem),46rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              {selectedHeroImage && (
                <div className="relative h-full w-24 shrink-0 bg-zinc-100 sm:w-28">
                  <img
                    src={selectedHeroImage}
                    alt={selectedRestaurant.restaurant_name}
                    className="h-full w-full object-cover"
                    loading="eager"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-3">
                <div className="shrink-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-bold text-zinc-900 sm:text-base">
                      {selectedRestaurant.restaurant_name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white sm:text-xs ${
                        selectedRestaurant.platform === "First Table"
                          ? "bg-blue-700"
                          : "bg-orange-500"
                      }`}
                    >
                      {selectedRestaurant.platform}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-bold text-emerald-700">
                    {selectedRestaurant.discount_text}
                  </p>
                </div>

                <div className="mt-2 grid h-[6.75rem] shrink-0 grid-cols-2 gap-2 sm:h-[7.25rem]">
                  <div className="flex flex-col rounded-2xl bg-amber-50 px-2.5 py-2">
                    <p className="shrink-0 text-[11px] font-bold text-amber-900">
                      🍽 用餐时间
                    </p>
                    <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
                      {availabilityLoading ? (
                        <p className="text-xs text-zinc-500">正在查询…</p>
                      ) : availability && availability.slots.length > 0 ? (
                        <div className="space-y-1">
                          {availability.slots.map((slot) => (
                            <p
                              key={`${slot.label}-${slot.detail ?? ""}`}
                              className="text-[11px] leading-snug text-zinc-800 sm:text-xs"
                            >
                              {slot.available ? "✅" : "⛔"} {slot.label}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] leading-snug text-zinc-600 sm:text-xs">
                          {availability?.summary ??
                            "暂无法读取，请点 Claim 查看预订页"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col rounded-2xl bg-sky-50 px-2.5 py-2">
                    <p className="shrink-0 text-[11px] font-bold text-sky-900">
                      🚗 通勤预计
                    </p>
                    <div className="mt-1 min-h-0 flex-1 overflow-y-auto text-[11px] leading-snug text-zinc-800 sm:text-xs">
                      {travelLoading ? (
                        <p className="text-zinc-500">正在计算路线…</p>
                      ) : showLiveCommute ? (
                        <div className="space-y-1">
                          {drivingEstimate && (
                            <p>
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Car className="h-3 w-3" />
                                驾车 {drivingEstimate.durationText}
                              </span>
                              <span className="block text-zinc-500">
                                现在出发约{" "}
                                {formatArrivalTime(drivingEstimate.durationMinutes)}{" "}
                                到
                              </span>
                            </p>
                          )}
                          {walkingEstimate && (
                            <p>
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Footprints className="h-3 w-3" />
                                步行 {walkingEstimate.durationText}
                              </span>
                            </p>
                          )}
                          {(() => {
                            const distance = getLiveDistance(selectedRestaurant);
                            if (distance == null) {
                              return null;
                            }

                            return (
                              <p className="flex items-center gap-1 text-zinc-500">
                                <MapPin className="h-3 w-3" />
                                直线 {formatDistanceKm(distance)}
                              </p>
                            );
                          })()}
                        </div>
                      ) : commuteDriveText || commuteTransitText ? (
                        <div className="space-y-1">
                          {commuteDriveText && (
                            <p>
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Car className="h-3 w-3" />
                                驾车约 {commuteDriveText}
                              </span>
                              {!userLocation && (
                                <span className="block text-zinc-500">
                                  开启定位可看实时
                                </span>
                              )}
                            </p>
                          )}
                          {commuteTransitText && (
                            <p className="text-zinc-600">🚌 {commuteTransitText}</p>
                          )}
                        </div>
                      ) : !userLocation ? (
                        <p className="text-zinc-600">
                          点右上角「我的位置」开启定位，显示实时通勤
                        </p>
                      ) : (
                        <p className="text-zinc-600">路线暂不可用，请用下方导航</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      openExternalUrl(selectedRestaurant.booking_url)
                    }
                    className="min-w-0 flex-1 truncate rounded-2xl bg-zinc-900 px-2.5 py-1.5 text-center text-[11px] font-semibold text-white transition hover:bg-zinc-800 sm:text-xs"
                  >
                    Claim Discount
                  </button>

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
                      className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-zinc-800 transition hover:bg-zinc-50 sm:text-[11px]"
                    >
                      {mode === "driving"
                        ? "驾车"
                        : mode === "transit"
                          ? "公交"
                          : "步行"}
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
