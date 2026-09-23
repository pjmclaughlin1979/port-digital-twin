# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React + Vite single-page app ("Scene Explorer" / Port of Cork Digital Twin) that renders a 3D
WebScene of Cork Harbour using the ArcGIS Maps SDK for JavaScript, overlaid with a live AIS vessel
feed, live weather/tide conditions, and the Port of Cork shipping schedule. Deployed as a static
site to GitHub Pages.

## Commands

```bash
npm run dev       # start Vite dev server (port 5173 by default, or $PORT)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run deploy    # gh-pages -d dist (manual publish; normally CI handles this — see below)
```

There is no test suite and no linter configured in this project.

### Local environment variables

Two build-time env vars are read via `import.meta.env` and must be set in `.env.local` for local
dev (see `.env.local`, gitignored):

- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps Platform key for the Photorealistic 3D Tiles basemap
  layer.
- `VITE_ARCGIS_OAUTH_CLIENT_ID` — Client ID of an ArcGIS Online OAuth 2.0 application (public
  client, Authorization Code + PKCE, no client secret). Must have `http://localhost:5173/` and the
  production URL registered as redirect URIs in ArcGIS Online.

In CI these are injected from GitHub Actions repo secrets of the same name (see
`.github/workflows/deploy.yml`).

### Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub
Pages automatically. `npm run deploy` (gh-pages) is a manual fallback, not the normal path.

## Architecture

### Data flow: one hook owns the ArcGIS scene

`src/hooks/useArcGISView.js` is the center of the app. It dynamically imports `@arcgis/core`
modules inside a `useEffect` (kept out of the initial bundle), builds a `WebScene` from a hardcoded
portal item ID, creates the `SceneView`, and owns all scene-derived state: vessels in view, saved
slides (used as bookmarks), weather, the shipping schedule, and the selected vessel. It exposes
stable `useCallback` functions (`zoomToVessel`, `selectVessel`, `selectMovementVessel`,
`queryVessels`, `applySlide`, `clearSelectedVessel`) that `App.jsx` wires into every panel — this is
how, e.g., clicking a vessel in the side panel, the shipping schedule, or the Data Assistant chat
all converge on the same zoom/select/highlight behavior.

The hook takes an `enabled` flag and does nothing until it's true; `App.jsx` only flips it once
both the demo disclaimer is acknowledged *and* the user is signed in (see below), so the SDK and
scene data aren't fetched until then.

Three independent live feeds run in parallel once the scene is ready, each on its own polling
interval and each tolerant of failure without taking down the others:

- **Vessels**: server-side `queryFeatures` against the "Vessels" feature layer (found by title in
  `webscene.allLayers`), filtered to what's actually on screen by projecting each feature to screen
  space with `view.toScreen` (not `view.extent`, which is a poor approximation for a tilted 3D
  camera). Refreshed on an interval and whenever the view becomes stationary.
- **Weather**: Open-Meteo forecast + marine APIs, fetched for whatever point the camera is centered
  on, re-fetched when the view goes stationary. Also pushed into `view.environment.weather` (see
  `src/lib/weatherCodes.js` for the code → scene-weather mapping) so the 3D scene's rain/fog/snow
  reflects real conditions.
- **Shipping schedule (movements)**: plain `fetch` against a public 40Geo/Raptor feature service
  (`MOVEMENTS_SERVICE_URL`), independent of the WebScene/SDK — it starts fetching immediately
  rather than waiting on the scene to load.

A vessel's hull dimensions ("related" data) live in a separate "Vessel outlines" layer keyed by
MMSI, queried on demand when a vessel is selected — not part of the main vessel feature.

### Auth gate

`src/hooks/useArcGISAuth.js` registers an ArcGIS Online OAuth `OAuthInfo`/`IdentityManager` app and
checks sign-in status independently of the scene hook. `App.jsx` requires both
`hasAcknowledgedDisclaimer` and `isSignedIn` before enabling `useArcGISView` — there is no
anonymous access. `LoadingScreen.jsx` renders the disclaimer step and the sign-in step as two
stages of the same splash screen (gated by `hasAcknowledgedDisclaimer` and `authStatus`
respectively) before falling through to actual scene-loading progress/errors.

### Component/panel pattern

Every side panel (`SidePanel`, `AssistantPanel`, `BookmarksPanel`, `LayerListPanel`, `InfoPanel`)
follows the same shape: a floating toggle `<button aria-expanded>` plus a backdrop + `<aside>` that
only render once `status === "ready"`. New panels should follow this pattern rather than inventing
a new one. `App.jsx` is the only place that owns each panel's open/closed `useState` and wires hook
callbacks down as props — panels don't reach into the ArcGIS hooks themselves.

`LayerListPanel` is the exception: it renders the SDK's own `Legend`/`LayerList` widgets into
container refs (`legendContainerRef`, `layerListContainerRef`) that `useArcGISView` mounts widgets
into directly, rather than building custom UI.

### Data Assistant (no LLM)

`src/lib/assistantQuery.js` is a rule-based, regex/keyword pattern-matcher over the vessels layer
(via the hook's `queryVessels`) and the shipping schedule — deliberately not a real LLM agent.
Esri's actual `arcgis-assistant` data-exploration agent (`@arcgis/ai-components`) was evaluated and
rejected because it requires a signed-in ArcGIS Online named user with pre-generated item
embeddings and only supports 2D web maps, none of which fit this public 3D scene. If asked to wire
up real AI/agent capability here, that mismatch is the reason a custom matcher was built instead.

### PWA / service worker

`vite-plugin-pwa` (configured in `vite.config.js`) only precaches the static app shell (HTML, icons,
manifest — see `workbox.globPatterns`), deliberately excluding both the multi-megabyte `@arcgis/core`
bundle and all live data endpoints (AIS, weather, shipping schedule, OAuth). The app fundamentally
requires a live connection, so the service worker exists only to make the site installable, never to
serve cached/stale data.

### Build config notes

- `vite.config.js` uses `base: "./"` (relative) specifically so the same build works unmodified
  whether deployed at a GitHub Pages project subpath (`username.github.io/repo/`) or a root domain.
  Anything added to the manifest/PWA config or asset references needs to stay relative for the same
  reason.
- ArcGIS SDK modules are always dynamically `import()`-ed inside effects, never imported at module
  top-level, to keep them out of the main bundle.

## Repo layout gotchas

This working directory contains other, unrelated sibling projects that are **not** part of this
app and should not be touched when working on it: `/capacity-map/` and `/port-ops-twin/`
(gitignored, each with its own git repository) and `/get-ireland-active/` (untracked, has its
own separate git repository). Don't stage, commit, or
otherwise treat files under these as part of this project.
