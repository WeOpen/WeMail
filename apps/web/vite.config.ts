import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"]
  }
});
