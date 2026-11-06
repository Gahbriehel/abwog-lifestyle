"use server";

import { registerForEvent } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import type { EventRegistration } from "@/lib/types";
import { registerSchema, toRegisterPayload, type RegisterValues } from "@/lib/validation";

export type RegisterActionResult =
  | { ok: true; registration: EventRegistration; alreadyRegistered: boolean }
  | { ok: false; field?: keyof RegisterValues; message: string };

function isRegistration(value: unknown): value is EventRegistration {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as EventRegistration).registrationNumber === "string" &&
    typeof (value as EventRegistration).qrCodeDataUrl === "string"
  );
}

export async function register(eventId: string, input: RegisterValues): Promise<RegisterActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, field: issue.path[0] as keyof RegisterValues, message: issue.message };
  }

  try {
    const { registration } = await registerForEvent(eventId, toRegisterPayload(parsed.data));
    return { ok: true, registration, alreadyRegistered: false };
  } catch (error) {
    if (error instanceof DoveError) {
      // Same person registering again: Dove returns their existing registration, so show it.
      if (error.status === 409 && isRegistration(error.extra.registration)) {
        return { ok: true, registration: error.extra.registration, alreadyRegistered: true };
      }
      if (error.status === 404) return { ok: false, message: "We couldn't find that event." };
      if (error.status === 429) return { ok: false, message: "Too many attempts. Please wait a moment and try again." };
      // Dove's own messages (event full, registration closed) are written for people.
      if (error.status === 400 && error.message) return { ok: false, message: error.message };
    } else {
      console.error("register failed", error);
    }
    return { ok: false, message: "We couldn't complete your registration. Please try again." };
  }
}
