import "server-only";
import { DoveError } from "./dove-errors";
import type {
  ConfessionDetail,
  ConfessionList,
  CurrentScriptures,
  EventList,
  EventSummary,
  GivingAccount,
  GivingPurpose,
  MemberLoginPayload,
  MemberLoginResult,
  MemberSession,
  AddRelativePayload,
  AddRelativeResponse,
  NightPrayerNext,
  PushTopic,
  Relative,
  RelativeClaimLink,
  RelativeInviteEmail,
  ProfileBootstrap,
  RegisterPayload,
  RegisterResult,
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
  registration?: unknown;
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
    const registration = body.registration ?? nested.registration;
    throw new DoveError(message, res.status, body.code, {
      ...(registration && typeof registration === "object" ? { registration } : {}),
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

// ── Family links (signed-in member). See docs/dove-family-links.md ─────────

export async function getRelatives(accessToken: string): Promise<Relative[]> {
  const data = await doveFetch<{ items?: Relative[] } | Relative[]>("/profile/me/relatives", {
    headers: bearer(accessToken),
  });
  return Array.isArray(data) ? data : (data.items ?? []);
}

export function addRelative(accessToken: string, payload: AddRelativePayload): Promise<AddRelativeResponse> {
  return doveFetch<AddRelativeResponse>("/profile/me/relatives", {
    method: "POST",
    headers: bearer(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function removeRelative(accessToken: string, relationshipId: string): Promise<void> {
  await doveFetch(`/profile/me/relatives/${encodeURIComponent(relationshipId)}`, {
    method: "DELETE",
    headers: bearer(accessToken),
  });
}

/** Issues a fresh single-use link for someone this member added, ready to send on WhatsApp. */
export function createRelativeClaimLink(accessToken: string, personId: string): Promise<RelativeClaimLink> {
  return doveFetch<RelativeClaimLink>(`/profile/me/relatives/${encodeURIComponent(personId)}/claim-link`, {
    method: "POST",
    headers: bearer(accessToken),
  });
}

/** Issues a fresh 48-hour link and emails it. Waits for the send, so failures surface. */
export function sendRelativeInviteEmail(accessToken: string, personId: string): Promise<RelativeInviteEmail> {
  return doveFetch<RelativeInviteEmail>(`/profile/me/relatives/${encodeURIComponent(personId)}/invite-email`, {
    method: "POST",
    headers: bearer(accessToken),
  });
}

// ── Public content (no session needed) ─────────────────────────────────────

export function getEvents(query: { limit?: number; category?: string; search?: string } = {}): Promise<EventList> {
  const params = new URLSearchParams({ limit: String(query.limit ?? 50) });
  if (query.category) params.set("category", query.category);
  if (query.search) params.set("search", query.search);
  return doveFetch<EventList>(`/events?${params}`);
}

export function getEvent(id: string): Promise<EventSummary> {
  return doveFetch<EventSummary>(`/events/${encodeURIComponent(id)}`);
}

export function registerForEvent(id: string, payload: RegisterPayload): Promise<RegisterResult> {
  return doveFetch<RegisterResult>(`/events/${encodeURIComponent(id)}/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Public, active accounts only, already sorted. See docs/dove-giving-accounts.md. */
export function getGivingAccounts(purpose?: GivingPurpose): Promise<GivingAccount[]> {
  return doveFetch<GivingAccount[]>(purpose ? `/giving-accounts?purpose=${purpose}` : "/giving-accounts");
}

// ── Confessions (public) ───────────────────────────────────────────────────

/** Dove's host, without the /api/v1 path. Audio files are served from here. */
export function doveOrigin(): string {
  return new URL(baseUrl()).origin;
}

export function getConfessions(query: { search?: string; category?: string; page?: number; limit?: number } = {}): Promise<ConfessionList> {
  const params = new URLSearchParams({ limit: String(query.limit ?? 50), page: String(query.page ?? 1) });
  if (query.search) params.set("search", query.search);
  if (query.category) params.set("category", query.category);
  return doveFetch<ConfessionList>(`/confessions?${params}`);
}

export function getConfessionCategories(): Promise<string[]> {
  return doveFetch<string[]>("/confessions/categories");
}

export function getConfession(slug: string): Promise<ConfessionDetail> {
  return doveFetch<ConfessionDetail>(`/confessions/${encodeURIComponent(slug)}`);
}

/** Counts one listen. Dove answers 204 with no body. */
export async function recordConfessionListen(id: string): Promise<void> {
  await doveFetch(`/confessions/${encodeURIComponent(id)}/listen`, { method: "POST" });
}

// ── Scripture (public) ─────────────────────────────────────────────────────

/** The scripture for this week and for this year. See docs/dove-scripture.md. */
export function getCurrentScriptures(): Promise<CurrentScriptures> {
  return doveFetch<CurrentScriptures>("/scriptures/current");
}

// ── Push notifications and Night Prayer (public). See docs/dove-notifications.md ─

export function getNightPrayerNext(): Promise<NightPrayerNext> {
  return doveFetch<NightPrayerNext>("/night-prayer/next");
}

/** Anonymous devices are fine. `accessToken` links the device to a signed-in member. */
export async function subscribePush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  topics: PushTopic[],
  accessToken?: string,
): Promise<void> {
  await doveFetch("/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription, topics, ...(accessToken ? { memberToken: accessToken } : {}) }),
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await doveFetch("/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) });
}

export async function updatePushTopics(endpoint: string, topics: PushTopic[]): Promise<void> {
  await doveFetch("/push/topics", { method: "PATCH", body: JSON.stringify({ endpoint, topics }) });
}

export async function sendPushTest(endpoint: string): Promise<void> {
  await doveFetch("/push/test-self", { method: "POST", body: JSON.stringify({ endpoint }) });
}
