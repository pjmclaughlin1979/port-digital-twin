import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Relative base so the build works unmodified from a GitHub Pages
// project site (username.github.io/repo/) or a user/org site.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // The scene itself needs a live network connection (AIS feed,
        // shipping schedule, weather, ArcGIS OAuth, basemap tiles) and
        // can't meaningfully work offline, so only precache the small
        // app shell — not the multi-megabyte ArcGIS SDK bundle — to keep
        // install size down and guarantee live data is never served
        // stale from a cache.
        globPatterns: ["**/*.{html,ico,png,svg,webmanifest}"],
      },
      manifest: {
        name: "Port of Cork Digital Twin",
        short_name: "Cork Digital Twin",
        description:
          "A live 3D digital twin of Cork Harbour with real-time AIS vessel tracking.",
        theme_color: "#0b0f14",
        background_color: "#0b0f14",
        display: "standalone",
        start_url: ".",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: false,
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
