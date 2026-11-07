"use client";

import { Bell, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ALL_PUSH_TOPICS, PUSH_TOPICS } from "@/lib/push";
import {
  detectPushAvailability,
  isDeviceSubscribed,
  readSavedTopics,
  sendTestPush,
  subscribeDevice,
  unsubscribeDevice,
  updateDeviceTopics,
  type PushAvailability,
} from "@/lib/push-client";
import type { PushTopic } from "@/lib/types";

/**
 * Topic choices are hidden for now: turning notifications on subscribes the device to every topic.
 * Flip this to bring the picker back; the saved-topics plumbing below is already wired up.
 */
const SHOW_TOPIC_PICKER = false;

function Shell({ children, onTripleClick }: { children: React.ReactNode; onTripleClick?: () => void }) {
  return (
    <section aria-labelledby="notifications-title" className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-xs sm:p-6">
      {/* Easter egg: triple-clicking the title sends a test notification (see `test` below). */}
      <h2
        id="notifications-title"
        onClick={(e) => {
          if (e.detail === 3) onTripleClick?.();
        }}
        className="type-heading flex select-none items-center gap-2"
      >
        <Bell aria-hidden className="size-5 text-primary" />
        Notifications
      </h2>
      {children}
    </section>
  );
}

/** Subscribes this device to push and lets the member choose which topics to receive. */
export function NotificationsCard() {
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [topics, setTopics] = useState<PushTopic[]>(ALL_PUSH_TOPICS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await detectPushAvailability();
      const on = found === "ready" && (await isDeviceSubscribed());
      if (cancelled) return;
      setAvailability(found);
      setSubscribed(on);
      setDenied(found === "ready" && Notification.permission === "denied");
      if (SHOW_TOPIC_PICKER) setTopics(readSavedTopics());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (availability === null) return null;

  if (availability === "ios-install") {
    return (
      <Shell>
        <p className="mt-2 text-sm text-fg-muted">
          On iPhone, notifications work from the app on your Home Screen. Tap <Share aria-hidden className="inline size-4 align-text-bottom" />{" "}
          <strong>Share</strong>, then <SquarePlus aria-hidden className="inline size-4 align-text-bottom" /> <strong>Add to Home Screen</strong>,
          and open the app from there.
        </p>
      </Shell>
    );
  }

  if (availability !== "ready") {
    return (
      <Shell>
        <p className="mt-2 text-sm text-fg-muted">
          {availability === "no-worker"
            ? "Notifications are available in the installed app."
            : "This browser does not support push notifications."}
        </p>
      </Shell>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (subscribed) {
        if (await unsubscribeDevice()) setSubscribed(false);
        else setMessage("Could not turn notifications off. Please try again.");
        return;
      }
      const outcome = await subscribeDevice(topics);
      if (outcome.ok) setSubscribed(true);
      else if (outcome.reason === "denied") {
        setDenied(Notification.permission === "denied");
        setMessage("Notifications are blocked. Allow them in your browser or phone settings, then try again.");
      } else setMessage(outcome.message ?? "Could not turn notifications on. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const changeTopic = async (topic: PushTopic) => {
    const previous = topics;
    const next = previous.includes(topic) ? previous.filter((t) => t !== topic) : [...previous, topic];
    setTopics(next);
    setMessage(null);
    if (!(await updateDeviceTopics(next))) {
      setTopics(previous);
      setMessage("Could not save that change. Please try again.");
    }
  };

  const test = async () => {
    setBusy(true);
    setMessage((await sendTestPush()) ? "Test sent. It should arrive in a moment." : "Could not send the test. Please try again later.");
    setBusy(false);
  };

  return (
    <Shell onTripleClick={subscribed && !busy ? test : undefined}>
      <p className="mt-1 text-sm text-fg-muted">Prayer alerts, confessions, scriptures and encouragement on this device.</p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span id="push-switch-label" className="text-sm font-semibold">
          Enable on this device
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={subscribed}
          aria-labelledby="push-switch-label"
          disabled={busy || denied}
          onClick={toggle}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-55",
            subscribed ? "bg-primary" : "bg-border-strong",
          )}
        >
          <span
            aria-hidden
            className={cn("inline-block size-5 rounded-full bg-surface shadow-xs transition-transform", subscribed ? "translate-x-6" : "translate-x-1")}
          />
        </button>
      </div>

      {denied && (
        <p role="status" className="mt-3 text-sm text-danger">
          Notifications are blocked for this app. Allow them in your browser or phone settings.
        </p>
      )}

      {subscribed && SHOW_TOPIC_PICKER && (
        <fieldset className="mt-4 border-t border-border pt-4">
          <legend className="type-eyebrow text-fg-muted">Topics</legend>
          <div className="mt-2 grid gap-1">
            {PUSH_TOPICS.map((topic) => (
              <label key={topic.id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={topics.includes(topic.id)}
                  onChange={() => changeTopic(topic.id)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
                />
                <span>
                  <span className="block text-sm font-semibold">{topic.label}</span>
                  <span className="block text-sm text-fg-muted">{topic.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-fg-muted">
          {message}
        </p>
      )}
    </Shell>
  );
}
