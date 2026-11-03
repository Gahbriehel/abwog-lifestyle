import { Loader2 } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "text";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary shadow-sm hover:bg-primary-hover active:bg-primary-hover",
  secondary:
    "border border-border-strong bg-surface text-fg hover:bg-surface-muted",
  text: "min-h-11 px-3 text-primary underline-offset-4 hover:underline",
};

export function buttonClasses(
  variant: Variant = "primary",
  fullWidth = false,
  className?: string,
) {
  return cn(base, variants[variant], fullWidth && "w-full", className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  fullWidth,
  loading,
  loadingLabel,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, fullWidth, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        icon
      )}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export function ButtonLink({
  variant = "primary",
  fullWidth,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={buttonClasses(variant, fullWidth, className)} {...props}>
      {icon}
      {children}
    </a>
  );
}
