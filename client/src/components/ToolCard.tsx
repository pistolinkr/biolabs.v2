import React from "react";
import { cn } from "@/lib/utils";

export type ToolStatus = "LIVE" | "BETA" | "SOON";

export interface ToolCardProps {
  name: string;
  route: string;
  tagline: string;
  description: string;
  status: ToolStatus;
  icon: React.ReactNode;
  /** When omitted (SOON), card is non-navigating per P0. */
  onOpen?: () => void;
  className?: string;
}

function statusClass(status: ToolStatus): string {
  if (status === "LIVE") return "border-accent text-accent";
  if (status === "BETA") return "border-border text-muted-foreground";
  return "border-border text-muted-foreground opacity-50";
}

/**
 * Landing hub tool registry card — Frame A ToolCard tokens.
 * Zero radius. Card itself is the entry point (no separate CTA).
 */
export default function ToolCard({
  name,
  route,
  tagline,
  description,
  status,
  icon,
  onOpen,
  className,
}: ToolCardProps) {
  const interactive = Boolean(onOpen);
  const Comp = interactive ? "button" : "div";

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={interactive ? onOpen : undefined}
      aria-disabled={!interactive || undefined}
      className={cn(
        "group w-full border border-border bg-card p-4 text-left transition-colors",
        interactive ? "cursor-pointer hover:border-accent" : "cursor-default",
        className,
      )}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex size-[18px] shrink-0 items-center justify-center overflow-hidden text-accent [&>svg]:size-[18px] [&>img]:size-[18px]">
            {icon}
          </span>
          <h3 className="text-sm font-medium text-foreground">{name}</h3>
          <span className="border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {route}
          </span>
          <span
            className={cn(
              "ml-auto border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
              statusClass(status),
            )}
          >
            {status}
          </span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{tagline}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </Comp>
  );
}
