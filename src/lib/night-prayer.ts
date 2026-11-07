import type { NightPrayerNext } from "./types";

export type NightPrayerPhase = "upcoming" | "live" | "ended" | "cancelled";

const ms = (iso: string | null): number | null => {
  if (!iso) return null;
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : null;
};

/** Phone clock plus this offset is the server's clock. Zero when `now` is missing or unreadable. */
export function clockOffset(data: Pick<NightPrayerNext, "now">, localNow: number): number {
  const server = ms(data.now);
  return server === null ? 0 : server - localNow;
}

/** What to show at `serverNow`. The API status can go stale between refetches, so the times decide. */
export function phaseAt(data: NightPrayerNext, serverNow: number): NightPrayerPhase | "inactive" {
  if (data.status === "inactive" || data.status === "cancelled") return data.status;
  if (data.status === "ended") return "ended";
  const joinOpens = ms(data.joinOpensAt);
  const ends = ms(data.endsAt);
  if (ends !== null && serverNow >= ends) return "ended";
  if (joinOpens !== null && serverNow >= joinOpens) return "live";
  return data.status === "live" ? "live" : "upcoming";
}

/** The next instant at which the API's answer changes, or null. The card refetches then. */
export function nextBoundary(data: NightPrayerNext): number | null {
  switch (data.status) {
    case "upcoming":
    case "ended": // the fields describe the next occurrence, which opens at joinOpensAt
      return ms(data.joinOpensAt);
    case "live":
    case "cancelled":
      return ms(data.endsAt);
    default:
      return null;
  }
}

export function countdownLabel(startsAt: string | null, serverNow: number): string | null {
  const start = ms(startsAt);
  if (start === null || start <= serverNow) return null;
  const total = Math.floor((start - serverNow) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `Starts in ${hours}h ${minutes}m` : `Starts in ${minutes}m ${seconds}s`;
}
