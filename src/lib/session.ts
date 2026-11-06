import "server-only";
import { cookies } from "next/headers";

const COOKIE = "abwog_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** The Dove access token lives in an HTTP-only cookie so browser JS never sees it. */
export async function setSession(accessToken: string): Promise<void> {
  (await cookies()).set(COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
