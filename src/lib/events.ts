import type { EventCategory, EventSummary } from "./types";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  GENERAL: "General",
  CONFERENCE: "Conference",
  VIGIL: "Vigil",
  COMMUNION: "Communion",
  REVIVAL: "Revival",
  WORSHIP: "Worship",
  OUTREACH: "Outreach",
};

/** Church is in Lagos; format in its timezone so server and phone agree. */
const TZ = "Africa/Lagos";

const dayFmt = new Intl.DateTimeFormat("en-NG", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-NG", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

const dayKey = (d: Date) => dayKeyFmt.format(d);

/** "Sun, 8 Nov 2026 · 9:00 am" or "Fri, 6 Nov 2026 · 6:00 pm – Sat, 7 Nov 2026 · 6:00 am". */
export function formatEventWhen(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime())) return "";
  const lower = (s: string) => s.replace(/\s?(AM|PM)$/i, (m) => m.toLowerCase());
  const startText = `${dayFmt.format(start)} · ${lower(timeFmt.format(start))}`;
  if (Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) return startText;
  if (dayKey(start) === dayKey(end)) return `${startText} – ${lower(timeFmt.format(end))}`;
  return `${startText} – ${dayFmt.format(end)} · ${lower(timeFmt.format(end))}`;
}

/** Day-of-month and short month for the date badge on cards. */
export function dateBadge(startIso: string): { day: string; month: string } {
  const d = new Date(startIso);
  return {
    day: new Intl.DateTimeFormat("en-NG", { timeZone: TZ, day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat("en-NG", { timeZone: TZ, month: "short" }).format(d),
  };
}

export function hasEnded(event: Pick<EventSummary, "endDate">, now = new Date()): boolean {
  return new Date(event.endDate).getTime() < now.getTime();
}

/** Dove lists past events too; the app shows what is still ahead, soonest first. */
export function upcoming<T extends Pick<EventSummary, "endDate" | "startDate">>(events: T[], now = new Date()): T[] {
  return events
    .filter((e) => !hasEnded(e, now))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function isFull(event: Pick<EventSummary, "capacity" | "registeredCount">): boolean {
  return event.capacity != null && (event.registeredCount ?? 0) >= event.capacity;
}

export type RegistrationState = "open" | "full" | "ended" | "not-required";

export function registrationState(event: EventSummary, now = new Date()): RegistrationState {
  if (hasEnded(event, now)) return "ended";
  if (!event.requiresRegistration) return "not-required";
  if (isFull(event)) return "full";
  return "open";
}

/** "Hello Amazing" for guests, "Hello Amazing Sarah," for members. */
export function greeting(greetingName: string, firstName?: string | null): string {
  return firstName ? `Hello ${greetingName} ${firstName},` : `Hello ${greetingName},`;
}
