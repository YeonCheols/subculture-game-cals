import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
    proxy: {
      "/remote-api": {
        target: "https://subculture-schdule-api.vercel.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/remote-api/, "/api/v1"),
      },
    },
  },
  plugins: [react()],
});
