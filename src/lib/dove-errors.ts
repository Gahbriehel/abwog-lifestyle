import type { LinkProblemCode } from "./types";

export class DoveError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "DoveError";
  }
}

/**
 * Maps a Dove error to a link problem, or null if it isn't one.
 * Prefers the machine-readable `code` (Dove A2); until that ships, falls back
 * to Dove's existing messages. Note "Invalid or expired magic link" is the
 * *invalid* case, so only "has expired" means expired.
 */
export function toLinkProblem(error: unknown): LinkProblemCode | null {
  if (!(error instanceof DoveError)) return null;
  if (
    error.code === "PROFILE_LINK_EXPIRED" ||
    error.code === "PROFILE_LINK_INVALID"
  ) {
    return error.code;
  }
  if (error.status !== 400 && error.status !== 404) return null;
  if (/has expired/i.test(error.message)) return "PROFILE_LINK_EXPIRED";
  if (/invalid|expired|token is required/i.test(error.message)) {
    return "PROFILE_LINK_INVALID";
  }
  return null;
}
