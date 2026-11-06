import type { Metadata } from "next";
import { EventCard } from "@/components/events/EventCard";
import { EmptyCard, ErrorCard } from "@/components/events/EventsEmpty";
import { getEvents } from "@/lib/dove";
import { upcoming } from "@/lib/events";
import type { EventSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  let events: EventSummary[] | null = null;
  try {
    events = upcoming((await getEvents()).items);
  } catch (error) {
    console.error("events failed", error instanceof Error ? error.message : error);
  }

  return (
    <>
      <h1 className="type-title">Events</h1>
      <p className="mt-1 text-fg-muted">What&apos;s coming up at church.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:mt-8 lg:gap-4 2xl:grid-cols-3">
        {events === null ? (
          <ErrorCard title="We couldn't load events right now." hint="Please check your connection and try again." />
        ) : events.length === 0 ? (
          <EmptyCard title="No upcoming events" hint="Check back soon." />
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </>
  );
}
