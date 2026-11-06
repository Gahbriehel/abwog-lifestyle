import { CalendarDays, ChevronLeft, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorCard } from "@/components/events/EventsEmpty";
import { buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Misc";
import { cn } from "@/lib/cn";
import { getEvent } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { CATEGORY_LABELS, formatEventWhen, registrationState } from "@/lib/events";
import type { EventSummary } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

async function load(id: string): Promise<EventSummary | "error"> {
  try {
    return await getEvent(id);
  } catch (error) {
    if (error instanceof DoveError && (error.status === 404 || error.status === 400)) notFound();
    console.error("event failed", error instanceof Error ? error.message : error);
    return "error";
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    return { title: (await getEvent(id)).title };
  } catch {
    return { title: "Event" };
  }
}

export default async function EventPage({ params }: Params) {
  const { id } = await params;
  const event = await load(id);

  const back = (
    <Link href="/events" className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1 self-start rounded-[var(--radius-control)] px-2 text-sm font-semibold text-primary hover:underline lg:mb-5">
      <ChevronLeft aria-hidden className="size-4" />
      All events
    </Link>
  );

  if (event === "error") {
    return (
      <>
        {back}
        <ErrorCard title="We couldn't load this event." hint="Please check your connection and try again." />
      </>
    );
  }

  const state = registrationState(event);
  return (
    <>
      {back}
      {/* Phone: image, title, key facts + action, then the details. Desktop: details left, facts card pinned right. */}
      <div
        className={cn(
          "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-10",
          event.imageUrl
            ? "[grid-template-areas:'media'_'head'_'aside'_'body'] lg:grid-rows-[auto_auto_1fr] lg:[grid-template-areas:'media_aside'_'head_aside'_'body_aside']"
            : "[grid-template-areas:'head'_'aside'_'body'] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'head_aside'_'body_aside']",
        )}
      >
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt=""
            width={1200}
            height={675}
            unoptimized
            className="aspect-video w-full rounded-[var(--radius-card)] object-cover [grid-area:media]"
          />
        )}
        <header className="[grid-area:head]">
          <Badge tone="primary">{CATEGORY_LABELS[event.category] ?? event.category}</Badge>
          <h1 className="type-title mt-3">{event.title}</h1>
        </header>

        <aside
          aria-label="Event details"
          className="self-start rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-xs [grid-area:aside] lg:sticky lg:top-26"
        >
          <ul className="space-y-3 text-[15px]">
            <li className="flex items-start gap-3">
              <CalendarDays aria-hidden className="mt-0.5 size-[18px] shrink-0 text-gold" />
              <span>{formatEventWhen(event.startDate, event.endDate)}</span>
            </li>
            {event.location && (
              <li className="flex items-start gap-3">
                <MapPin aria-hidden className="mt-0.5 size-[18px] shrink-0 text-gold" />
                <span className="min-w-0 break-words">{event.location}</span>
              </li>
            )}
            {event.capacity != null && state === "open" && (
              <li className="flex items-start gap-3">
                <Users aria-hidden className="mt-0.5 size-[18px] shrink-0 text-gold" />
                <span>Limited to {event.capacity} people</span>
              </li>
            )}
          </ul>
          <div className="mt-5 border-t border-border pt-5">
            {state === "open" && (
              <Link href={`/events/${event.id}/register`} className={buttonClasses("primary", true, undefined, "lg")}>
                Register
              </Link>
            )}
            {state === "full" && <Notice>This event is full. Registration is closed.</Notice>}
            {state === "ended" && <Notice>This event has ended.</Notice>}
            {state === "not-required" && <Notice>No registration needed. Everyone is welcome, just show up.</Notice>}
          </div>
        </aside>

        <div className="[grid-area:body] lg:max-w-prose">
          {event.description && <p className="whitespace-pre-line text-pretty leading-relaxed text-fg-muted">{event.description}</p>}

          {event.highlights && event.highlights.length > 0 && (
            <section aria-labelledby="highlights" className="mt-8">
              <h2 id="highlights" className="type-heading">
                Highlights
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-fg-muted marker:text-gold">
                {event.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[var(--radius-control)] bg-surface-muted px-4 py-3 text-center text-sm text-fg-muted">{children}</p>;
}
