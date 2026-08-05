import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;

// Load server-side secrets for dev middleware (/api/ai/*).
loadDotenv({ path: path.join(PROJECT_ROOT, ".env") });
loadDotenv({ path: path.join(PROJECT_ROOT, ".env.local"), override: true });

const AI_HANDLERS_PATH = path.join(PROJECT_ROOT, "server/core/ai/handlers.ts");
const PHAELEON_ROUTER_PATH = path.join(PROJECT_ROOT, "server/core/phaeleon/routes.ts");
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

/** Dev-only: AI assistant routes (mirrors production Express /api/ai). */
function vitePluginAiAssistantDev(): Plugin {
  return {
    name: "biolabs-ai-assistant-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith("/api/ai")) return next();

        try {
          // ssrLoadModule resolves @shared/* aliases; bare import() cannot.
          const { handleAiChat, handleAiStatus } = await server.ssrLoadModule(AI_HANDLERS_PATH);

          if (req.method === "GET" && url === "/api/ai/status") {
            const { status, json } = handleAiStatus();
            res.writeHead(status, {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            });
            res.end(JSON.stringify(json));
            return;
          }

          if (req.method === "POST" && url === "/api/ai/chat") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });
            req.on("end", async () => {
              try {
                const parsed = body ? JSON.parse(body) : {};
                const { status, json } = await handleAiChat(parsed);
                res.writeHead(status, {
                  "Content-Type": "application/json; charset=utf-8",
                  "Cache-Control": "no-store",
                });
                res.end(JSON.stringify(json));
              } catch (e) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Invalid JSON" }));
              }
            });
            return;
          }

          next();
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : "AI dev middleware error" }));
        }
      });
    },
  };
}

/** Dev-only: Phaeleon FDA + translation routes (mirrors production Express /api/phaeleon). */
function vitePluginPhaeleonDev(): Plugin {
  return {
    name: "biolabs-phaeleon-dev",
    configureServer(server: ViteDevServer) {
      let subAppPromise: Promise<import("express").Express> | null = null;

      const loadSubApp = () => {
        if (!subAppPromise) {
          subAppPromise = (async () => {
            const express = (await import("express")).default;
            const { createPhaeleonRouter } = await server.ssrLoadModule(PHAELEON_ROUTER_PATH);
            const sub = express();
            sub.use(express.json({ limit: "512kb" }));
            sub.use(createPhaeleonRouter());
            return sub;
          })();
        }
        return subAppPromise;
      };

      server.middlewares.use("/api/phaeleon", (req, res, next) => {
        void loadSubApp()
          .then((sub) => sub(req, res, next))
          .catch((e) => {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: e instanceof Error ? e.message : "Phaeleon dev middleware error",
              }),
            );
          });
      });
    },
  };
}

/** Dev-only: same shape as production GET /api/workflow/status when queue is empty. */
function vitePluginWorkflowStatusDev(): Plugin {
  return {
    name: "biolabs-workflow-status-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (req.method === "GET" && url === "/api/workflow/status") {
          const body = JSON.stringify({
            connected: true,
            jobs: [],
            queueDepth: 0,
            lastPipelineError: null,
          });
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          });
          res.end(body);
          return;
        }
        next();
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector(),
  vitePluginWorkflowStatusDev(),
  vitePluginAiAssistantDev(),
  vitePluginPhaeleonDev(),
  vitePluginStorageProxy(),
];

export default defineConfig({
  plugins,
  optimizeDeps: {
    include: ["ngl"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    proxy: {
      "/api/uniprot": {
        target: "https://rest.uniprot.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/uniprot/, ""),
      },
      "/api/rcsb-search": {
        target: "https://search.rcsb.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/rcsb-search/, ""),
      },
      "/api/rcsb-files": {
        target: "https://files.rcsb.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/rcsb-files/, ""),
      },
      "/api/alphafold": {
        target: "https://alphafold.ebi.ac.uk",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/alphafold/, ""),
      },
    },
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
