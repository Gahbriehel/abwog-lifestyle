/** Rules for the 4-digit member PIN. Dove enforces the same list; keep them in sync. */

const COMMON = new Set(["1212", "1122", "2580", "0852", "1004", "6969"]);

export function isFourDigits(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** True for PINs that are trivial to guess: repeats, straight runs and a few favourites. */
export function isWeakPin(pin: string): boolean {
  if (!isFourDigits(pin)) return false;
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  const repeated = steps.every((s) => s === 0);
  const run = steps.every((s) => s === 1) || steps.every((s) => s === -1);
  return repeated || run || COMMON.has(pin);
}

export const PIN_WEAK_MESSAGE = "That PIN is too easy to guess. Please choose a different one.";

/** Returns an error message, or null when the PIN is acceptable. */
export function validateNewPin(pin: string): string | null {
  if (!isFourDigits(pin)) return "Your PIN must be exactly 4 digits.";
  if (isWeakPin(pin)) return PIN_WEAK_MESSAGE;
  return null;
}

/** Lockout copy for the PIN screens; `lockedUntil` is Dove's ISO timestamp. */
export function lockedMessage(lockedUntil?: string): string {
  const minutes = lockedUntil
    ? Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60_000))
    : 15;
  const wait = Number.isFinite(minutes) ? minutes : 15;
  return `Too many wrong PINs. Please try again in ${wait} minute${wait === 1 ? "" : "s"}, or sign in with an email link instead.`;
}
