import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: {
    port: Number(process.env.PORT || 20185),
    host: "0.0.0.0",
  },
  preview: {
    port: Number(process.env.PORT || 20185),
    host: "0.0.0.0",
  },
});