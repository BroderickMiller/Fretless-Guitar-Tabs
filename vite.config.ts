import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { alphaTab } from "@coderline/alphatab-vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "/Fretless-Guitar-Tabs/",
  plugins: [
    react(),
    alphaTab(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*"],
      manifest: {
        name: "Fretless",
        short_name: "Fretless",
        description: "Your private guitar tab library and practice space",
        theme_color: "#111719",
        background_color: "#111719",
        display: "standalone",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 20000000,
        globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,sf2,png,svg}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});
