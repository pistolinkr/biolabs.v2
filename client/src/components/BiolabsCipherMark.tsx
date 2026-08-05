import { cn } from "@/lib/utils";

/** Cipher wordmark — same mono system as landing nav links. */
const CIPHER_GLYPHS = ["B", "O", "A", "5"] as const;

interface BiolabsCipherMarkProps {
  className?: string;
  /** Accessible name (plain BIOLABS). */
  label?: string;
}

export default function BiolabsCipherMark({
  className,
  label = "BIOLABS",
}: BiolabsCipherMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex font-mono text-xs font-normal uppercase tracking-[0.12em] text-foreground",
        className,
      )}
      aria-label={label}
      title={label}
    >
      {CIPHER_GLYPHS.join("")}
    </span>
  );
}
