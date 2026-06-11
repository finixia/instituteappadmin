import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:4000",
      "/students": "http://localhost:4000",
      "/exams": "http://localhost:4000",
      "/fees": "http://localhost:4000",
      "/attendance": "http://localhost:4000",
      "/parent": "http://localhost:4000"
    }
  }
});

