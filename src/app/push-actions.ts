"use server";

import { sendPushTest, subscribePush, unsubscribePush, updatePushTopics } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { pushSubscriptionSchema, pushTopicsSchema } from "@/lib/push";
import { getSessionToken } from "@/lib/session";
import { z } from "zod";

export type PushResult = { ok: true } | { ok: false; message: string };

const endpointSchema = pushSubscriptionSchema.shape.endpoint;

function failure(error: unknown): PushResult {
  if (error instanceof DoveError && error.status === 429) {
    return { ok: false, message: "Too many tries. Please wait a little and try again." };
  }
  console.error("push action failed", error instanceof DoveError ? error.status : error);
  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * Registers this device. The member's token never reaches browser JS: it is read from the
 * HTTP-only session cookie here, so a signed-in member's device is linked to them and a guest's isn't.
 */
export async function subscribeToPush(subscription: unknown, topics: unknown): Promise<PushResult> {
  const parsed = z.object({ subscription: pushSubscriptionSchema, topics: pushTopicsSchema }).safeParse({ subscription, topics });
  if (!parsed.success) return { ok: false, message: "This device could not be registered." };
  try {
    await subscribePush(parsed.data.subscription, parsed.data.topics, (await getSessionToken()) ?? undefined);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function unsubscribeFromPush(endpoint: unknown): Promise<PushResult> {
  const parsed = endpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false, message: "This device could not be found." };
  try {
    await unsubscribePush(parsed.data);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function changePushTopics(endpoint: unknown, topics: unknown): Promise<PushResult> {
  const parsed = z.object({ endpoint: endpointSchema, topics: pushTopicsSchema }).safeParse({ endpoint, topics });
  if (!parsed.success) return { ok: false, message: "Those topics could not be saved." };
  try {
    await updatePushTopics(parsed.data.endpoint, parsed.data.topics);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function sendTestNotification(endpoint: unknown): Promise<PushResult> {
  const parsed = endpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false, message: "This device could not be found." };
  try {
    await sendPushTest(parsed.data);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
