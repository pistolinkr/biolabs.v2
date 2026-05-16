import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { createAiRouter } from "./core/ai/router.js";

/**
 * Vite mounts this app at `/api/ai`, but some Connect versions leave `req.url` as
 * `/api/ai/jobs` instead of `/jobs`, so Express routes never match and the request
 * falls through → browser sees 404. Strip a single `/api/ai` prefix when present.
 */
function stripMountPrefix(req: Request, _res: Response, next: NextFunction) {
  const raw = req.url ?? "/";
  const q = raw.indexOf("?");
  const pathOnly = q === -1 ? raw : raw.slice(0, q);
  const qs = q === -1 ? "" : raw.slice(q);
  const prefix = "/api/ai";
  if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
    const rest = pathOnly === prefix ? "/" : pathOnly.slice(prefix.length) || "/";
    req.url = rest + qs;
  }
  next();
}

/**
 * Express app for `/api/ai/*` — mounted in Vite dev/preview so a single process
 * can serve the BFF without a separate port.
 */
export function createAiDevExpressApp(): express.Express {
  const app = express();
  app.use(stripMountPrefix);
  app.use(express.json({ limit: "2mb" }));
  app.use(createAiRouter());
  return app;
}
