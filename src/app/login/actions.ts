"use server";

import { redirect } from "next/navigation";
import { church } from "@/lib/church";
import { loginMember } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { setSession } from "@/lib/session";
import type { PinErrorCode } from "@/lib/types";
import { loginSchema, toIdentifier, type LoginValues } from "@/lib/validation";

export type LoginResult =
  | { ok: false; kind: "field"; field: keyof LoginValues; message: string }
  | { ok: false; kind: "no-pin" }
  | { ok: false; kind: "locked"; message: string }
  | { ok: false; kind: "error"; message: string };

function lockedMessage(lockedUntil?: string): string {
  const minutes = lockedUntil
    ? Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60_000))
    : 15;
  const wait = Number.isFinite(minutes) ? minutes : 15;
  return `Too many wrong PINs. Please try again in ${wait} minute${wait === 1 ? "" : "s"}, or sign in with an email link instead.`;
}

/** Signs the member in and redirects home on success; otherwise returns what to show. */
export async function login(input: LoginValues): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      kind: "field",
      field: issue.path[0] as keyof LoginValues,
      message: issue.message,
    };
  }

  try {
    const { accessToken } = await loginMember({
      identifier: toIdentifier(parsed.data.identifier),
      pin: parsed.data.pin,
      churchSlug: church.slug,
    });
    await setSession(accessToken);
  } catch (error) {
    if (error instanceof DoveError) {
      switch (error.code as PinErrorCode | undefined) {
        case "INVALID_PIN": {
          const left = error.extra.attemptsRemaining;
          const message =
            left === undefined
              ? "Incorrect PIN. Please try again."
              : `Incorrect PIN. ${left} attempt${left === 1 ? "" : "s"} remaining.`;
          return { ok: false, kind: "field", field: "pin", message };
        }
        case "INVALID_CREDENTIALS":
          return {
            ok: false,
            kind: "field",
            field: "identifier",
            message: "We couldn't find a profile with that phone number or email.",
          };
        case "NO_PIN_SET":
          return { ok: false, kind: "no-pin" };
        case "PIN_LOCKED":
          return { ok: false, kind: "locked", message: lockedMessage(error.extra.lockedUntil) };
      }
      if (error.status === 429) {
        return {
          ok: false,
          kind: "error",
          message: "Too many attempts. Please wait a moment and try again.",
        };
      }
    }
    console.error("login failed", error instanceof DoveError ? error.status : error);
    return { ok: false, kind: "error", message: "We couldn't sign you in right now. Please try again." };
  }

  redirect("/");
}
