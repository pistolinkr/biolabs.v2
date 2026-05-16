# Phase 6 — Scaling jobs (optional)

When a single Node process is no longer enough:

- Run **Redis** for shared state.
- Add **BullMQ** (or similar) workers for GPU/long-running NVIDIA jobs.
- Replace `server/core/jobs/store.ts` file writes with DB rows or Redis hashes.
- Keep `/api/ai/*` on Express as the only public surface; workers call the same `executeJob` logic or a extracted `runProviderTask` module.

The current MVP uses **JSON files under `data/jobs/`** and in-process execution.
