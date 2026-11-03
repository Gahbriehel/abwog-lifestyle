import Image from "next/image";
import type { ReactNode } from "react";
import { church } from "@/lib/church";
import { cn } from "@/lib/cn";

export function ChurchLogo({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-logo-bg ring-2 ring-gold-fill ring-offset-2 ring-offset-bg",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/icon-gold.png"
        alt=""
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62 * (437 / 532))}
        priority
      />
    </span>
  );
}

/** Full header (claim screen) or compact header (everything after). */
export function ChurchHeader({ variant = "compact" }: { variant?: "full" | "compact" }) {
  if (variant === "full") {
    return (
      <header className="flex flex-col items-center text-center">
        <ChurchLogo size={68} />
        <p className="mt-4 text-balance font-serif text-xl font-semibold leading-tight">
          {church.name}
        </p>
        <p className="mt-1 text-sm text-fg-muted">({church.formerName})</p>
      </header>
    );
  }
  return (
    <header className="flex items-center gap-3 border-b border-border pb-4">
      <ChurchLogo size={36} />
      <p className="font-serif text-[17px] font-semibold leading-tight">{church.name}</p>
    </header>
  );
}

export function DoveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M4 15c3 0 5-1.5 6-4.5L12 5c1 2 1 4 0 6 2-1.5 4.5-2 7-1.5-1 3-3.5 5.5-7 6.5-2.5.7-5 .5-8-1Z" />
      <path d="M17 7.5h.01" />
    </svg>
  );
}

export function PoweredByDove({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center justify-center gap-1.5 text-sm text-fg-muted", className)}>
      <DoveMark className="size-4" />
      Powered by <span className="font-semibold text-fg">Dove</span>
    </p>
  );
}

export function IconCircle({
  children,
  tone = "gold",
  size = "lg",
}: {
  children: ReactNode;
  tone?: "gold" | "primary";
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        size === "lg" ? "size-20 [&_svg]:size-9" : "size-14 [&_svg]:size-7",
        tone === "gold" ? "bg-gold-soft text-gold" : "bg-primary-soft text-primary-soft-fg",
      )}
    >
      {children}
    </span>
  );
}
