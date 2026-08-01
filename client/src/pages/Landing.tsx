import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, Layers, Microscope, Zap, Cpu } from "lucide-react";
import { useLocation } from "wouter";
import BiolabsCipherMark from "@/components/BiolabsCipherMark";
import CommandPalette from "@/components/CommandPalette";
import { setBinaryPendingPrompt } from "@/lib/ai/binaryPendingPrompt";
import { BINARY_PATH, HELIX_PATH, PHAELEON_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

const PAGE_X = "px-[18px] sm:px-7 md:px-[42px]";
const CONTENT_MAX = "mx-auto w-full max-w-5xl";

/**
 * Biolabs landing — navbar + hero AI input + tools + large features.
 */
export default function Landing() {
  const { t } = useTranslation("landing");
  const [, setLocation] = useLocation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openBinary = (prompt?: string) => {
    const text = prompt?.trim();
    if (text) setBinaryPendingPrompt(text);
    setLocation(BINARY_PATH);
  };

  const onAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openBinary(draft);
    setDraft("");
  };

  const features = [
    { icon: Microscope, key: "visualization" as const },
    { icon: Zap, key: "simulation" as const },
    { icon: Layers, key: "layers" as const },
    { icon: Cpu, key: "hud" as const },
  ];

  const navTools = [
    { key: "helix" as const, path: HELIX_PATH },
    { key: "phaeleon" as const, path: PHAELEON_PATH },
  ];

  /** Shared nav type — brand + links use identical mono scale. */
  const navTypeClass = "font-mono text-xs uppercase tracking-[0.12em]";
  const navLinkClass = cn(
    navTypeClass,
    "text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-background text-foreground">
      <nav className="sticky top-0 z-20 shrink-0 border-b border-border bg-background">
        <div
          className={cn(
            CONTENT_MAX,
            "grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3",
            PAGE_X,
          )}
        >
          <button
            type="button"
            onClick={() => setLocation("/")}
            className={cn(
              navTypeClass,
              "justify-self-start text-foreground transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            aria-label="BIOLABS"
          >
            Biolabs
          </button>
          <button
            type="button"
            onClick={() => openBinary()}
            className="justify-self-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={t("tools.binary.name")}
          >
            <BiolabsCipherMark className={navTypeClass} />
          </button>
          <div className="flex items-center justify-self-end gap-5">
            {navTools.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setLocation(item.path)}
                className={navLinkClass}
              >
                {t(`tools.${item.key}.name`)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              className={cn(navLinkClass, "tracking-widest")}
              aria-expanded={navOpen}
              aria-label={t("nav.more")}
            >
              ···
            </button>
          </div>
        </div>
        {navOpen ? (
          <div className="border-t border-border bg-card">
            <div className={cn(CONTENT_MAX, "flex flex-wrap justify-end gap-3 py-3", PAGE_X)}>
              <button
                type="button"
                onClick={() => {
                  setNavOpen(false);
                  openBinary();
                }}
                className={cn(navTypeClass, "text-accent transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent")}
              >
                {t("tools.binary.name")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNavOpen(false);
                  setCommandPaletteOpen(true);
                }}
                className={navLinkClass}
              >
                ⌘K
              </button>
            </div>
          </div>
        ) : null}
      </nav>

      <main className={cn(CONTENT_MAX, "flex flex-1 flex-col", PAGE_X)}>
        {/*
          Hero parent for title + ask form.
          Children centered on the section's Y-axis via grid place-content.
        */}
        <section
          className="grid min-h-[calc(100dvh-3.5rem)] shrink-0 place-content-center py-[18px] text-center sm:py-7"
          aria-labelledby="landing-hero-title"
        >
          <div className="flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-7">
            <h1
              id="landing-hero-title"
              className="max-w-3xl text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-5xl md:text-[56px]"
            >
              {t("hero.title")}
            </h1>
            <p className="max-w-xl font-mono text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
              {t("hero.subtitle")}
            </p>
            <form
              onSubmit={onAskSubmit}
              className="flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-card px-[18px] py-2.5 transition-colors focus-within:border-accent"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("askPlaceholder")}
                className="min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label={t("askPlaceholder")}
              />
              <button
                type="submit"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  draft.trim()
                    ? "bg-foreground text-background hover:opacity-90"
                    : "bg-muted text-muted-foreground",
                )}
                aria-label={t("askAi")}
              >
                <ArrowUp size={16} />
              </button>
            </form>
          </div>
        </section>

        <section className="shrink-0 py-[42px]" aria-labelledby="landing-tools-heading">
          <h2
            id="landing-tools-heading"
            className="mb-7 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {t("tools.title")}
          </h2>
          <ul className="flex flex-col gap-6">
            {navTools.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setLocation(item.path)}
                  className="group w-full border border-transparent bg-transparent p-[18px] text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-border hover:bg-card hover:shadow-[0_1px_0_0_var(--border)] focus-visible:border-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="mb-2 flex flex-wrap items-baseline gap-3">
                    <span className="text-2xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-3xl">
                      {t(`tools.${item.key}.name`)}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                      {t(`tools.${item.key}.tagline`)}
                    </span>
                  </div>
                  <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {t(`tools.${item.key}.description`)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="shrink-0 pb-[42px] pt-0" aria-labelledby="landing-features-heading">
          <h2
            id="landing-features-heading"
            className="mb-7 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {t("featuresTitle")}
          </h2>
          <div className="flex flex-col gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.key}
                  className="rounded-[25px] border border-transparent bg-transparent px-[18px] py-7 sm:px-7 sm:py-[28px]"
                >
                  <Icon size={22} className="mb-5 text-accent" strokeWidth={1.5} />
                  <h3 className="mb-3 text-xl font-semibold tracking-tight sm:text-2xl">
                    {t(`features.${feature.key}.title`)}
                  </h3>
                  <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {t(`features.${feature.key}.description`)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <CommandPalette
        scope="landing"
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
