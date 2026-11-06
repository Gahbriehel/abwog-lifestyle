import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PoweredByDove } from "./Brand";

/** Single-column phone layout with the "Powered by Dove" footer pinned to the bottom. */
export function Screen({
  children,
  footer = true,
  className,
}: {
  children: ReactNode;
  footer?: boolean;
  className?: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-14 lg:pt-20">
      <main className={cn("flex flex-1 flex-col", className)}>{children}</main>
      {footer && <PoweredByDove className="py-6" />}
    </div>
  );
}
