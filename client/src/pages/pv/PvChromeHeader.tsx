import React from "react";
import { Link, useLocation } from "wouter";
import { Command, Microscope, Settings } from "lucide-react";

/** Paths relative to `/pv` nest — do not prefix `/pv` or wouter doubles the segment. */
const LINKS = [
  { href: "/", label: "Workbench" },
  { href: "/api-tech", label: "API Doc" },
  { href: "/msa-search", label: "MSA" },
  { href: "/openfold", label: "OpenFold3" },
  { href: "/evo2", label: "Evo2" },
  { href: "/boltz2", label: "Boltz2" },
  { href: "/genmol", label: "GenMol" },
] as const;

export default function PvChromeHeader({
  onCommandPaletteOpen,
  onSettingsOpen,
}: {
  onCommandPaletteOpen: () => void;
  onSettingsOpen: () => void;
}) {
  const [loc] = useLocation();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPaletteOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCommandPaletteOpen]);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[#2A2A2A] bg-[#0C0C0C] px-2 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[#F2F2F2] hover:text-white">
          <div className="flex h-6 w-6 items-center justify-center border border-[#5A5A5A]">
            <Microscope size={12} className="text-[#A8DCA8]" />
          </div>
          <span className="hidden text-xs font-semibold tracking-tight sm:inline">BIOLABS</span>
        </Link>
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-[#5A5A5A] sm:inline">PV</span>
        <nav className="ml-0 flex max-w-[min(72vw,42rem)] flex-1 flex-wrap items-center gap-0.5 overflow-x-auto sm:ml-1">
          {LINKS.map(({ href, label }) => {
            const active =
              href === "/" ? loc === "/" || loc === "" : loc === href || loc.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide transition-colors sm:text-[9px] ${
                  active
                    ? "border-[#A8DCA8] bg-[#141414] text-[#E8E8E8]"
                    : "border-transparent text-[#8A8A8A] hover:border-[#3A3A3A] hover:text-[#D0D0D0]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onCommandPaletteOpen}
          className="flex items-center gap-1 border border-[#2A2A2A] px-2 py-1 font-mono text-[9px] text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
          title="Command palette"
        >
          <Command size={12} />
          <span className="hidden sm:inline">⌘K</span>
        </button>
        <Link
          href="~/settings"
          className="flex items-center gap-1 border border-[#2A2A2A] px-2 py-1 font-mono text-[9px] text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          <Settings size={12} />
          <span className="hidden lg:inline">Setup</span>
        </Link>
        <button
          type="button"
          onClick={onSettingsOpen}
          className="border border-[#2A2A2A] p-1.5 text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
          title="Quick settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
