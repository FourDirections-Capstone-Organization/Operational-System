/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: ".",
    base: "./",
    plugins: [react()],
    build: {
        outDir: "dist",
        emptyOutDir: true,
        sourcemap: true
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5100',
                changeOrigin: true,
                secure: false,
            },
            '/hubs': {
                target: 'http://localhost:5100',
                changeOrigin: true,
                secure: false,
                ws: true,
            }
        }
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: resolve(__dirname, "src/test/setup.ts"),
        css: true,
    }
});