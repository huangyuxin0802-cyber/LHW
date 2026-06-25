"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, {
  Layer,
  Marker,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import { Car, Crosshair, Footprints, MapPin } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  discountsToGeoJSON,
  fetchDiscountsInBounds,
  type MapDiscount,
} from "@/lib/discounts-client";
import { formatDistanceKm, haversineKm } from "@/lib/geo-utils";
import type { PlatformAvailability } from "@/lib/platform-availability";
import {
  buildGoogleMapsDirectionsUrl,
  type TravelEstimate,
} from "@/lib/travel-utils";
import "maplibre-gl/dist/maplibre-gl.css";

const CITY_CENTERS: Record<string, { latitude: number; longitude: number; zoom: number }> = {
  Brisbane: { latitude: -27.4705, longitude: 153.026, zoom: 12 },
  Sydney: { latitude: -33.8688, longitude: 151.2093, zoom: 11 },
  Melbourne: { latitude: -37.8136, longitude: 144.9631, zoom: 11 },
  Auckland: { latitude: -36.8485, longitude: 174.7633, zoom: 11 },
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

const RESTAURANT_IMAGES: Record<string, string> = {
  "The Lex":
    "https://images.firsttable.net/1292x800/public/restaurant/36e6e7bf08/Facetune_08-05-2026-14-05-14.jpeg",
  Ciao: "https://eccdn.com.au/images/C400B823-82FB-47A5-BAEF-16D79F9586FE/C400B823-82FB-47A5-BAEF-16D79F9586FE_image_3_1775021008863.jpg",
  "Lennons Restaurant & Bar":
    "https://images.firsttable.net/1292x800/public/restaurant/3bdc2910e8/Photo-size-for-QR-codes-2025-07-21T130515.902.jpg",
};

function getRestaurantImage(restaurant: MapDiscount) {
  return (
    restaurant.image_url ?? RESTAURANT_IMAGES[restaurant.restaurant_name] ?? null
  );
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

export type MapAreaProps = {
  city?: string;
  embedded?: boolean;
};

export default function MapArea({
  city = "Brisbane",
  embedded = false,
}: MapAreaProps) {
  const mapRef = useRef<MapRef>(null);
  const fetchTimerRef = useRef<number | null>(null);
  const restaurantByIdRef = useRef<globalThis.Map<string, MapDiscount>>(
    new globalThis.Map()
  );

  const [restaurants, setRestaurants] = useState<MapDiscount[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<MapDiscount | null>(null);
  const [availability, setAvailability] = useState<PlatformAvailability | null>(
    null
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [travelEstimates, setTravelEstimates] = useState<TravelEstimate[]>([]);
  const [travelLoading, setTravelLoading] = useState(false);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);

  const { userLocation, status: locationStatus, retry } = useGeolocation();

  const initialView = CITY_CENTERS[city] ?? CITY_CENTERS.Brisbane;

  const geojson = useMemo(
    () => discountsToGeoJSON(restaurants),
    [restaurants]
  );

  const loadBounds = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) {
      return;
    }

    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    try {
      setDataLoading(true);
      setFetchError(null);
      const data = await fetchDiscountsInBounds(
        { north, south, east, west },
        city
      );
      const byId = new globalThis.Map(data.map((item) => [item.id, item]));
      restaurantByIdRef.current = byId;
      setRestaurants(data);
    } catch (error) {
      console.error(error);
      setFetchError("加载折扣数据失败");
      setRestaurants([]);
    } finally {
      setDataLoading(false);
    }
  }, [city]);

  const scheduleBoundsFetch = useCallback(() => {
    if (fetchTimerRef.current) {
      window.clearTimeout(fetchTimerRef.current);
    }
    fetchTimerRef.current = window.setTimeout(() => {
      void loadBounds();
    }, 280);
  }, [loadBounds]);

  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        window.clearTimeout(fetchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    const view = CITY_CENTERS[city] ?? CITY_CENTERS.Brisbane;
    map.flyTo({
      center: [view.longitude, view.latitude],
      zoom: view.zoom,
      duration: 800,
    });
    void loadBounds();
  }, [city, loadBounds]);

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
    (restaurant: MapDiscount) => {
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
    if (userLocation && !hasCenteredOnUser && !embedded) {
      centerOnUser();
    }
  }, [userLocation, hasCenteredOnUser, centerOnUser, embedded]);

  const onMapClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      const map = mapRef.current?.getMap();
      if (!map) {
        return;
      }

      if (feature.layer?.id === "clusters") {
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource("discounts") as GeoJSONSource | undefined;
        if (!source || clusterId == null) {
          return;
        }

        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
          map.easeTo({
            center: [coordinates[0], coordinates[1]],
            zoom,
            duration: 500,
          });
        } catch {
          // ignore cluster zoom errors
        }
        return;
      }

      if (
        feature.layer?.id === "unclustered-point" ||
        feature.layer?.id === "unclustered-label"
      ) {
        const id = String(feature.properties?.id ?? "");
        const restaurant = restaurantByIdRef.current.get(id);
        if (restaurant) {
          setSelectedRestaurant(restaurant);
        }
      }
    },
    []
  );

  const heightClass = embedded ? "h-full min-h-[320px]" : "h-screen";

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

  return (
    <div className={`relative ${heightClass} w-full`}>
      {!embedded && (
        <Link
          href="/"
          className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur hover:bg-white"
        >
          ← Home
        </Link>
      )}

      <div className="absolute right-4 top-4 z-10 flex max-w-[220px] flex-col items-end gap-2">
        <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-md backdrop-blur">
          {restaurants.length} 家可见 · {locationLabel}
        </div>
        {fetchError && (
          <div className="rounded-full bg-red-500/90 px-3 py-1 text-xs text-white">
            {fetchError}
          </div>
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

      <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={initialView}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={[
          "clusters",
          "unclustered-point",
          "unclustered-label",
        ]}
        onLoad={() => {
          void loadBounds();
        }}
        onMoveEnd={scheduleBoundsFetch}
        onClick={onMapClick}
      >
        <Source
          id="discounts"
          type="geojson"
          data={geojson}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#c4b5fd",
                20,
                "#8b5cf6",
                100,
                "#6d28d9",
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                18,
                20,
                24,
                100,
                32,
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": "{point_count_abbreviated}",
              "text-size": 13,
            }}
            paint={{ "text-color": "#ffffff" }}
          />
          <Layer
            id="unclustered-point"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": [
                "match",
                ["get", "platform"],
                "First Table",
                "#1d4ed8",
                "EatClub",
                "#f97316",
                "#8b5cf6",
              ],
              "circle-radius": 16,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="unclustered-label"
            type="symbol"
            filter={["!", ["has", "point_count"]]}
            layout={{
              "text-field": [
                "match",
                ["get", "platform"],
                "First Table",
                "FT",
                "EatClub",
                "EC",
                "?",
              ],
              "text-size": 10,
            }}
            paint={{ "text-color": "#ffffff" }}
          />
        </Source>

        {userLocation && (
          <Marker
            latitude={userLocation.latitude}
            longitude={userLocation.longitude}
            anchor="center"
          >
            <UserLocationMarker />
          </Marker>
        )}

        {selectedRestaurant && (
          <Popup
            latitude={selectedRestaurant.latitude}
            longitude={selectedRestaurant.longitude}
            anchor="bottom"
            onClose={() => setSelectedRestaurant(null)}
            closeOnClick={false}
            maxWidth="none"
            className="[&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!shadow-none"
          >
            <div
              className="flex h-[14rem] w-[min(calc(100vw-0.75rem),42rem)] overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl sm:h-[15rem]"
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
                  {selectedRestaurant.cuisine && (
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      {selectedRestaurant.cuisine}
                    </p>
                  )}
                  {selectedRestaurant.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-600">
                      {selectedRestaurant.description}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-500">
                    {selectedRestaurant.city}, {selectedRestaurant.country}
                  </p>
                </div>

                <div className="mt-2 grid h-[6.75rem] shrink-0 grid-cols-2 gap-2">
                  <div className="flex flex-col rounded-2xl bg-amber-50 px-2.5 py-2">
                    <p className="shrink-0 text-[11px] font-bold text-amber-900">
                      🍽 用餐时间
                    </p>
                    <div className="mt-1 min-h-0 flex-1 overflow-y-auto text-[11px]">
                      {availabilityLoading ? (
                        <p className="text-zinc-500">正在查询…</p>
                      ) : availability?.slots.length ? (
                        availability.slots.map((slot) => (
                          <p key={`${slot.label}-${slot.detail ?? ""}`}>
                            {slot.available ? "✅" : "⛔"} {slot.label}
                          </p>
                        ))
                      ) : (
                        <p className="text-zinc-600">
                          {availability?.summary ?? "请点 Claim 查看预订页"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col rounded-2xl bg-sky-50 px-2.5 py-2">
                    <p className="shrink-0 text-[11px] font-bold text-sky-900">
                      🚗 通勤预计
                    </p>
                    <div className="mt-1 min-h-0 flex-1 overflow-y-auto text-[11px]">
                      {travelLoading ? (
                        <p className="text-zinc-500">正在计算…</p>
                      ) : showLiveCommute ? (
                        <>
                          {drivingEstimate && (
                            <p>
                              <Car className="mr-1 inline h-3 w-3" />
                              驾车 {drivingEstimate.durationText}
                            </p>
                          )}
                          {walkingEstimate && (
                            <p>
                              <Footprints className="mr-1 inline h-3 w-3" />
                              步行 {walkingEstimate.durationText}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-zinc-600">开启定位可看实时路线</p>
                          {selectedRestaurant.mock_drive_time && (
                            <p>{selectedRestaurant.mock_drive_time}</p>
                          )}
                          {selectedRestaurant.mock_transit_info && (
                            <p>{selectedRestaurant.mock_transit_info}</p>
                          )}
                        </>
                      )}
                      {(() => {
                        const distance = getLiveDistance(selectedRestaurant);
                        if (distance == null) return null;
                        return (
                          <p className="text-zinc-500">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            直线 {formatDistanceKm(distance)}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      openExternalUrl(selectedRestaurant.booking_url)
                    }
                    className="min-w-0 flex-1 rounded-2xl bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-white"
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
                      className="rounded-2xl border border-zinc-200 px-2 py-1.5 text-[10px] font-semibold"
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
      {dataLoading && restaurants.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/40">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-zinc-950/85 px-6 py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm text-zinc-300">加载 {city} 折扣…</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
