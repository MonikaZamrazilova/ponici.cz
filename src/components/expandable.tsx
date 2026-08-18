import { useState, useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type ExpandableProps = {
  children: ReactNode;
  className?: string;
};

export function Expandable({ children, className = "" }: ExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const contentId = `expand-${id}`;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2 py-1"
      >
        {expanded ? "Skrýt podrobnosti" : "Zjistit více"}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={contentId}
        inert={!expanded}
        className="grid transition-[grid-template-rows] duration-[400ms] ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-5 text-[16px] leading-[1.85] text-foreground/75 md:text-[17px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
