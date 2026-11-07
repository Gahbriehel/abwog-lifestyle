"use client";

import { Moon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { clockOffset, countdownLabel, nextBoundary, phaseAt } from "@/lib/night-prayer";
import type { NightPrayerNext } from "@/lib/types";

const MIN_REFETCH_MS = 5_000;

interface Loaded {
  data: NightPrayerNext;
  /** Add to the phone's clock to get the server's. */
  offset: number;
}

/** Tonight's prayer on the home page. Hidden when Dove has no active night prayer. */
export function NightPrayerCard() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [localNow, setLocalNow] = useState(() => Date.now());
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    lastFetch.current = Date.now();
    try {
      const res = await fetch("/api/night-prayer/next", { cache: "no-store" });
      if (!res.ok) return; // keep showing what we have
      const data = (await res.json()) as NightPrayerNext;
      setLocalNow(Date.now());
      setLoaded({ data, offset: clockOffset(data, Date.now()) });
    } catch {
      // Offline: the card keeps its last state.
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(initial);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  useEffect(() => {
    if (!loaded) return;
    const boundary = nextBoundary(loaded.data);
    const timer = setInterval(() => {
      const now = Date.now();
      setLocalNow(now);
      // Throttled so a wrong server clock can't turn into a request every second.
      if (boundary !== null && now + loaded.offset >= boundary && now - lastFetch.current >= MIN_REFETCH_MS) void load();
    }, 1000);
    return () => clearInterval(timer);
  }, [loaded, load]);

  if (!loaded) return null;
  const { data, offset } = loaded;
  const serverNow = localNow + offset;
  const phase = phaseAt(data, serverNow);
  if (phase === "inactive") return null;

  const live = phase === "live";
  const countdown = phase === "upcoming" ? countdownLabel(data.startsAt, serverNow) : null;

  return (
    <section aria-label="Night prayer" className="relative overflow-hidden rounded-[var(--radius-card)] bg-hero p-5 text-on-hero sm:p-6">
      {data.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded image on Dove's host
        <img src={data.imageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-15" />
      )}
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-card flex items-center gap-2">
            <Moon aria-hidden className="size-4" />
            {data.title || "Night Prayer"}
          </h2>
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-fill px-2.5 py-1 text-xs font-bold text-on-gold">
              <span aria-hidden className="size-2 animate-pulse rounded-full bg-on-gold motion-reduce:animate-none" />
              LIVE NOW
            </span>
          )}
          {phase === "cancelled" && (
            <span className="rounded-full bg-on-hero/15 px-2.5 py-1 text-xs font-semibold">Cancelled</span>
          )}
        </div>

        <p className="text-sm leading-relaxed opacity-90">{data.description || "Join us every night as we end the day in prayer."}</p>

        {phase === "cancelled" ? (
          <p className="rounded-[var(--radius-control)] bg-on-hero/10 p-3 text-sm">{data.note || "No prayer tonight. God bless you."}</p>
        ) : phase === "ended" ? (
          <p className="text-sm opacity-90">Tonight&rsquo;s prayer has ended. See you tomorrow at the usual time!</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" aria-live="off">
              {live ? "Prayer is in progress" : countdown}
            </p>
            {live && data.meetUrl ? (
              <ButtonLink variant="inverse" href={data.meetUrl} target="_blank" rel="noopener noreferrer">
                Join prayer
              </ButtonLink>
            ) : (
              <Button variant="inverse" disabled>
                Join opens shortly
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
