/** localStorage / sessionStorage can throw (private windows, blocked site data), so every use goes through here. */
export function readStored(key: string, area: "local" | "session" = "local"): string | null {
  try {
    return (area === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string, area: "local" | "session" = "local"): void {
  try {
    (area === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Not remembering a preference is fine.
  }
}
