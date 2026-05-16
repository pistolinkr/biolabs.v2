import "dotenv/config";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import express, { type Request, type Response } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createAiRouter } from "./core/ai/router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Hop-by-hop and headers unsafe to forward when piping a decoded body from fetch(). */
const OMIT_HEADER = new Set(
  ["connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length"].map((h) =>
    h.toLowerCase(),
  ),
);

async function forwardToOrigin(
  originBase: string,
  req: Request,
  res: Response,
  pathPrefix: string,
): Promise<void> {
  const suffix = req.originalUrl.slice(pathPrefix.length) || "/";
  const targetUrl = `${originBase}${suffix}`;

  const headers: Record<string, string> = {
    Accept: req.get("accept") ?? "application/json",
  };

  const init: RequestInit = { method: req.method, headers };

  if (req.method !== "GET" && req.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(req.body ?? {});
  }

  const ac = new AbortController();
  const onClose = () => ac.abort();
  req.once("close", onClose);

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(targetUrl, { ...init, signal: ac.signal });
  } catch {
    req.off("close", onClose);
    if (!res.headersSent) res.status(502).send("Proxy error");
    return;
  }

  res.status(upstream.status);

  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (OMIT_HEADER.has(k)) return;
    try {
      res.setHeader(key, value);
    } catch {
      /* ignore invalid header names */
    }
  });

  req.off("close", onClose);

  if (upstream.status === 204 || req.method === "HEAD") {
    res.end();
    return;
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  try {
    const nodeReadable = Readable.fromWeb(upstream.body as import("stream/web").ReadableStream);
    await pipeline(nodeReadable, res);
  } catch (err) {
    const aborted =
      err instanceof Error && (err.name === "AbortError" || ("code" in err && (err as NodeJS.ErrnoException).code === "ERR_STREAM_PREMATURE_CLOSE"));
    if (aborted) return;
    if (!res.headersSent) {
      res.status(502).send("Proxy error");
    } else {
      res.destroy();
    }
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "2mb" }));

  app.use("/api/ai", createAiRouter());

  app.use("/api/uniprot", (req, res) =>
    forwardToOrigin("https://rest.uniprot.org", req, res, "/api/uniprot"),
  );

  app.use("/api/rcsb-search", (req, res) =>
    forwardToOrigin("https://search.rcsb.org", req, res, "/api/rcsb-search"),
  );

  app.use("/api/rcsb-files", (req, res) =>
    forwardToOrigin("https://files.rcsb.org", req, res, "/api/rcsb-files"),
  );

  app.use("/api/alphafold", (req, res) =>
    forwardToOrigin("https://alphafold.ebi.ac.uk", req, res, "/api/alphafold"),
  );

  app.use("/api/rcsb-data", (req, res) =>
    forwardToOrigin("https://data.rcsb.org", req, res, "/api/rcsb-data"),
  );

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
