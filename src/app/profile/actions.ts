"use server";

import { claimProfile } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { claimSchema } from "@/lib/validation";

export type ClaimResult =
  | { ok: true }
  | { ok: false; field?: "email"; message: string };

export async function requestLink(email: string): Promise<ClaimResult> {
  const parsed = claimSchema.safeParse({ email });
  if (!parsed.success) {
    return { ok: false, field: "email", message: parsed.error.issues[0].message };
  }

  try {
    await claimProfile(parsed.data.email.toLowerCase());
    return { ok: true };
  } catch (error) {
    // Dove's per-email limits are silent (same 200, no email). Only its per-IP cap returns 429.
    if (error instanceof DoveError && error.status === 429) {
      return { ok: false, message: "Too many attempts. Please try again shortly." };
    }
    if (error instanceof DoveError && error.status === 400) {
      return { ok: false, field: "email", message: "Please enter a valid email address." };
    }
    console.error("requestLink failed", error instanceof DoveError ? error.status : error);
    return { ok: false, message: "We couldn't send your link right now. Please try again." };
  }
}
