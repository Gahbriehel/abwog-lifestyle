import "server-only";
import { DoveError } from "./dove-errors";
import type {
  PersonProfile,
  ProfileBootstrap,
  UpdateProfilePayload,
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
    throw new DoveError(message, res.status, body.code);
  }
  return body.data as T;
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

export async function updateProfile(
  token: string,
  payload: UpdateProfilePayload,
): Promise<PersonProfile> {
  const data = await doveFetch<{ person: PersonProfile }>(tokenPath(token), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.person;
}
