"use client";

import { changePushTopics, sendTestNotification, subscribeToPush, unsubscribeFromPush } from "@/app/push-actions";
import { isIOS } from "./install";
import { ALL_PUSH_TOPICS, urlBase64ToUint8Array } from "./push";
import { readStored, writeStored } from "./storage";
import type { PushTopic } from "./types";

export type PushAvailability =
  | "ios-install" // iPhone/iPad in Safari: Web Push only works from the Home Screen app
  | "unsupported"
  | "no-worker" // supported, but no service worker is running (it is only registered in production)
  | "ready";

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** iOS Safari has no `PushManager` until the app is on the Home Screen, so check for iOS first. */
export async function detectPushAvailability(): Promise<PushAvailability> {
  if (isIOS(navigator.userAgent) && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return (await navigator.serviceWorker.getRegistration()) ? "ready" : "no-worker";
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function isDeviceSubscribed(): Promise<boolean> {
  return (await currentSubscription()) !== null && Notification.permission === "granted";
}

const TOPICS_KEY = "abwog:push-topics";

/** Dove has no read endpoint for a device's topics, so the choice is remembered on the device. */
export function readSavedTopics(): PushTopic[] {
  try {
    const parsed: unknown = JSON.parse(readStored(TOPICS_KEY) ?? "null");
    if (Array.isArray(parsed)) return ALL_PUSH_TOPICS.filter((t) => parsed.includes(t));
  } catch {
    // fall through to the default
  }
  return ALL_PUSH_TOPICS;
}

function saveTopics(topics: PushTopic[]): void {
  writeStored(TOPICS_KEY, JSON.stringify(topics));
}

export type SubscribeOutcome = { ok: true } | { ok: false; reason: "denied" | "failed"; message?: string };

/** Must be called from a click: the permission prompt needs a user gesture. */
export async function subscribeDevice(topics: PushTopic[]): Promise<SubscribeOutcome> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, reason: "failed", message: "Notifications are not set up yet." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return { ok: false, reason: "failed" };

  try {
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }));
    const json = subscription.toJSON();
    const result = await subscribeToPush({ endpoint: json.endpoint, keys: json.keys }, topics);
    if (!result.ok) return { ok: false, reason: "failed", message: result.message };
    saveTopics(topics);
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function updateDeviceTopics(topics: PushTopic[]): Promise<boolean> {
  const subscription = await currentSubscription();
  if (!subscription) return false;
  const result = await changePushTopics(subscription.endpoint, topics);
  if (result.ok) saveTopics(topics);
  return result.ok;
}

export async function unsubscribeDevice(): Promise<boolean> {
  const subscription = await currentSubscription();
  if (!subscription) return true;
  // Tell Dove first so it stops sending, then drop the browser's side.
  const result = await unsubscribeFromPush(subscription.endpoint);
  if (!result.ok) return false;
  return subscription.unsubscribe();
}

export async function sendTestPush(): Promise<boolean> {
  const subscription = await currentSubscription();
  if (!subscription) return false;
  return (await sendTestNotification(subscription.endpoint)).ok;
}
