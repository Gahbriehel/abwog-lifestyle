import { toWhatsAppDigits } from "./phone";

export function waMeUrl(e164: string, text?: string): string {
  const base = `https://wa.me/${toWhatsAppDigits(e164)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1");
}

/** vCard 3.0 so iOS Contacts and Android both import it. */
export function buildVCard(input: {
  name: string;
  organization: string;
  phone: string; // E.164
  url?: string;
}): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(input.name)}`,
    `N:;${escapeVCard(input.name)};;;`,
    `ORG:${escapeVCard(input.organization)}`,
    `TEL;TYPE=CELL:${input.phone}`,
    ...(input.url ? [`URL:${input.url}`] : []),
    "END:VCARD",
  ];
  return lines.join("\r\n") + "\r\n";
}
