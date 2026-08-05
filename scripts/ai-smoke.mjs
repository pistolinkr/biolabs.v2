#!/usr/bin/env node
/**
 * Smoke-test platform AI (/api/ai/status + optional /api/ai/chat).
 * Never prints API keys. Exit 0 when healthy; 1 on failure; 2 when not configured.
 *
 *   AI_SMOKE_BASE_URL=http://127.0.0.1:3000 pnpm ai:smoke
 */

const base = (process.env.AI_SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function log(label, value) {
  console.log(`${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

async function main() {
  console.log(`[ai-smoke] base=${base}`);

  let statusRes;
  try {
    statusRes = await fetch(`${base}/api/ai/status`, { cache: "no-store" });
  } catch (e) {
    console.error(`[ai-smoke] status fetch failed: ${e instanceof Error ? e.message : e}`);
    console.error("[ai-smoke] Is the dev server running? (pnpm dev)");
    process.exit(1);
  }

  const statusText = await statusRes.text();
  let status;
  try {
    status = JSON.parse(statusText);
  } catch {
    console.error(`[ai-smoke] status non-JSON HTTP ${statusRes.status}: ${statusText.slice(0, 200)}`);
    process.exit(1);
  }

  if (!statusRes.ok || typeof status.configured !== "boolean") {
    console.error(`[ai-smoke] bad status HTTP ${statusRes.status}`, status);
    process.exit(1);
  }

  log("configured", status.configured);
  log("active_provider", status.active_provider);
  log("available_providers", status.available_providers ?? []);
  log("server_provider", status.server_provider);
  log("models", status.models ?? {});
  if (Array.isArray(status.provider_health)) {
    for (const h of status.provider_health) {
      const cool = h.cooldown_until ? ` cooldown_until=${h.cooldown_until}` : "";
      console.log(`provider_health: ${h.id} models=${(h.models ?? []).join(",") || "—"}${cool}`);
    }
  }

  if (!status.configured) {
    console.error(
      "[ai-smoke] FAIL: no platform providers configured. Add GEMINI_API_KEY or OPENROUTER_API_KEY to .env and restart pnpm dev.",
    );
    process.exit(2);
  }

  const body = {
    messages: [{ role: "user", content: "Reply with exactly: pong" }],
    context: {
      assembled_at: new Date().toISOString(),
      context_fingerprint: "ai-smoke",
      workstation: "binary",
    },
    intent: "general",
    generation: { maxOutputTokens: 64, temperature: 0 },
  };

  const t0 = Date.now();
  let chatRes;
  try {
    chatRes = await fetch(`${base}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`[ai-smoke] chat fetch failed: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  const chatText = await chatRes.text();
  let chat;
  try {
    chat = JSON.parse(chatText);
  } catch {
    console.error(`[ai-smoke] chat non-JSON HTTP ${chatRes.status}: ${chatText.slice(0, 200)}`);
    process.exit(1);
  }

  const latency = Date.now() - t0;

  if (!chatRes.ok || !chat.message) {
    console.error(`[ai-smoke] chat FAIL HTTP ${chatRes.status}`, {
      code: chat.code,
      error: chat.error,
      latency_ms: latency,
    });
    process.exit(1);
  }

  log("chat.provider", chat.provider);
  log("chat.model", chat.model);
  log("chat.fell_back", Boolean(chat.fell_back));
  log("chat.attempt_count", Array.isArray(chat.attempts) ? chat.attempts.length : null);
  log("chat.latency_ms", latency);
  log("chat.message_preview", String(chat.message).slice(0, 80).replace(/\s+/g, " "));
  console.log("[ai-smoke] OK");
  process.exit(0);
}

main();
