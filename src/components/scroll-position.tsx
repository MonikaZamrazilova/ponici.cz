"use client";

import { useEffect, useRef, useState } from "react";

type Position = "top" | "middle" | "bottom";

const POSITION_LABEL: Record<Position, string> = {
  top: "Nahoře",
  middle: "Uprostřed",
  bottom: "Dole",
};

/** Aktuální pozice stránky — krátká stránka (bez scrollu) je vždy TOP. */
function computePosition(): Position {
  const doc = document.documentElement;
  const max = Math.max(0, doc.scrollHeight - window.innerHeight);
  if (max <= 1) return "top";
  const y = window.scrollY;
  if (y <= 1) return "top";
  if (max - y <= 1) return "bottom";
  return "middle";
}

/**
 * Indikátor pozice stránky — TOP / MIDDLE / BOTTOM.
 *
 * Client-only (žádný hydration mismatch), pasivní scroll listener
 * s rAF throttlingem; state se mění jen při přechodu mezi zónami
 * (žádné re-rendery při každém pixelu scrollu). ResizeObserver na
 * <body> pokrývá změny výšky obsahu (lazy obrázky, otevřené sekce).
 * Fixed + pointer-events-none → žádný layout shift, žádná kolize s UI.
 */
export function ScrollPositionIndicator() {
  const [position, setPosition] = useState<Position>("top");
  const zoneRef = useRef<Position>("top");

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const next = computePosition();
      if (next !== zoneRef.current) {
        zoneRef.current = next;
        setPosition(next);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(document.body);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-3 top-1/2 z-30 -translate-y-1/2 md:right-5"
    >
      <div className="flex flex-col items-center gap-2 rounded-full border border-border/70 bg-background/85 px-2.5 py-2 shadow-sm backdrop-blur-sm">
        <span className="h-1 w-1 rounded-full bg-foreground/25" />
        <span className="text-micro uppercase tracking-caption text-foreground/60">
          {POSITION_LABEL[position]}
        </span>
        <span className="h-1 w-1 rounded-full bg-foreground/25" />
      </div>
    </div>
  );
}
