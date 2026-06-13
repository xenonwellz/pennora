import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const apiTarget = process.env.VITE_API_URL ?? "http://localhost:3001";

export default defineConfig({
    plugins: [
        TanStackRouterVite({ autoCodeSplitting: true }),
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icons/*.png", "textures/*"],
            manifest: false,
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-stylesheets",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-webfonts",
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: { "@": path.resolve(__dirname, "src") },
    },
    server: {
        port: 5173,
        proxy: {
            "/api": apiTarget,
        },
    },
});
