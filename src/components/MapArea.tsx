"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import Link from "next/link";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  discountsToGeoJSON,
  fetchDiscountsInBounds,
  type MapDiscount,
} from "@/lib/discounts-client";

const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm-raster", type: "raster", source: "osm" }],
};

const BRISBANE_VIEW = {
  longitude: 153.02,
  latitude: -27.47,
  zoom: 12,
} as const;

const CITY_VIEWS: Record<
  string,
  { longitude: number; latitude: number; zoom: number }
> = {
  Brisbane: BRISBANE_VIEW,
  Sydney: { longitude: 151.2093, latitude: -33.8688, zoom: 11 },
  Melbourne: { longitude: 144.9631, latitude: -37.8136, zoom: 11 },
  Auckland: { longitude: 174.7633, latitude: -36.8485, zoom: 11 },
};

const DISCOUNT_LAYERS = [
  "clusters",
  "cluster-count",
  "unclustered-point",
  "unclustered-label",
] as const;

function addDiscountLayers(map: MapLibreMap) {
  if (map.getSource("discounts")) return;

  map.addSource("discounts", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "discounts",
    filter: ["has", "point_count"],
    paint: {
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
    },
  });

  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "discounts",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-size": 13,
    },
    paint: { "text-color": "#ffffff" },
  });

  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "discounts",
    filter: ["!", ["has", "point_count"]],
    paint: {
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
    },
  });

  map.addLayer({
    id: "unclustered-label",
    type: "symbol",
    source: "discounts",
    filter: ["!", ["has", "point_count"]],
    layout: {
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
    },
    paint: { "text-color": "#ffffff" },
  });
}

export type MapAreaProps = {
  city?: string;
  embedded?: boolean;
};

export default function MapArea({
  city = "Brisbane",
  embedded = false,
}: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const fetchTimerRef = useRef<number | null>(null);
  const mapReadyRef = useRef(false);
  const loadBoundsRef = useRef<() => Promise<void>>(async () => {});
  const scheduleBoundsFetchRef = useRef<() => void>(() => {});
  const showRestaurantPopupRef = useRef<(restaurant: MapDiscount) => void>(
    () => {}
  );
  const restaurantByIdRef = useRef<globalThis.Map<string, MapDiscount>>(
    new globalThis.Map()
  );

  const [mapReady, setMapReady] = useState(false);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<MapDiscount[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<MapDiscount | null>(null);

  const { userLocation, status: locationStatus, retry } = useGeolocation();

  const shellHeightStyle = embedded
    ? { height: "600px", minHeight: "600px" }
    : { height: "100%", minHeight: "600px" };
  const initialView = CITY_VIEWS[city] ?? BRISBANE_VIEW;

  const geojson = useMemo(
    () => discountsToGeoJSON(restaurants),
    [restaurants]
  );

  const loadBounds = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    try {
      setFetchError(null);
      const data = await fetchDiscountsInBounds(
        {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        city
      );

      restaurantByIdRef.current = new globalThis.Map(
        data.map((item) => [item.id, item])
      );
      setRestaurants(data);
    } catch (error) {
      console.error("[MapArea] fetchDiscountsInBounds:", error);
      setFetchError("折扣数据加载失败（底图仍可用）");
    }
  }, [city]);

  loadBoundsRef.current = loadBounds;

  const scheduleBoundsFetch = useCallback(() => {
    if (!mapReadyRef.current) return;
    if (fetchTimerRef.current) window.clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = window.setTimeout(() => {
      void loadBounds();
    }, 280);
  }, [loadBounds]);

  scheduleBoundsFetchRef.current = scheduleBoundsFetch;

  const showRestaurantPopup = useCallback((restaurant: MapDiscount) => {
    const map = mapRef.current;
    if (!map) return;

    popupRef.current?.remove();
    const popup = new maplibregl.Popup({
      closeOnClick: false,
      maxWidth: "320px",
      offset: 12,
    })
      .setLngLat([restaurant.longitude, restaurant.latitude])
      .setHTML(
        `<div style="padding:12px;font-family:system-ui,sans-serif">
          <p style="margin:0;font-size:14px;font-weight:700;color:#18181b">${restaurant.restaurant_name}</p>
          <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#047857">${restaurant.discount_text}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#71717a">${restaurant.platform} · ${restaurant.city ?? ""}</p>
          <a href="${restaurant.booking_url}" target="_blank" rel="noopener noreferrer"
            style="display:inline-flex;margin-top:12px;border-radius:12px;background:#18181b;color:#fff;padding:6px 12px;font-size:12px;font-weight:600;text-decoration:none">
            Claim Discount
          </a>
        </div>`
      )
      .addTo(map);

    popup.on("close", () => setSelectedRestaurant(null));
    popupRef.current = popup;
    setSelectedRestaurant(restaurant);
  }, []);

  showRestaurantPopupRef.current = showRestaurantPopup;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let disposed = false;

    const map = new maplibregl.Map({
      container,
      style: OSM_RASTER_STYLE,
      center: [initialView.longitude, initialView.latitude],
      zoom: initialView.zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapRef.current = map;

    const onLoad = () => {
      if (disposed) return;
      mapReadyRef.current = true;
      setMapReady(true);
      setMapInitError(null);
      addDiscountLayers(map);
      map.resize();
      void loadBoundsRef.current();
    };

    const onError = (event: maplibregl.ErrorEvent) => {
      console.error("[MapArea] map error:", event.error);
      if (!disposed) {
        setMapInitError("地图引擎初始化失败，请刷新页面");
      }
    };

    const onMoveEnd = () => scheduleBoundsFetchRef.current();

    const onClick = async (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [...DISCOUNT_LAYERS],
      });
      const feature = features[0];
      if (!feature) return;

      if (feature.layer.id === "clusters") {
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource("discounts") as GeoJSONSource | undefined;
        if (!source || clusterId == null) return;

        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: [lng, lat], zoom, duration: 500 });
        } catch {
          // ignore
        }
        return;
      }

      if (
        feature.layer.id === "unclustered-point" ||
        feature.layer.id === "unclustered-label"
      ) {
        const id = String(feature.properties?.id ?? "");
        const restaurant = restaurantByIdRef.current.get(id);
        if (restaurant) showRestaurantPopupRef.current(restaurant);
      }
    };

    map.on("load", onLoad);
    map.on("error", onError);
    map.on("moveend", onMoveEnd);
    map.on("click", onClick);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          map.resize();
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    return () => {
      disposed = true;
      mapReadyRef.current = false;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      popupRef.current?.remove();
      userMarkerRef.current?.remove();
      map.off("load", onLoad);
      map.off("error", onError);
      map.off("moveend", onMoveEnd);
      map.off("click", onClick);
      map.remove();
      mapRef.current = null;
      if (fetchTimerRef.current) window.clearTimeout(fetchTimerRef.current);
    };
    // Map instance should only be created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("discounts") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData(geojson);
  }, [geojson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const view = CITY_VIEWS[city] ?? BRISBANE_VIEW;
    map.flyTo({
      center: [view.longitude, view.latitude],
      zoom: view.zoom,
      duration: 800,
    });
    void loadBounds();
  }, [city, mapReady, loadBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.innerHTML =
        '<div style="position:relative;width:20px;height:20px"><span style="position:absolute;inset:-6px;border-radius:9999px;background:rgba(56,189,248,0.4);animation:pulse 1.5s infinite"></span><span style="position:relative;display:block;width:16px;height:16px;margin:2px;border-radius:9999px;border:2px solid #fff;background:#0ea5e9;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></span></div>';
      userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([
        userLocation.longitude,
        userLocation.latitude,
      ]);
      userMarkerRef.current.addTo(map);
    } else {
      userMarkerRef.current.setLngLat([
        userLocation.longitude,
        userLocation.latitude,
      ]);
    }
  }, [userLocation, mapReady]);

  useEffect(() => {
    if (!selectedRestaurant) {
      popupRef.current?.remove();
      popupRef.current = null;
    }
  }, [selectedRestaurant]);

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
  }, [userLocation, retry]);

  const locationLabel =
    locationStatus === "active"
      ? "定位已开启"
      : locationStatus === "denied"
        ? "定位被拒绝"
        : "等待定位";

  return (
    <div
      className={
        embedded
          ? "relative h-full w-full bg-zinc-100"
          : "relative h-full min-h-screen w-full bg-zinc-100"
      }
    >
      {!embedded && (
        <Link
          href="/"
          className="absolute left-4 top-4 z-20 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur hover:bg-white"
        >
          ← Home
        </Link>
      )}

      <div className="absolute right-4 top-4 z-20 flex max-w-[240px] flex-col items-end gap-2">
        <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-md backdrop-blur">
          {restaurants.length} 家可见 · {locationLabel}
        </div>
        {mapInitError && (
          <div className="rounded-full bg-amber-500/95 px-3 py-1 text-xs text-white">
            {mapInitError}
          </div>
        )}
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

      <div
        ref={containerRef}
        style={{ width: "100%", position: "relative", ...shellHeightStyle }}
        className="maplibregl-map"
      >
        {!mapReady && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-zinc-100 text-sm text-zinc-500">
            正在加载底图…
          </div>
        )}
      </div>
    </div>
  );
}
