import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function manualChunks(id: string) {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("@nivo/line")) return "nivo-line";
  if (id.includes("@nivo/bar")) return "nivo-bar";
  if (id.includes("@nivo/pie")) return "nivo-pie";
  if (id.includes("@nivo/legends")) return "nivo-legends";
  if (id.includes("@nivo/axes")) return "nivo-axes";
  if (id.includes("@nivo")) return "nivo-core";
  if (id.includes("react-router")) return "router-vendor";
  if (id.includes("zustand")) return "state-vendor";
  if (id.includes("react-dom")) return "react-dom-vendor";
  if (id.includes("react")) return "react-vendor";
  if (id.includes("lucide-react")) return "icons";
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 260,
    rollupOptions: {
      output: {
        manualChunks
      }
    }
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"]
  }
});
