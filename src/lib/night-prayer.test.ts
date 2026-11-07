import { describe, expect, it } from "vitest";
import { clockOffset, countdownLabel, nextBoundary, phaseAt } from "./night-prayer";
import { pushSubscriptionSchema, urlBase64ToUint8Array } from "./push";
import type { NightPrayerNext } from "./types";

const at = (iso: string) => Date.parse(iso);
const prayer = (over: Partial<NightPrayerNext> = {}): NightPrayerNext => ({
  status: "upcoming",
  title: "Night Prayer",
  description: null,
  imageUrl: null,
  meetUrl: "https://meet.google.com/abc",
  startsAt: "2026-11-08T21:00:00.000Z",
  joinOpensAt: "2026-11-08T20:50:00.000Z",
  endsAt: "2026-11-08T22:00:00.000Z",
  note: null,
  now: "2026-11-08T17:00:00.000Z",
  ...over,
});

describe("phaseAt", () => {
  it("is upcoming before join opens, live until it ends, then ended", () => {
    expect(phaseAt(prayer(), at("2026-11-08T20:49:59Z"))).toBe("upcoming");
    expect(phaseAt(prayer(), at("2026-11-08T20:50:00Z"))).toBe("live");
    expect(phaseAt(prayer(), at("2026-11-08T21:59:59Z"))).toBe("live");
    expect(phaseAt(prayer(), at("2026-11-08T22:00:00Z"))).toBe("ended");
  });
  it("lets the times override a stale live status", () => {
    expect(phaseAt(prayer({ status: "live" }), at("2026-11-08T22:30:00Z"))).toBe("ended");
  });
  it("keeps cancelled, ended and inactive as the API said", () => {
    expect(phaseAt(prayer({ status: "cancelled" }), at("2026-11-08T21:30:00Z"))).toBe("cancelled");
    expect(phaseAt(prayer({ status: "ended" }), at("2026-11-08T21:30:00Z"))).toBe("ended");
    expect(phaseAt(prayer({ status: "inactive" }), 0)).toBe("inactive");
  });
});

describe("nextBoundary", () => {
  it("points at the instant the API answer changes", () => {
    expect(nextBoundary(prayer())).toBe(at("2026-11-08T20:50:00Z"));
    expect(nextBoundary(prayer({ status: "live" }))).toBe(at("2026-11-08T22:00:00Z"));
    expect(nextBoundary(prayer({ status: "ended" }))).toBe(at("2026-11-08T20:50:00Z"));
    expect(nextBoundary(prayer({ status: "cancelled" }))).toBe(at("2026-11-08T22:00:00Z"));
    expect(nextBoundary(prayer({ status: "inactive", joinOpensAt: null, endsAt: null }))).toBeNull();
  });
});

describe("clockOffset", () => {
  it("is how far the phone is behind the server", () => {
    expect(clockOffset({ now: "2026-11-08T17:00:10.000Z" }, at("2026-11-08T17:00:00Z"))).toBe(10_000);
    expect(clockOffset({ now: "nonsense" }, 123)).toBe(0);
  });
});

describe("countdownLabel", () => {
  it("shows hours and minutes, then minutes and seconds", () => {
    expect(countdownLabel("2026-11-08T21:00:00Z", at("2026-11-08T18:55:00Z"))).toBe("Starts in 2h 5m");
    expect(countdownLabel("2026-11-08T21:00:00Z", at("2026-11-08T20:55:50Z"))).toBe("Starts in 4m 10s");
    expect(countdownLabel("2026-11-08T21:00:00Z", at("2026-11-08T21:00:00Z"))).toBeNull();
  });
});

describe("push helpers", () => {
  it("decodes the VAPID key to a 65 byte uncompressed P-256 point", () => {
    const bytes = urlBase64ToUint8Array("BB1x7lLZO33ze87XXCSws0TRhmhajAmv_HHV76Y3GkIsgpx45MDfJPnwIOWDQZdYROXfsDqLdhUA_aegi0f1tW4");
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });
  it("only accepts https endpoints with keys", () => {
    const keys = { p256dh: "a", auth: "b" };
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/x", keys }).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ endpoint: "http://example.com/x", keys }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://example.com/x", keys: { p256dh: "a" } }).success).toBe(false);
  });
});
