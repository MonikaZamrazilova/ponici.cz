import { useEffect, useRef, useState, type ReactNode } from "react";

type SectionProps = {
  id?: string;
  background?: "cream";
  narrow?: boolean;
  snap?: boolean;
  children: ReactNode;
};

export function Section({ id, background, narrow, snap, children }: SectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!snap);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }
    if (!snap) {
      setVisible(true);
      return;
    }
    const el = contentRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
      },
      { threshold: 0.18 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [snap]);

  return (
    <section
      id={id}
      className={`relative py-20 md:py-28${
        background === "cream" ? " bg-cream" : ""
      }${snap ? " md:snap-start md:min-h-[100svh]" : ""}`}
    >
      <div
        ref={snap ? contentRef : undefined}
        className={`mx-auto px-6 md:px-10 transition-[opacity,transform] duration-[700ms] ease-out${
          narrow ? " max-w-4xl" : " max-w-7xl"
        }${snap && !visible ? " opacity-0 translate-y-6" : " opacity-100 translate-y-0"}`}
      >
        {children}
      </div>
    </section>
  );
}
