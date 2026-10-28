import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "apple-touch-icon.png", "offline.html"],
      manifest: {
        name: "Mijovia — Mon équilibre au quotidien",
        short_name: "Mijovia",
        description: "Repas, activités et budget à votre rythme.",
        lang: "fr",
        theme_color: "#285d43",
        background_color: "#f4f5ef",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { host: "127.0.0.1", proxy: { "/api": "http://127.0.0.1:3000" } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("/zod/")) return "validation";
          if (id.includes("@tanstack")) return "query";
        },
      },
    },
  },
});
