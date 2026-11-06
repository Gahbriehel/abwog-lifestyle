import { MapPin } from "lucide-react";
import Link from "next/link";
import { CATEGORY_LABELS, dateBadge, formatEventWhen } from "@/lib/events";
import type { EventSummary } from "@/lib/types";

export function EventCard({ event }: { event: EventSummary }) {
  const { day, month } = dateBadge(event.startDate);
  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex h-full gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong/60 hover:shadow-sm"
    >
      <span
        aria-hidden
        className="flex size-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-primary-soft-fg"
      >
        <span className="type-heading leading-none">{day}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">{month}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="type-eyebrow text-gold">{CATEGORY_LABELS[event.category] ?? event.category}</span>
        <span className="type-card mt-1 break-words group-hover:text-primary">{event.title}</span>
        <span className="mt-1 text-sm text-fg-muted">{formatEventWhen(event.startDate, event.endDate)}</span>
        {event.location && (
          <span className="mt-0.5 flex items-start gap-1.5 text-sm text-fg-muted">
            <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 break-words">{event.location}</span>
          </span>
        )}
      </span>
    </Link>
  );
}
