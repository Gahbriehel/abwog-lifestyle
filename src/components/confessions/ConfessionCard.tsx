import { ChevronRight, Headphones } from "lucide-react";
import Link from "next/link";
import { features } from "@/lib/church";
import { hasAudio, lengthLabel, listensLabel } from "@/lib/confessions";
import type { ConfessionSummary } from "@/lib/types";

export function ConfessionCard({ item }: { item: ConfessionSummary }) {
  const meta = [lengthLabel(item), features.showListenCounts ? listensLabel(item.listenCount) : null].filter(Boolean);
  return (
    <Link
      href={`/confessions/${item.slug}`}
      className="group flex h-full items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong/60 hover:shadow-sm"
    >
      <span
        aria-hidden
        className="type-card flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-primary-soft-fg"
      >
        {item.position ?? "·"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="type-card break-words group-hover:text-primary">{item.title}</span>
        <span className="mt-0.5 text-sm text-fg-muted">{meta.join(" · ")}</span>
        {item.excerpt && <span className="mt-1 truncate text-sm text-fg-muted">{item.excerpt}</span>}
      </span>
      {hasAudio(item.audio) && <Headphones aria-label="Has audio" className="size-5 shrink-0 text-primary" />}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-fg-muted" />
    </Link>
  );
}
