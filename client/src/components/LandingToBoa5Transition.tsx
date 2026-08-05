import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import BiolabsCipherMark from "@/components/BiolabsCipherMark";
import { endBoa5Transition } from "@/lib/ai/greetingHandoff";
import { cn } from "@/lib/utils";

interface LandingToBoa5TransitionProps {
  active: boolean;
  userText: string;
}

type Phase = "idle" | "enter" | "morph";

/** Keep in sync with BinaryHome dock padding (pb-5 / sm:pb-7). */
const MORPH_MS = 720;
const ENTER_HOLD_MS = 40;

const PAGE_X = "px-[18px] sm:px-7 md:px-[42px]";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Shared-element style handoff: same canvas, ask widens + docks.
 * Docked geometry mirrors BinaryHome composer footer exactly.
 */
export default function LandingToBoa5Transition({ active, userText }: LandingToBoa5TransitionProps) {
  const { t } = useTranslation("landing");
  const [phase, setPhase] = useState<Phase>(() => (active ? "enter" : "idle"));

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }

    if (prefersReducedMotion()) {
      setPhase("morph");
      const endTimer = window.setTimeout(() => {
        endBoa5Transition();
        setPhase("idle");
      }, 40);
      return () => window.clearTimeout(endTimer);
    }

    setPhase("enter");
    const morphTimer = window.setTimeout(() => setPhase("morph"), ENTER_HOLD_MS);
    const endTimer = window.setTimeout(() => {
      endBoa5Transition();
      setPhase("idle");
    }, ENTER_HOLD_MS + MORPH_MS);

    return () => {
      window.clearTimeout(morphTimer);
      window.clearTimeout(endTimer);
    };
  }, [active]);

  if (!active && phase === "idle") return null;

  const docked = phase === "morph";

  return (
    <div className="boa5-route-transition fixed inset-0 z-[80] flex flex-col bg-background" aria-hidden>
      {/* Same auto-hide nav collapse as BOA5 (height → 0 when docked). */}
      <div
        className={cn(
          "biolabs-nav-shell biolabs-nav-shell--autohide shrink-0 overflow-hidden",
          docked && "is-hidden",
        )}
      >
        <div
          className={cn(
            "biolabs-nav-bar biolabs-nav-bar--autohide mx-auto flex h-14 w-full max-w-5xl items-center justify-center border-b border-border",
            PAGE_X,
            docked && "is-hidden",
          )}
        >
          <BiolabsCipherMark className="font-mono text-xs tracking-[0.12em]" />
        </div>
      </div>

      {/* Mirrors Binary page: full-width column, content max-w-5xl */}
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-[42%] -translate-y-[calc(100%+2.5rem)]",
            PAGE_X,
            "boa5-ask-morph-title",
            docked && "is-docked",
          )}
        >
          <p className="mx-auto max-w-3xl text-center text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-5xl md:text-[56px]">
            {t("hero.titleActive")}
          </p>
        </div>

        {/*
          Dock geometry = BinaryHome footer:
          mx-auto max-w-5xl + PAGE_X + justify-center + pb-5/sm:pb-7 + max-w-3xl composer.
          `translateY(-100%)` when docked pins the pill bottom to the padding edge (height-safe).
        */}
        <div
          className={cn(
            "absolute inset-x-0 mx-auto flex w-full max-w-5xl justify-center",
            PAGE_X,
            "boa5-ask-morph-pill",
            docked ? "is-docked" : "is-hero",
          )}
        >
          <div className="boa5-ask-morph-pill__inner w-full">
            {userText ? (
              <div className="flex w-full items-center gap-2 rounded-full border border-accent bg-card px-[18px] py-2.5">
                <span className="min-w-0 flex-1 truncate px-1 text-left text-sm text-foreground">
                  {userText}
                </span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <span className="block size-2 animate-pulse rounded-full bg-background" />
                </span>
              </div>
            ) : (
              <div className="flex h-9 w-full items-center rounded-full border border-border bg-card px-[18px] py-2.5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
