"use client";

import { AlertCircle, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "primary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold",
        tone === "gold" ? "bg-gold-soft text-gold" : "bg-primary-soft text-primary-soft-fg",
      )}
    >
      {children}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary-soft-fg">
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[var(--radius-control)] bg-surface-muted", className)} />;
}

/** Height animation via grid rows; hidden content is inert so it can't be tabbed into. */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-8 border-t border-border bg-bg/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      {children}
    </div>
  );
}

export function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))]"
    >
      {message && (
        <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[var(--radius-control)] bg-fg px-4 py-3 text-bg shadow-lg">
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p className="flex-1 text-[15px]">{message}</p>
          <button type="button" onClick={onDismiss} className="-m-1 rounded p-1" aria-label="Dismiss">
            <X aria-hidden className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
