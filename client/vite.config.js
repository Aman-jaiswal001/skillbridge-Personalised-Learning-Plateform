import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const apiUrl = process.env.VITE_API_URL;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": apiUrl ? apiUrl : "http://localhost:5000" ,
    },
  },
});
