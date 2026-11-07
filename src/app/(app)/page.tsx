import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { ScriptureCard } from "@/components/home/ScriptureCard";
import { InstallCard } from "@/components/onboarding/InstallCard";
import { appUrl } from "@/lib/app-url";
import { church } from "@/lib/church";
import { getCurrentScriptures, getEvents } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { greeting, upcoming } from "@/lib/events";
import { loadSession } from "@/lib/member";
import type { CurrentScriptures, EventSummary } from "@/lib/types";

async function loadUpcoming(): Promise<EventSummary[]> {
  try {
    return upcoming((await getEvents({ limit: 20 })).items).slice(0, 3);
  } catch (error) {
    // The home page still works without events.
    console.error("home events failed", error instanceof Error ? error.message : error);
    return [];
  }
}

async function loadScriptures(): Promise<CurrentScriptures> {
  try {
    return await getCurrentScriptures();
  } catch (error) {
    // The card simply stays hidden. A 404 means Dove hasn't shipped scriptures yet, which isn't worth logging.
    if (!(error instanceof DoveError && error.status === 404)) {
      console.error("home scriptures failed", error instanceof Error ? error.message : error);
    }
    return { week: null, year: null };
  }
}

export default async function HomePage() {
  const [session, events, scriptures] = await Promise.all([loadSession(), loadUpcoming(), loadScriptures()]);
  const person = session?.person;

  return (
    <div className="flex flex-col gap-8 lg:max-w-2xl">
      <header>
        <h1 className="type-title">{greeting(church.greetingName, person?.firstName)}</h1>
        <p className="mt-1 text-fg-muted">
          {person ? `Welcome back to ${church.shortName}.` : "Your church family, in your pocket."}
        </p>
        {!person && (
          <Link
            href="/profile"
            className="mt-3 inline-flex min-h-10 items-center rounded-full bg-primary-soft px-4 text-sm font-semibold text-primary-soft-fg hover:bg-primary-soft/70"
          >
            Update my details
          </Link>
        )}
      </header>

      <ScriptureCard scriptures={scriptures} />

      <section aria-labelledby="upcoming">
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
        <div className="mt-3 grid gap-3">
          {events.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-border px-5 py-8 text-center text-sm text-fg-muted">
              No upcoming events right now. Check back soon.
            </p>
          ) : (
            events.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </div>
      </section>

      <InstallCard appUrl={appUrl()} />

      <a
        href={church.websiteUrl}
        className="self-center text-sm font-semibold text-primary underline-offset-4 hover:underline lg:self-start"
      >
        Visit church website
      </a>
    </div>
  );
}
