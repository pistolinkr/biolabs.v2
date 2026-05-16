import "dotenv/config";
import express from "express";
import { createAiRouter } from "./core/ai/router.js";

/**
 * Standalone API on port 3001 (optional). Default `pnpm dev` serves `/api/ai` inside Vite —
 * use this file with `pnpm dev:api` for debugging the BFF without the frontend.
 */
const app = express();
app.use("/api/ai", createAiRouter());

const port = Number(process.env.BIOLABS_API_PORT ?? 3001);
app.listen(port, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`[biolabs-api] http://127.0.0.1:${port}/api/ai/health`);
});
