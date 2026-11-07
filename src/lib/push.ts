import { z } from "zod";
import type { PushTopic } from "./types";

export const PUSH_TOPICS: readonly { id: PushTopic; label: string; description: string }[] = [
  { id: "night-prayer", label: "Night Prayer", description: "Prayer start and reminder alerts" },
  { id: "confessions", label: "Confessions", description: "Daily and seasonal confession reminders" },
  { id: "scriptures", label: "Scriptures", description: "The weekly and yearly scripture" },
  { id: "encouragement", label: "Encouragement", description: "Short words of faith" },
];

export const ALL_PUSH_TOPICS: PushTopic[] = PUSH_TOPICS.map((t) => t.id);

export const pushTopicsSchema = z.array(z.enum(ALL_PUSH_TOPICS as [PushTopic, ...PushTopic[]])).max(ALL_PUSH_TOPICS.length);

/** What `PushSubscription.toJSON()` gives us, checked before it goes to Dove. Dove also requires https. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1024),
  keys: z.object({ p256dh: z.string().min(1).max(255), auth: z.string().min(1).max(255) }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/** The URL-safe base64 VAPID key as the bytes `pushManager.subscribe` wants. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
