import React, { useEffect, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import BiolabsCipherMark from "@/components/BiolabsCipherMark";
import { useNavbarFixed } from "@/hooks/useNavbarFixed";
import { setBinaryPendingPrompt } from "@/lib/ai/binaryPendingPrompt";
import { BINARY_PATH, HELIX_PATH, PHAELEON_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

const PAGE_X = "px-[18px] sm:px-7 md:px-[42px]";
const CONTENT_MAX = "mx-auto w-full max-w-5xl";
const TOP_REVEAL_PX = 12;
const TOP_HIDE_PX = 72;
/** Landing: tuck after scrolling past this; show again when nearer the top. */
const SCROLL_HIDE_PX = 48;
const SCROLL_SHOW_PX = 20;

interface BiolabsNavProps {
  /** BOA5: stay tucked by default; reveal only when pointer hits the top edge. */
  autoHide?: boolean;
  /** Landing: hide while scrolling down; show again near the top of the page. */
  hideOnScroll?: boolean;
  /** Scroll container for hideOnScroll (landing root). Falls back to window. */
  scrollParentRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Shared site navbar — Biolabs (left) · BOA5 (center) · Helix / Phaeleon (right).
 */
export default function BiolabsNav({
  autoHide = false,
  hideOnScroll = false,
  scrollParentRef,
  className,
}: BiolabsNavProps) {
  const { t } = useTranslation("landing");
  const [location, setLocation] = useLocation();
  const [navbarFixed] = useNavbarFixed();
  /** Default tucked on BOA5 — not a temporary post-enter hide. */
  const [hidden, setHidden] = useState(autoHide && !navbarFixed);
  const [hovering, setHovering] = useState(false);

  const openBinary = (prompt?: string) => {
    const text = prompt?.trim();
    if (text) setBinaryPendingPrompt(text);
    setLocation(BINARY_PATH);
  };

  const navTools = [
    { key: "helix" as const, path: HELIX_PATH },
    { key: "phaeleon" as const, path: PHAELEON_PATH },
  ];

  /** Settings → pin navbar: always visible, no auto-hide / scroll-hide. */
  const tuckable = !navbarFixed && (autoHide || hideOnScroll);
  const effectiveAutoHide = tuckable && autoHide;
  const effectiveHideOnScroll = tuckable && hideOnScroll;

  useEffect(() => {
    if (navbarFixed) {
      setHidden(false);
      return;
    }
    if (autoHide) {
      setHidden(true);
      return;
    }
    if (hideOnScroll) {
      setHidden(false);
      return;
    }
    setHidden(false);
  }, [autoHide, hideOnScroll, navbarFixed]);

  // BOA5 — pointer at top edge reveals tucked nav.
  useEffect(() => {
    if (!effectiveAutoHide) return;

    const onMove = (e: MouseEvent) => {
      if (e.clientY <= TOP_REVEAL_PX) {
        setHidden(false);
        return;
      }
      if (!hovering && e.clientY > TOP_HIDE_PX) {
        setHidden(true);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [effectiveAutoHide, hovering]);

  // Landing — hide after scroll; show near top.
  useEffect(() => {
    if (!effectiveHideOnScroll) return;

    const root = scrollParentRef?.current ?? null;

    const readTop = () => {
      if (root) return root.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const onScroll = () => {
      if (hovering) return;
      const top = readTop();
      if (top <= SCROLL_SHOW_PX) {
        setHidden(false);
        return;
      }
      if (top >= SCROLL_HIDE_PX) {
        setHidden(true);
      }
    };

    onScroll();
    if (root) {
      root.addEventListener("scroll", onScroll, { passive: true });
      return () => root.removeEventListener("scroll", onScroll);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [effectiveHideOnScroll, scrollParentRef, hovering]);

  const navTypeClass = "font-mono text-xs uppercase tracking-[0.12em]";
  const navLinkClass = cn(
    navTypeClass,
    "text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
  );

  const linkClass = (path: string) =>
    cn(
      navLinkClass,
      location === path || location.startsWith(`${path}/`) ? "text-foreground" : null,
    );

  return (
    <div
      className={cn(
        "biolabs-nav-shell relative z-30 shrink-0",
        // BOA5: collapse flex height. Landing scroll-hide: keep sticky slot (no reflow flicker).
        effectiveAutoHide && "biolabs-nav-shell--autohide",
        effectiveAutoHide && hidden && "is-hidden",
        className,
      )}
    >
      {/* Invisible top hit target while tucked away (BOA5 pointer reveal) */}
      {effectiveAutoHide && hidden ? (
        <div
          className="absolute inset-x-0 top-0 z-40 h-3"
          onMouseEnter={() => setHidden(false)}
          aria-hidden
        />
      ) : null}

      <nav
        className={cn(
          "biolabs-nav-bar sticky top-0 border-b border-border bg-background",
          tuckable && "biolabs-nav-bar--autohide",
          tuckable && hidden && "is-hidden",
        )}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false);
          if (effectiveAutoHide) setHidden(true);
          if (effectiveHideOnScroll) {
            const root = scrollParentRef?.current;
            const top = root
              ? root.scrollTop
              : window.scrollY || document.documentElement.scrollTop || 0;
            if (top >= SCROLL_HIDE_PX) setHidden(true);
          }
        }}
      >
        <div
          className={cn(
            CONTENT_MAX,
            PAGE_X,
            "grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center gap-3",
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
            className={cn(
              "justify-self-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
              location === BINARY_PATH ? "opacity-100" : "opacity-90 hover:opacity-100",
            )}
            aria-label={t("tools.binary.name")}
            aria-current={location === BINARY_PATH ? "page" : undefined}
          >
            <BiolabsCipherMark className={navTypeClass} />
          </button>
          <div className="flex items-center justify-self-end gap-5">
            {navTools.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setLocation(item.path)}
                className={linkClass(item.path)}
                aria-current={location === item.path ? "page" : undefined}
              >
                {t(`tools.${item.key}.name`)}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
