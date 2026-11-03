// Nigerian-first phone handling. The form shows a fixed "+234" prefix and the
// member types the national number; anything starting with "+" is treated as
// international. Dove normalises again on its side (Dove B1).

const NG_NATIONAL = /^[789][01]\d{8}$/; // 803 456 7890 → mobile, without the leading 0

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Returns E.164 (e.g. "+2348034567890"), or null when it isn't a valid number. */
export function toE164(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.startsWith("+")) {
    const digits = digitsOnly(raw);
    if (digits.startsWith("234")) return ngFromNational(digits.slice(3));
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  let digits = digitsOnly(raw);
  if (digits.startsWith("234") && digits.length === 13) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return ngFromNational(digits);
}

function ngFromNational(national: string): string | null {
  const n = national.startsWith("0") ? national.slice(1) : national;
  return NG_NATIONAL.test(n) ? `+234${n}` : null;
}

/** Value to show in the input next to the fixed "+234" prefix. */
export function toInputValue(stored: string | null | undefined): string {
  if (!stored) return "";
  const e164 = toE164(stored);
  if (e164?.startsWith("+234")) return formatNational(e164.slice(4));
  return stored; // international or unparseable: show as stored
}

function formatNational(n: string): string {
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

/** "+2348034567890" → "+234 803 456 7890" */
export function formatForDisplay(e164: string): string {
  if (e164.startsWith("+234") && e164.length === 14) {
    return `+234 ${formatNational(e164.slice(4))}`;
  }
  return e164;
}

/** Digits for wa.me links: "+2348034567890" → "2348034567890". */
export function toWhatsAppDigits(e164: string): string {
  return digitsOnly(e164);
}
