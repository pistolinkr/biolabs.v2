# Biolabs Design System

Source of truth for UI tokens and rules. Implementation lives in [`client/src/index.css`](client/src/index.css) (`html.dark` / `html.light` CSS variables). Product UX framing: [`docs/design/biolabs-tool-expansion.md`](docs/design/biolabs-tool-expansion.md).

---

## Identity lock

**Dark industrial scientific workstation.**

- Zero radius by default (`--radius: 0`)
- Accent: `#7C8A99` (dark) / `#5A6878` (light)
- Body: Inter · Mono labels: Geist Mono
- Uppercase kickers: 9–10px, tracking ~0.14em–0.16em
- Panels: 1px `border-border`
- **No** gradients, glassmorphism, or consumer SaaS chrome

Tools are utilitarian workstation shells. The landing hub (`/`) is the only marketing surface and may use **documented exceptions** below.

---

## Color system (CSS tokens)

Prefer semantic tokens (`bg-background`, `text-accent`, `border-border`) over hard-coded hex in components.

### Dark (`html.dark`)

| Token | Value | Role |
|-------|--------|------|
| `--background` | `#0A0A0A` | App canvas |
| `--card` | `#111111` | Panels / cards |
| `--popover` | `#202020` | Elevated surfaces |
| `--secondary` | `#2A2A2A` | Secondary fills |
| `--muted` | `#3A3A3A` | Muted fills |
| `--border` | `#2A2A2A` | 1px borders |
| `--input` | `#161616` | Inputs |
| `--foreground` | `#F2F2F2` | Primary text |
| `--muted-foreground` | `#8A8A8A` | Secondary text |
| `--accent` | `#7C8A99` | Accent (cold gray-blue) |
| `--destructive` | `#FF4444` | Errors / danger |
| `--viewport-background` | `#0a0a0a` | NGL / viewport |

### Light (`html.light`)

| Token | Value | Role |
|-------|--------|------|
| `--background` | `#F0F0F0` | App canvas |
| `--card` | `#FFFFFF` | Panels / cards |
| `--border` | `#C8C8C8` | 1px borders |
| `--foreground` | `#141414` | Primary text |
| `--muted-foreground` | `#5A6878` | Secondary text |
| `--accent` | `#5A6878` | Accent |
| `--destructive` | `#CC3333` | Errors / danger |
| `--viewport-background` | `#e4e4e4` | NGL / viewport |

### Theme runtime

- `next-themes` + [`ThemeContext`](client/src/contexts/ThemeContext.tsx)
- `defaultTheme="system"`, `storageKey="theme"`
- Class on `<html>`: `light` | `dark`
- Theme selector lives in Settings → General (not forced on tool pages)

---

## Typography

### Stacks

| Role | Font | Notes |
|------|------|--------|
| Body / UI | Inter (IBM Plex Sans fallback) | `client/index.html` Google Fonts |
| Mono / kickers | Geist Mono (IBM Plex Mono fallback) | `.font-mono` |
| Landing hero H1 only | Newsreader (italic) | `.font-landing-serif` — **do not** reuse on tools |

### Rules

- Kickers: uppercase, 9–11px, mono, wide tracking
- Body: Inter, ~13px base in app shell
- No playful / rounded display fonts outside the landing H1 exception
- Tight scientific density on workstations; landing may use larger display type

---

## Platform surfaces

```
/            Landing hub — nav, AI ask, tools list, features
/binary      BOA5 — bioengineering AI chat (localStorage history)
/helix       Helix — protein visualization workstation [LIVE]
/phaeleon    Phaeleon — drug–drug interaction workstation [BETA]
/settings    Settings
```

Legacy: `/gaster`, `/workspace` → redirect to `/helix`.

Each tool reuses the **workstation shell** (`workstation-shell` + dock layout). Landing is not a dock shell.

---

## Layout architecture (workstations)

```
┌─────────────────────────────────────────────────────┐
│ LEFT PANEL      │ CENTER VIEWPORT │ RIGHT PANEL     │
│ - Controls      │ - WebGL / Scene │ - Properties    │
│ - Hierarchy     │ - Molecular UI  │ - Metrics       │
│ - Datasets      │                 │ - Inspector     │
└─────────────────────────────────────────────────────┘
```

### Typical panel widths

- Left: ~280px
- Right: ~320px
- Center: flex remaining
- Top: shared `BiolabsNav` (~h-14); tool chrome: `ToolBottomBar` (~h-12)

---

## Landing hub (`/`)

File: [`client/src/pages/Landing.tsx`](client/src/pages/Landing.tsx)

### Structure

1. **Navbar** — shared [`BiolabsNav`](client/src/components/BiolabsNav.tsx) on landing + all tools: `Biolabs` (left) · `BOA5` (center) · Helix / Phaeleon / `···` (right). Tool Command / Settings live in [`ToolBottomBar`](client/src/components/ToolBottomBar.tsx).
2. **Hero** — title + subtitle + ask input; section uses `grid` + `place-content-center` with `min-h-[calc(100dvh-3.5rem)]` (center relative to the hero band, not magic margins)
3. **Tools** — Helix / Phaeleon list rows (large type + descriptions)
4. **Feature** — four articles (capabilities copy)

No site footer on landing (version / tagline strip removed).

### Landing content width

- `max-w-5xl`, horizontal padding rhythm: **18px → 28px → 42px** (`px-[18px] sm:px-7 md:px-[42px]`)

### Landing exceptions (only on `/`)

| Element | Rule |
|---------|------|
| Ask AI input | `rounded-full` (pill composer) |
| Feature articles (×4) | `rounded-[25px]`, `bg-transparent`, `border-transparent` |
| Cipher brand | Mono `BOA5` — same `text-xs` / `tracking-[0.12em]` as nav links; `aria-label="BIOLABS"` |
| Hero H1 | Newsreader italic allowed |

Do **not** spread these exceptions into Helix / Phaeleon chrome. **BOA5 (`/binary`)** shares the landing ask pill, hero type scale, and `18/28/42` padding so the handoff reads as one surface.

### Ask AI → BOA5

- Pill composer + hero type match landing ([`BinaryHome`](client/src/components/binary/BinaryHome.tsx))
- Greeting nuance → app-shell transition + local setup chat; other prompts via [`binaryPendingPrompt`](client/src/lib/ai/binaryPendingPrompt.ts)

---

## Component rules

### Default geometry

- **Radius 0** everywhere unless listed under Landing exceptions (or accessibility focus rings)
- **1px borders** via `border-border`
- Separation via borders / background steps — not drop shadows or gradients

### ToolCard (registry card, when used)

| Token | Spec |
|-------|------|
| Container | `bg-card`, `border border-border`, `p-4` (~16px), hover `border-accent` |
| Name row | Icon 18px accent + `text-sm font-medium` + route pill `font-mono` 9px |
| Tagline | `font-mono` 10px uppercase tracking-wider `text-accent` |
| Body | `text-xs text-muted-foreground`, max 2 lines |
| Status | LIVE = `border-accent text-accent` · BETA = `border-border` · SOON = `opacity-50` |
| Radius | **0** |

### Buttons / controls (workstation)

- Sharp corners, thin 1px border
- Hover: border / background step, no glow
- Focus: `focus-visible:outline` + accent outline (a11y)
- Transitions: ~100–150ms color/opacity only

### Icons

- Lucide React
- Accent or muted mono
- Common sizes: 11–22px on landing; 14–16px in headers

---

## Spacing

| Scale | Use |
|-------|-----|
| 4px | Base unit |
| 8–12px | Compact workstation padding |
| 16–18px | Card / article padding floor |
| 24–28px | Section gaps |
| 42px | Landing section vertical max rhythm |

Landing prefers the **18 / 28 / 42** band for section padding. Workstations stay denser (8–16).

---

## Motion

- Minimal and purposeful
- Prefer opacity / color; avoid scale bounce
- Respect `prefers-reduced-motion`
- Keyboard actions: instant

---

## Accessibility

- Visible `:focus-visible` on interactive controls
- WCAG AA contrast (4.5:1 body text)
- Semantic headings (`h1` → `h2` → `h3`) on landing
- Cipher mark exposes accessible name `BIOLABS`
- No color-only status (pair with text pills: LIVE / BETA)

---

## Implementation notes

- **Tailwind v4** + CSS variables in `index.css`
- shadcn/ui primitives are customized toward zero radius and Biolabs tokens
- Command palette: `⌘K` (landing + workstations)
- BOA5 chat persistence: cookie-scoped **localStorage** (`biolabs.binary.chatHistory.v1`) — no DB
- Design Mode (Cursor Browser): `⌘⇧D` for visual editing of the running app

---

## References

| Doc / asset | Purpose |
|-------------|---------|
| [`docs/design/biolabs-tool-expansion.md`](docs/design/biolabs-tool-expansion.md) | Frame A hub + tool IA |
| [`docs/design/biolabs_home_light_engraved.html`](docs/design/biolabs_home_light_engraved.html) | Engraved / boot mood reference (not paste-as-is) |
| [`design/pencil/`](design/pencil/) | Pencil frames / variables |
| [`client/src/index.css`](client/src/index.css) | Live token definitions |
