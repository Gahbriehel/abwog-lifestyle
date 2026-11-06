import { ArrowRight, HandHeart } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { InstallCard } from "@/components/onboarding/InstallCard";
import { buttonClasses } from "@/components/ui/Button";
import { appUrl } from "@/lib/app-url";
import { church } from "@/lib/church";
import { getEvents } from "@/lib/dove";
import { greeting, upcoming } from "@/lib/events";
import { loadSession } from "@/lib/member";
import type { EventSummary } from "@/lib/types";

async function loadUpcoming(): Promise<EventSummary[]> {
  try {
    return upcoming((await getEvents({ limit: 20 })).items).slice(0, 3);
  } catch (error) {
    // The home page still works without events.
    console.error("home events failed", error instanceof Error ? error.message : error);
    return [];
  }
}

export default async function HomePage() {
  const [session, events] = await Promise.all([loadSession(), loadUpcoming()]);
  const person = session?.person;

  return (
    <>
      <header>
        <h1 className="type-title">{greeting(church.greetingName, person?.firstName)}</h1>
        <p className="mt-1 text-fg-muted">
          {person ? `Welcome back to ${church.shortName}.` : "Your church family, in your pocket."}
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:mt-8 lg:grid-cols-3 lg:gap-6">
        <section
          aria-label="Welcome"
          className="flex flex-col justify-center rounded-[var(--radius-card)] bg-hero p-5 text-on-hero shadow-sm dark:ring-1 dark:ring-inset dark:ring-white/5 sm:p-7 lg:col-span-2 lg:p-8"
        >
          <h2 className="type-heading text-balance text-xl sm:text-2xl lg:text-[1.75rem]">Welcome to {church.shortName}</h2>
          <p className="mt-2 max-w-prose text-balance text-[15px] opacity-90">
            Find out what&apos;s happening at {church.name} and stay connected.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link href="/events" className={buttonClasses("inverse")}>
              Browse events
            </Link>
            {!person && (
              <Link href="/profile" className={buttonClasses("inverse-outline")}>
                Update my details
              </Link>
            )}
          </div>
        </section>

        <section aria-label="Giving" className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3.5">
            <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
              <HandHeart className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="type-card">Sow a seed</h2>
              <p className="mt-0.5 text-sm text-fg-muted">Give your tithes and offerings by bank transfer.</p>
            </div>
          </div>
          <Link href="/give" className={buttonClasses("secondary", true, "mt-5 lg:mt-auto")}>
            Giving details
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </section>
      </div>

      <section aria-labelledby="upcoming" className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 id="upcoming" className="type-heading">
            Upcoming events
          </h2>
          {events.length > 0 && (
            <Link href="/events" className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] px-2 text-sm font-semibold text-primary hover:underline">
              See all
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
          {events.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-border px-5 py-8 text-center text-sm text-fg-muted md:col-span-full">
              No upcoming events right now. Check back soon.
            </p>
          ) : (
            events.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </div>
      </section>

      <div className="mt-10 lg:max-w-xl">
        <InstallCard appUrl={appUrl()} />
      </div>
      <a
        href={church.websiteUrl}
        className="mt-8 self-center text-sm font-semibold text-primary underline-offset-4 hover:underline lg:self-start"
      >
        Visit {church.websiteUrl.replace(/^https?:\/\//, "")}
      </a>
    </>
  );
}
