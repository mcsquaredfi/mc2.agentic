import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [cloudflare(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      ignored: [
        '**/.specstory/**', // Ignore all files in .specstory and its subfolders
      ],
      awaitWriteFinish: {
        stabilityThreshold: 200, // Wait for 200ms of silence after the last change
        pollInterval: 100,       // How often to poll for changes
      },
    },
  },
});
