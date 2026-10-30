import devServer from "@hono/vite-dev-server"
import path from "path"
import fs from "node:fs"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

function copyPublicFiles(): Plugin {
  return {
    name: "resilient-public-copy",
    apply: "build",
    async closeBundle() {
      const source = path.resolve(__dirname, "public");
      const destination = path.resolve(__dirname, process.env.VITE_PREVIEW === "1" ? "dist-preview" : "dist/public");
      const files = fs.readdirSync(source, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(source, path.join(entry.parentPath, entry.name)));

      for (let pass = 0; pass < 4; pass += 1) {
        const pending = files.filter((relative) => {
          try {
            return fs.statSync(path.join(source, relative)).size !==
              fs.statSync(path.join(destination, relative)).size;
          } catch {
            return true;
          }
        });
        if (pending.length === 0) return;
        if (pass === 3) {
          throw new Error(`Static asset copy incomplete: ${pending.join(", ")}`);
        }

        for (const relative of pending) {
          const target = path.join(destination, relative);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          for (let attempt = 0; attempt < 4; attempt += 1) {
            try {
              fs.copyFileSync(path.join(source, relative), target);
              break;
            } catch (error) {
              if (attempt === 3) throw error;
              await new Promise((resolve) => setTimeout(resolve, 75));
            }
          }
        }
      }
    },
  };
}

// https://vite.dev/config/
const PREVIEW = process.env.VITE_PREVIEW === "1";

export default defineConfig(({ command }) => ({
  base: PREVIEW ? "./" : "/",
  plugins: [
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr(), react(), copyPublicFiles()],
  // Dev serves public/ directly; builds use the retrying copyPublicFiles plugin
  // because this sandbox's mounted filesystem intermittently drops copied files.
  publicDir: command === "build" ? false : "public",
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, PREVIEW ? "dist-preview" : "dist/public"),
    emptyOutDir: true,
  },
}));
