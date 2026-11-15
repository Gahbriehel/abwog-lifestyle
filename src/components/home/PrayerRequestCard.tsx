import { HeartHandshake } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";

/** Home entry point to the prayer request form. Shown to everyone. */
export function PrayerRequestCard() {
  return (
    <section aria-label="Prayer request" className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="type-card flex items-center gap-2">
        <HeartHandshake aria-hidden className="size-4 text-primary" />
        Need prayer?
      </h2>
      <p className="mt-1 text-balance text-sm text-fg-muted">
        Send us your request and our prayer team will stand with you.
      </p>
      <Link href="/prayer" className={buttonClasses("secondary", false, "mt-4")}>
        Send a prayer request
      </Link>
    </section>
  );
}
