import { useCallback, useEffect, useRef, useState } from "react";

// Public webscene: 3D scene loaded straight from the ArcGIS portal item.
const WEBSCENE_PORTAL_ITEM_ID = "ef2c4525126a4a26a5310b8ff90f8aba";

// Google Photorealistic 3D Tiles layers embedded in the scene need their
// own Google Maps Platform key (the portal item doesn't carry one).
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Re-query vessels in view on this cadence so the panel keeps up with the
// live AIS feed even when the camera hasn't moved.
const VESSEL_REFRESH_INTERVAL_MS = 20000;

// Re-sync the scene's sun position to the real current time on this
// cadence. Sun movement over a shorter interval is imperceptible.
const SUN_REFRESH_INTERVAL_MS = 60000;

// Port of Cork's public "Shipping Schedule" feature service (from 40Geo's
// Raptor Geo-IoT), the same one behind their ArcGIS Dashboards shipping
// schedule: https://portofcork.maps.arcgis.com/apps/dashboards/6d8b6b74af134106839fb8a635483101
const MOVEMENTS_SERVICE_URL =
  "https://utility.arcgis.com/usrsvcs/servers/1c876bed756644a1b7916b0107d01cd8/rest/services/geoiot/port-of-cork-movements/FeatureServer/1";
const MOVEMENTS_REFRESH_INTERVAL_MS = 60000;

const VESSEL_OUT_FIELDS = [
  "OBJECTID",
  "NAME",
  "TYPE",
  "MMSI",
  "CALLSIGN",
  "DESTINATION",
  "IMO",
  "STATUS",
  "SPEED",
  "COURSE",
  "HEADING",
  "TIMESTAMP",
];

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Maps an Open-Meteo WMO weather code, plus live cloud cover (%) and
// precipitation (mm), to a SceneView environment.weather autocast object
// (SunnyWeather | CloudyWeather | FoggyWeather | RainyWeather | SnowyWeather).
function toSceneWeather(weatherCode, cloudCoverPercent, precipitationMm) {
  const cloudCover = clamp01((cloudCoverPercent ?? 0) / 100);
  const precipitation = clamp01((precipitationMm ?? 0) / 4);

  if (weatherCode === 45 || weatherCode === 48) {
    return { type: "foggy", fogStrength: 0.6 };
  }
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return { type: "snowy", cloudCover, precipitation, snowCover: "enabled" };
  }
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode)
  ) {
    return { type: "rainy", cloudCover, precipitation };
  }
  if (weatherCode === 0) {
    return { type: "sunny", cloudCover };
  }
  return { type: "cloudy", cloudCover };
}

/**
 * Boots an ArcGIS SceneView against a portal WebScene.
 *
 * The SDK is dynamically imported so its (large) chunk only streams once
 * this hook mounts, letting the initial bundle stay small. All ArcGIS
 * objects (view, widgets, map) live on refs, never in React state — they
 * are mutable, non-serializable instances that React's render cycle
 * should not own or diff.
 */
export function useArcGISView(
  mapContainerRef,
  legendContainerRef,
  layerListContainerRef,
  enabled = true
) {
  const viewRef = useRef(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState(null);
  const [sceneInfo, setSceneInfo] = useState({ title: "", description: "" });
  const [vessels, setVessels] = useState([]);
  const [slides, setSlides] = useState([]);
  const [weather, setWeather] = useState({ status: "loading", error: null });
  const [movements, setMovements] = useState({
    status: "loading",
    error: null,
    arrivals: [],
    departures: [],
    other: [],
  });
  const [selectedVessel, setSelectedVessel] = useState(null);
  const vesselOutlinesLayerRef = useRef(null);
  const vesselsLayerRef = useRef(null);
  const applySunlightRef = useRef(null);

  useEffect(() => {
    // Loading the SDK and scene data is deferred until the user
    // acknowledges the disclaimer on the splash screen.
    if (!enabled || !mapContainerRef.current) return;

    let cancelled = false;
    let view = null;
    let legendWidget = null;
    let layerListWidget = null;
    let stationaryHandle = null;
    let weatherStationaryHandle = null;
    let refreshIntervalId = null;
    let sunIntervalId = null;
    let movementsIntervalId = null;

    // Port arrivals/departures schedule — a plain REST query against a
    // public feature service, unrelated to the WebScene itself, so it
    // starts fetching immediately rather than waiting on the SDK/scene.
    const refreshMovements = async () => {
      setMovements((current) => ({ ...current, status: "loading", error: null }));
      try {
        const params = new URLSearchParams({
          where: "MOVEMENT_STATUS <> 'COMPLETED'",
          outFields: [
            "MOVEMENT_STATUS",
            "SRT",
            "CONFIRMED",
            "MOVE_TYPE",
            "VESSEL",
            "VESSEL_TYPE",
            "VESSEL_LOA",
            "FROM_LOC",
            "TO_LOC",
            "MOVEMENT_DRAUGHT",
          ].join(","),
          orderByFields: "SRT ASC",
          resultRecordCount: "200",
          f: "json",
        });
        const response = await fetch(`${MOVEMENTS_SERVICE_URL}/query?${params}`);
        if (!response.ok) throw new Error(`Movements request failed (${response.status})`);
        const data = await response.json();
        if (cancelled) return;
        if (data.error) throw new Error(data.error.message ?? "Movements query failed");

        const records = (data.features ?? []).map((feature) => feature.attributes);
        const arrivals = records.filter((r) => r.MOVE_TYPE === "ARRIVAL");
        const departures = records.filter((r) => r.MOVE_TYPE === "DEPARTURE");
        const other = records.filter(
          (r) => r.MOVE_TYPE !== "ARRIVAL" && r.MOVE_TYPE !== "DEPARTURE"
        );
        setMovements({ status: "ready", error: null, arrivals, departures, other });
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch shipping movements", err);
        setMovements((prev) => ({
          ...prev,
          status: "error",
          error: err?.message ?? "Failed to load the shipping schedule",
        }));
      }
    };
    refreshMovements();
    movementsIntervalId = setInterval(refreshMovements, MOVEMENTS_REFRESH_INTERVAL_MS);

    async function bootstrap() {
      try {
        const [
          WebSceneModule,
          SceneViewModule,
          LegendModule,
          ExpandModule,
          LayerListModule,
          configModule,
          reactiveUtilsModule,
        ] = await Promise.all([
          import("@arcgis/core/WebScene.js"),
          import("@arcgis/core/views/SceneView.js"),
          import("@arcgis/core/widgets/Legend.js"),
          import("@arcgis/core/widgets/Expand.js"),
          import("@arcgis/core/widgets/LayerList.js"),
          import("@arcgis/core/config.js"),
          import("@arcgis/core/core/reactiveUtils.js"),
          import("@arcgis/core/assets/esri/themes/dark/main.css"),
        ]);

        if (cancelled) return;

        const esriConfig = configModule.default;

        if (
          GOOGLE_MAPS_API_KEY &&
          !esriConfig.request.interceptors.some((i) => i.__googleTilesKey)
        ) {
          // Belt-and-braces: child tile/texture requests streamed after the
          // root tileset don't always inherit the layer's customParameters,
          // so append the key to every request against Google's endpoint.
          esriConfig.request.interceptors.push({
            __googleTilesKey: true,
            urls: /tile\.googleapis\.com/,
            before: (params) => {
              params.requestOptions.query = {
                ...params.requestOptions.query,
                key: GOOGLE_MAPS_API_KEY,
              };
            },
          });
        }

        const WebScene = WebSceneModule.default;
        const SceneView = SceneViewModule.default;
        const Legend = LegendModule.default;
        const Expand = ExpandModule.default;
        const LayerList = LayerListModule.default;
        const reactiveUtils = reactiveUtilsModule;

        const webscene = new WebScene({
          portalItem: { id: WEBSCENE_PORTAL_ITEM_ID },
        });

        await webscene.load();
        if (cancelled) return;

        if (GOOGLE_MAPS_API_KEY) {
          // Google's tile.googleapis.com endpoint reads its key from
          // customParameters.key, not the generic APIKeyMixin#apiKey
          // (which maps to a `token` query param used for Esri-hosted tiles).
          // Photorealistic mesh layers (e.g. Google's) live under
          // basemap.groundLayers, not map.ground.layers, and only start
          // loading once the SceneView is created — so it's safe to set
          // this any time before that.
          const applyGoogleKey = (basemap) => {
            basemap?.groundLayers.forEach((layer) => {
              if (layer.type === "integrated-mesh-3dtiles") {
                layer.customParameters = { key: GOOGLE_MAPS_API_KEY };
              }
            });
          };
          applyGoogleKey(webscene.basemap);
          // Each saved slide carries its own basemap (and therefore its own
          // separate Google Mesh layer instance), so patch those too —
          // otherwise switching slides re-triggers the sign-in prompt for
          // the un-keyed layer.
          webscene.presentation.slides.forEach((slide) => applyGoogleKey(slide.basemap));
        }

        view = new SceneView({
          container: mapContainerRef.current,
          map: webscene,
          popup: { dockEnabled: true, dockOptions: { position: "bottom-left" } },
          // Drop the default search widget and navigation tools (zoom,
          // compass, pan/rotate toggle) — the panel provides its own
          // navigation via vessels and bookmarks.
          ui: { components: [] },
        });

        await view.when();
        if (cancelled) {
          view.destroy();
          return;
        }

        legendWidget = new Legend({
          view,
          container: legendContainerRef?.current ?? undefined,
        });

        if (!legendContainerRef?.current) {
          const legendExpand = new Expand({
            view,
            content: legendWidget,
            expandIcon: "legend",
            expandTooltip: "Legend",
          });
          view.ui.add(legendExpand, "bottom-left");
        }

        if (layerListContainerRef?.current) {
          layerListWidget = new LayerList({
            view,
            container: layerListContainerRef.current,
          });
        }

        viewRef.current = view;

        // Sync the scene's sun position to the real current date/time
        // (the webscene otherwise keeps whatever fixed date it was
        // authored with), and keep it moving as real time passes.
        const applySunlightForNow = () => {
          const lighting = view.environment.lighting;
          if (lighting?.type === "sun") {
            lighting.date = new Date();
          } else {
            view.environment.lighting = { type: "sun", date: new Date() };
          }
        };
        applySunlightRef.current = applySunlightForNow;
        applySunlightForNow();
        sunIntervalId = setInterval(applySunlightForNow, SUN_REFRESH_INTERVAL_MS);

        setSceneInfo({
          title: webscene.portalItem?.title ?? "Untitled scene",
          description: webscene.portalItem?.snippet ?? webscene.portalItem?.description ?? "",
        });
        setStatus("ready");

        // Saved slides act like bookmarks — named, pre-set viewpoints
        // (this WebScene has none of the older, separate "bookmarks"
        // collection, but does define slides via its Presentation).
        setSlides(
          webscene.presentation.slides.toArray().map((slide) => ({
            id: slide.id,
            title: slide.title?.text?.trim() || "Untitled slide",
            thumbnailUrl: slide.thumbnail?.url,
            slide,
          }))
        );

        // Weather for whatever the camera is currently looking at, via
        // Open-Meteo (free, no API key needed). Re-fetched each time the
        // view settles on a new viewpoint.
        const refreshWeather = async () => {
          const center = view.center;
          if (!center || center.latitude == null || center.longitude == null) return;
          const { latitude, longitude } = center;
          setWeather((current) => ({ ...current, status: "loading", error: null }));
          try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(
              3
            )}&longitude=${longitude.toFixed(
              3
            )}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day,cloud_cover,precipitation&timezone=auto`;
            // Sea surface temperature and tide-inclusive sea level height
            // come from Open-Meteo's separate Marine Weather API. Only
            // meaningful near open water, so a failure here (e.g. the
            // viewpoint is inland) shouldn't take down the rest of the
            // weather fetch — handled with its own try/catch below.
            const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude.toFixed(
              3
            )}&longitude=${longitude.toFixed(3)}&current=sea_surface_temperature,sea_level_height_msl&timezone=auto`;

            const [response, marineResult] = await Promise.all([
              fetch(url),
              fetch(marineUrl)
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null),
            ]);
            if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
            const data = await response.json();
            if (cancelled) return;
            const current = data.current;
            const marineCurrent = marineResult?.current;
            setWeather({
              status: "ready",
              error: null,
              latitude,
              longitude,
              locationLabel: data.timezone?.replace(/_/g, " "),
              temperature: current.temperature_2m,
              apparentTemperature: current.apparent_temperature,
              humidity: current.relative_humidity_2m,
              windSpeed: current.wind_speed_10m,
              windDirection: current.wind_direction_10m,
              weatherCode: current.weather_code,
              isDay: current.is_day === 1,
              observedAt: current.time,
              units: data.current_units,
              seaSurfaceTemperature: marineCurrent?.sea_surface_temperature ?? null,
              seaLevelHeight: marineCurrent?.sea_level_height_msl ?? null,
            });

            // Reflect the fetched conditions in the 3D scene itself.
            view.environment.weather = toSceneWeather(
              current.weather_code,
              current.cloud_cover,
              current.precipitation
            );
          } catch (err) {
            if (cancelled) return;
            console.error("Failed to fetch weather", err);
            setWeather((prev) => ({
              ...prev,
              status: "error",
              error: err?.message ?? "Failed to load weather",
            }));
          }
        };

        weatherStationaryHandle = reactiveUtils.watch(
          () => view.stationary,
          (stationary) => {
            if (stationary) refreshWeather();
          },
          { initial: true }
        );

        // Vessels currently on screen: the AIS point layer carries NAME
        // and TYPE fields (TYPE is what the legend's vessel categories
        // come from). view.extent is only a coarse ground-rectangle
        // approximation for a tilted 3D camera and misses/over-includes
        // vessels near the horizon, so instead project every vessel to
        // screen space and keep the ones that actually fall on screen.
        const vesselsLayer = webscene.allLayers.find(
          (layer) => layer.title === "Vessels" && layer.type === "feature"
        );
        vesselsLayerRef.current = vesselsLayer ?? null;

        // "Related information" for a selected vessel — hull dimensions —
        // lives in a separate layer (keyed by the same MMSI), not on the
        // main Vessels layer itself.
        vesselOutlinesLayerRef.current = webscene.allLayers.find(
          (layer) => layer.title === "Vessel outlines" && layer.type === "feature"
        );

        if (vesselsLayer) {
          await view.whenLayerView(vesselsLayer);
          if (cancelled) return;

          const refreshVessels = async () => {
            try {
              // Query the layer (server-side) rather than the layer view
              // (client-side): the layer view only exposes the fields it
              // needs to render, which excludes most of these.
              const { features } = await vesselsLayer.queryFeatures({
                outFields: VESSEL_OUT_FIELDS,
                returnGeometry: true,
              });
              if (cancelled) return;
              const inView = features
                .filter((feature) => {
                  const screenPoint = view.toScreen(feature.geometry);
                  return (
                    screenPoint &&
                    screenPoint.x >= 0 &&
                    screenPoint.x <= view.width &&
                    screenPoint.y >= 0 &&
                    screenPoint.y <= view.height
                  );
                })
                .map((feature) => ({
                  objectId: feature.attributes.OBJECTID,
                  name: feature.attributes.NAME?.trim() || "Unnamed vessel",
                  type: feature.attributes.TYPE || "Not available",
                  mmsi: feature.attributes.MMSI,
                  callsign: feature.attributes.CALLSIGN,
                  destination: feature.attributes.DESTINATION,
                  imo: feature.attributes.IMO,
                  status: feature.attributes.STATUS,
                  speed: feature.attributes.SPEED,
                  course: feature.attributes.COURSE,
                  heading: feature.attributes.HEADING,
                  timestamp: feature.attributes.TIMESTAMP,
                  geometry: feature.geometry,
                }))
                .sort(
                  (a, b) =>
                    a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
                );
              setVessels(inView);
              // Keep an open detail panel in sync with the live feed.
              setSelectedVessel((current) => {
                if (!current) return current;
                const updated = inView.find((v) => v.objectId === current.objectId);
                return updated ? { ...updated, related: current.related } : current;
              });
            } catch (err) {
              if (!cancelled) console.error("Failed to query vessels in view", err);
            }
          };

          // Querying right away (before the view's initial fly-to
          // animation settles) captures stale screen positions, so wait
          // for the view to actually be stationary — including its
          // current state via `initial: true`, in case it already is.
          stationaryHandle = reactiveUtils.watch(
            () => view.stationary,
            (stationary) => {
              if (stationary) refreshVessels();
            },
            { initial: true }
          );

          refreshIntervalId = setInterval(refreshVessels, VESSEL_REFRESH_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to initialize ArcGIS scene view", err);
        setError(err?.message ?? "Something went wrong loading the scene.");
        setStatus("error");
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      if (refreshIntervalId) clearInterval(refreshIntervalId);
      if (sunIntervalId) clearInterval(sunIntervalId);
      if (movementsIntervalId) clearInterval(movementsIntervalId);
      stationaryHandle?.remove();
      weatherStationaryHandle?.remove();
      legendWidget?.destroy();
      layerListWidget?.destroy();
      view?.destroy();
      viewRef.current = null;
      applySunlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const zoomToVessel = useCallback((vessel) => {
    const view = viewRef.current;
    if (!view || !vessel?.geometry) return;
    view.goTo(
      { target: vessel.geometry, scale: 1500, tilt: 65 },
      { duration: 1000, easing: "ease-in-out" }
    );
  }, []);

  const applySlide = useCallback((slideEntry) => {
    const view = viewRef.current;
    if (!view || !slideEntry?.slide) return;
    // Slides carry their own saved environment (including lighting), so
    // applying one clobbers the real-time sun sync until the next
    // interval tick — reassert it right away, both immediately (applyTo
    // sets the environment synchronously) and once the fly-to animation
    // finishes (in case it re-asserts the saved lighting at the end).
    const promise = slideEntry.slide.applyTo(view, { duration: 1000, easing: "ease-in-out" });
    applySunlightRef.current?.();
    promise.then(() => applySunlightRef.current?.());
  }, []);

  const selectVessel = useCallback((vessel) => {
    if (!vessel) return;
    setSelectedVessel({ ...vessel, related: { status: "loading" } });

    const outlinesLayer = vesselOutlinesLayerRef.current;
    if (!outlinesLayer || vessel.mmsi == null) {
      setSelectedVessel((current) =>
        current && current.objectId === vessel.objectId
          ? { ...current, related: { status: "unavailable" } }
          : current
      );
      return;
    }

    outlinesLayer
      .queryFeatures({
        where: `MMSI = ${vessel.mmsi}`,
        outFields: ["DIM_BOW", "DIM_STERN", "DIM_PORT", "DIM_STARBOARD"],
        returnGeometry: false,
        num: 1,
      })
      .then(({ features }) => {
        const outline = features[0]?.attributes;
        setSelectedVessel((current) => {
          if (!current || current.objectId !== vessel.objectId) return current;
          if (!outline) return { ...current, related: { status: "unavailable" } };
          const { DIM_BOW, DIM_STERN, DIM_PORT, DIM_STARBOARD } = outline;
          return {
            ...current,
            related: {
              status: "ready",
              length:
                DIM_BOW != null && DIM_STERN != null ? DIM_BOW + DIM_STERN : null,
              beam:
                DIM_PORT != null && DIM_STARBOARD != null
                  ? DIM_PORT + DIM_STARBOARD
                  : null,
            },
          };
        });
      })
      .catch((err) => {
        console.error("Failed to fetch related vessel details", err);
        setSelectedVessel((current) =>
          current && current.objectId === vessel.objectId
            ? { ...current, related: { status: "error" } }
            : current
        );
      });
  }, []);

  const clearSelectedVessel = useCallback(() => setSelectedVessel(null), []);

  // Shipping schedule entries (arrivals/departures/other) only carry the
  // vessel's name, not its MMSI/geometry, so look up its live AIS position
  // by name to zoom to it and open the same detail panel a vessel-in-view
  // click does. Falls back to a position-less entry (built from the
  // schedule row itself) if the vessel isn't currently broadcasting AIS —
  // e.g. a future scheduled arrival that hasn't reached the harbour yet.
  const selectMovementVessel = useCallback(
    async (movement) => {
      const name = movement?.VESSEL?.trim();
      if (!name) return;

      const fallbackVessel = {
        objectId: `movement-${name}-${movement.SRT}`,
        name,
        type: movement.VESSEL_TYPE || "Not available",
        mmsi: null,
        callsign: null,
        destination: null,
        imo: null,
        status: movement.MOVEMENT_STATUS,
        speed: null,
        course: null,
        heading: null,
        timestamp: null,
        geometry: null,
      };

      const vesselsLayer = vesselsLayerRef.current;
      if (!vesselsLayer) {
        selectVessel(fallbackVessel);
        return;
      }

      try {
        const safeName = name.replace(/'/g, "''");
        const { features } = await vesselsLayer.queryFeatures({
          where: `UPPER(TRIM(NAME)) = UPPER('${safeName}')`,
          outFields: VESSEL_OUT_FIELDS,
          returnGeometry: true,
          num: 1,
        });
        const feature = features[0];
        if (!feature) {
          selectVessel(fallbackVessel);
          return;
        }
        const vessel = {
          objectId: feature.attributes.OBJECTID,
          name: feature.attributes.NAME?.trim() || name,
          type: feature.attributes.TYPE || fallbackVessel.type,
          mmsi: feature.attributes.MMSI,
          callsign: feature.attributes.CALLSIGN,
          destination: feature.attributes.DESTINATION,
          imo: feature.attributes.IMO,
          status: feature.attributes.STATUS,
          speed: feature.attributes.SPEED,
          course: feature.attributes.COURSE,
          heading: feature.attributes.HEADING,
          timestamp: feature.attributes.TIMESTAMP,
          geometry: feature.geometry,
        };
        zoomToVessel(vessel);
        selectVessel(vessel);
      } catch (err) {
        console.error("Failed to find live position for shipping schedule vessel", err);
        selectVessel(fallbackVessel);
      }
    },
    [zoomToVessel, selectVessel]
  );

  return {
    status,
    error,
    ...sceneInfo,
    vessels,
    slides,
    weather,
    movements,
    selectedVessel,
    viewRef,
    zoomToVessel,
    applySlide,
    selectVessel,
    selectMovementVessel,
    clearSelectedVessel,
  };
}
