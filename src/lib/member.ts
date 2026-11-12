import "server-only";
import { getMe, getRelatives } from "./dove";
import { DoveError } from "./dove-errors";
import { getSessionToken } from "./session";
import type { MemberSession, Relative } from "./types";

/** The signed-in member, or null for guests (and for an expired or revoked session). */
export async function loadSession(): Promise<MemberSession | null> {
  const accessToken = await getSessionToken();
  if (!accessToken) return null;
  try {
    return await getMe(accessToken);
  } catch (error) {
    // An expired or revoked session just looks signed out; the next sign-in replaces the cookie.
    if (!(error instanceof DoveError && (error.status === 401 || error.status === 403))) {
      console.error("getMe failed", error instanceof DoveError ? error.status : error);
    }
    return null;
  }
}

/** The signed-in member's linked family. Empty on any failure, so a hiccup never breaks the account page. */
export async function loadRelatives(): Promise<Relative[]> {
  const accessToken = await getSessionToken();
  if (!accessToken) return [];
  try {
    return await getRelatives(accessToken);
  } catch (error) {
    console.error("getRelatives failed", error instanceof DoveError ? error.status : error);
    return [];
  }
}
