import "server-only";
import { DoveError } from "./dove-errors";
import type {
  MemberLoginPayload,
  MemberLoginResult,
  MemberSession,
  ProfileBootstrap,
  UpdateProfilePayload,
  UpdateProfileResult,
} from "./types";

const TIMEOUT_MS = 15_000;

function baseUrl(): string {
  const url = process.env.DOVE_API_URL;
  if (!url) throw new Error("DOVE_API_URL is not set");
  return url.replace(/\/+$/, "");
}

interface DoveEnvelope<T> {
  success?: boolean;
  message?: string | string[];
  code?: string;
  data?: T;
  attemptsRemaining?: number;
  lockedUntil?: string;
}

async function doveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    // Network failure or timeout. Never include the path: it may hold a token.
    throw new DoveError(
      cause instanceof Error ? cause.name : "Network error",
      503,
    );
  }

  const body = (await res.json().catch(() => ({}))) as DoveEnvelope<T>;
  if (!res.ok || body.success === false) {
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message ?? res.statusText);
    // Dove may put these at the top level or under `data`; accept both.
    const nested = (body.data ?? {}) as DoveEnvelope<unknown>;
    const attemptsRemaining = body.attemptsRemaining ?? nested.attemptsRemaining;
    const lockedUntil = body.lockedUntil ?? nested.lockedUntil;
    throw new DoveError(message, res.status, body.code, {
      ...(typeof attemptsRemaining === "number" ? { attemptsRemaining } : {}),
      ...(typeof lockedUntil === "string" ? { lockedUntil } : {}),
    });
  }
  // Most responses wrap the payload in `data`; the guide shows some unwrapped. Accept both.
  return (body.data ?? body) as T;
}

const tokenPath = (token: string) => `/profile/${encodeURIComponent(token)}`;

export function claimProfile(email: string): Promise<unknown> {
  return doveFetch("/profile/claim", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function getProfile(token: string): Promise<ProfileBootstrap> {
  return doveFetch<ProfileBootstrap>(tokenPath(token));
}

export function updateProfile(
  token: string,
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResult> {
  return doveFetch<UpdateProfileResult>(tokenPath(token), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export function loginMember(payload: MemberLoginPayload): Promise<MemberLoginResult> {
  return doveFetch<MemberLoginResult>("/profile/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(accessToken: string): Promise<MemberSession> {
  return doveFetch<MemberSession>("/profile/me", { headers: bearer(accessToken) });
}

export async function setMemberPin(
  accessToken: string,
  payload: { currentPin?: string; newPin: string },
): Promise<void> {
  await doveFetch("/profile/me/pin", {
    method: "PUT",
    headers: bearer(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function logoutMember(accessToken: string): Promise<void> {
  await doveFetch("/profile/logout", { method: "POST", headers: bearer(accessToken) });
}
