import type { ReactNode, AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { ArrowUpRight } from "lucide-react";

type BaseProps = {
  variant?: "primary" | "secondary" | "link";
  icon?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonAsAnchor = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & { href: string };
type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: never };

type ButtonProps = ButtonAsAnchor | ButtonAsButton;

const variants: Record<"primary" | "secondary" | "link", string> = {
  primary:
    "group inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-[13px] tracking-wide text-background transition-transform duration-500 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2",
  secondary:
    "inline-flex items-center gap-2 rounded-full border border-foreground/25 px-7 py-3.5 text-[13px] tracking-wide text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2",
  link: "inline-flex items-center gap-2 text-sm text-foreground underline decoration-sage decoration-2 underline-offset-[10px] transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2",
};

export function Button(props: ButtonProps) {
  const { variant = "primary", icon = true, children, className = "", ...rest } = props;

  const content = (
    <>
      {children}
      {icon && (
        <ArrowUpRight
          className={`h-4 w-4${
            variant === "primary"
              ? " transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              : ""
          }`}
        />
      )}
    </>
  );

  if ("href" in rest && rest.href) {
    const { href, ...anchorRest } = rest;
    return (
      <a
        href={href}
        className={`${variants[variant]}${className ? " " + className : ""}`}
        {...anchorRest}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={`${variants[variant]}${className ? " " + className : ""}`}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
