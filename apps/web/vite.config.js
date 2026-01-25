import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
    server: {
        host: "0.0.0.0",
        // port: 54000,
        proxy: {
            "/api/v1": {
                target: "http://localhost:8080",
                changeOrigin: true,
                // rewrite: (path) => path.replace(/^\/api\/v1/, "/api/v1"),
            },
        },
        logLevel: "info",
    },
    plugins: [react(), tailwindcss()],
})
