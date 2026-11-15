"use server";

import { submitPrayerRequest } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { prayerRequestSchema, toPrayerPayload, type PrayerRequestValues } from "@/lib/validation";

export type PrayerActionResult =
  | { ok: true }
  | { ok: false; field?: keyof PrayerRequestValues; message: string };

export async function sendPrayerRequest(input: PrayerRequestValues): Promise<PrayerActionResult> {
  // A filled honeypot means a bot. Say "sent" and drop it, so it learns nothing.
  if (typeof input?.website === "string" && input.website.length > 0) return { ok: true };

  const parsed = prayerRequestSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, field: issue.path[0] as keyof PrayerRequestValues, message: issue.message };
  }

  try {
    await submitPrayerRequest(toPrayerPayload(parsed.data));
    return { ok: true };
  } catch (error) {
    if (error instanceof DoveError) {
      if (error.status === 429) return { ok: false, message: "Too many attempts. Please wait a moment and try again." };
      // Never log the request itself: it can be sensitive.
      console.error("prayer request failed", error.status);
    } else {
      console.error("prayer request failed", error instanceof Error ? error.name : "unknown");
    }
    return { ok: false, message: "We couldn't send your request. Please try again." };
  }
}
