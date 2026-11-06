"use client";

import { BookOpen } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import type { CurrentScriptures, Scripture } from "@/lib/types";

const TABS = [
  { key: "week", label: "This week" },
  { key: "year", label: "This year" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Quote({ scripture }: { scripture: Scripture }) {
  return (
    <figure>
      <blockquote className="font-serif text-[17px] italic leading-relaxed text-balance">
        &ldquo;{scripture.text}&rdquo;
      </blockquote>
      <figcaption className="mt-3 text-[15px] font-semibold text-primary-soft-fg">
        {scripture.reference}
        {scripture.translation && <span className="ml-1.5 font-normal text-fg-muted">({scripture.translation})</span>}
        {scripture.givenBy && <span className="mt-0.5 block text-sm font-normal text-fg-muted">{scripture.givenBy}</span>}
      </figcaption>
    </figure>
  );
}

/** The scripture for the week and for the year. Shows whichever exist; renders nothing when neither does. */
export function ScriptureCard({ scriptures }: { scriptures: CurrentScriptures }) {
  const id = useId();
  const available = TABS.filter((t) => scriptures[t.key] !== null);
  const [chosen, setChosen] = useState<TabKey>("week");
  if (available.length === 0) return null;

  const selected = available.some((t) => t.key === chosen) ? chosen : available[0].key;
  const scripture = scriptures[selected];
  if (!scripture) return null;

  return (
    <section aria-label="Scripture" className="rounded-[var(--radius-card)] bg-primary-soft p-5 text-fg sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-card flex items-center gap-2 text-primary-soft-fg">
          <BookOpen aria-hidden className="size-4" />
          Scripture
        </h2>
        {available.length > 1 && (
          <div role="tablist" aria-label="Scripture period" className="flex rounded-full bg-surface/60 p-0.5">
            {available.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`${id}-${t.key}-tab`}
                aria-selected={selected === t.key}
                aria-controls={`${id}-panel`}
                onClick={() => setChosen(t.key)}
                className={cn(
                  "min-h-9 rounded-full px-3.5 text-sm font-semibold transition-colors",
                  selected === t.key ? "bg-surface text-primary-soft-fg shadow-xs" : "text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        id={`${id}-panel`}
        role={available.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={available.length > 1 ? `${id}-${selected}-tab` : undefined}
        className="mt-4"
      >
        <Quote scripture={scripture} />
      </div>
    </section>
  );
}
