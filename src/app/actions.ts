"use server";

import { redirect } from "next/navigation";
import { getMe, logoutMember, setMemberPin } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { lockedMessage, PIN_WEAK_MESSAGE } from "@/lib/pin";
import { clearSession, getSessionToken, setSession } from "@/lib/session";
import { changePinSchemaFor, type ChangePinValues } from "@/lib/validation";

export type ChangePinResult =
  | { ok: true }
  | { ok: false; field?: keyof ChangePinValues; message: string; signedOut?: boolean };

export async function changePin(input: ChangePinValues, hasPin: boolean): Promise<ChangePinResult> {
  const parsed = changePinSchemaFor({ hasPin }).safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, field: issue.path[0] as keyof ChangePinValues, message: issue.message };
  }

  const accessToken = await getSessionToken();
  if (!accessToken) {
    return { ok: false, signedOut: true, message: "Your session has ended. Please sign in again." };
  }

  try {
    await setMemberPin(accessToken, {
      ...(hasPin ? { currentPin: parsed.data.currentPin } : {}),
      newPin: parsed.data.pin,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof DoveError) {
      if (error.status === 401 && error.code !== "INVALID_PIN") {
        return { ok: false, signedOut: true, message: "Your session has ended. Please sign in again." };
      }
      if (error.code === "INVALID_PIN") {
        const left = error.extra.attemptsRemaining;
        return {
          ok: false,
          field: "currentPin",
          message:
            left === undefined
              ? "That isn't your current PIN."
              : `That isn't your current PIN. ${left} attempt${left === 1 ? "" : "s"} remaining.`,
        };
      }
      if (error.code === "PIN_LOCKED") {
        return {
          ok: false,
          field: "currentPin",
          message: lockedMessage(error.extra.lockedUntil),
        };
      }
      if (error.code === "CURRENT_PIN_REQUIRED") {
        return { ok: false, field: "currentPin", message: "Please enter your current PIN." };
      }
      if (error.code === "PIN_TOO_WEAK") {
        return { ok: false, field: "pin", message: PIN_WEAK_MESSAGE };
      }
    }
    console.error("changePin failed", error instanceof DoveError ? error.status : error);
    return { ok: false, message: "We couldn't save your PIN. Please try again." };
  }
}

export async function signOut(): Promise<never> {
  const accessToken = await getSessionToken();
  await clearSession();
  if (accessToken) {
    // Best effort: the cookie is already gone, so a failed revoke must not block sign-out.
    await logoutMember(accessToken).catch(() => undefined);
  }
  redirect("/");
}

/**
 * Sliding session: GET /profile/me returns a fresh 30-day token. Server Components can't write
 * cookies, so the home page calls this once on load to swap it in. Failures are silent.
 */
export async function renewSession(): Promise<void> {
  const accessToken = await getSessionToken();
  if (!accessToken) return;
  try {
    const { accessToken: renewed } = await getMe(accessToken);
    if (renewed) await setSession(renewed);
  } catch (error) {
    if (error instanceof DoveError && error.status === 401) await clearSession();
  }
}
