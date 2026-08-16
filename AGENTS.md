# AGENTS.md

## Cursor Cloud specific instructions

Biolabs is a single-service web app: a molecular-visualization / bioinformatics
workstation. The frontend (React 19 + Vite + Tailwind 4) and all backend API
routes are served by **one process** during development.

### Running it
- Dev server: `pnpm dev` (Vite, `--host`, port `3000`). This is the primary way
  to develop and test. In dev, the API is **not** a separate Express process —
  Vite middleware plugins in `vite.config.ts` serve `/api/ai/*`,
  `/api/phaeleon/*`, and `/api/workflow/status`, mirroring the production Express
  server in `server/index.ts`.
- `/api/uniprot`, `/api/rcsb-search`, `/api/rcsb-files`, `/api/alphafold` are
  reverse proxies to external public databases (require outbound network egress).
  Loading/searching structures will fail without egress to those hosts.
- Production (only needed to test the built artifact): `pnpm build` then
  `pnpm start` (runs `dist/index.js` Express server, serves `dist/public`).
- Standard commands live in `package.json` scripts; CI (`.github/workflows/ci.yml`)
  runs only `pnpm install --frozen-lockfile` + `pnpm build`.

### Lint / test / typecheck
- Typecheck: `pnpm check` (`tsc --noEmit`). There is no ESLint; `pnpm format`
  runs Prettier.
- Tests: `pnpm test` (`vitest run`). The repo currently ships **no** test files,
  so this passes via `passWithNoTests` — a green run does not mean coverage.

### AI features are optional
- The AI assistant (`/api/ai`) and the Phaeleon FDA translation path stay
  disabled until server-side keys are set in `.env` (see `.env.example`:
  `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY`, `FDA_API_KEY`).
  Without them `/api/ai/status` returns `{"configured": false}` — this is
  expected, and the core structure-viewer flow works without any keys.
- `pnpm ai:smoke` checks `/api/ai/status` + `/api/ai/chat` against a running dev
  server; it exits `2` (not a failure) when no provider keys are configured.
- Keys are server-only. Never expose them as `VITE_*`. Restart `pnpm dev` after
  editing `.env`.

### Gotchas
- `pnpm install` prints "Ignored build scripts" for `esbuild` /
  `@tailwindcss/oxide`. This is fine — they ship prebuilt binaries and `pnpm build`
  succeeds without approving them. Do not add `pnpm approve-builds` (interactive).
- The core "hello world" flow: open `/helix`, use the Source panel to search RCSB
  (e.g. PDB id `1CRN` or "hemoglobin"), and load a hit to render the 3D structure
  in the NGL viewport. Main routes: `/` (landing), `/helix`, `/binary`,
  `/phaeleon`, `/settings`.
