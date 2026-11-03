import "server-only";

/** Public origin of this app, shown to members ("open app.abwog.org in Chrome"). */
export function appUrl(): string {
  return (process.env.APP_URL ?? "https://app.abwog.org").replace(/\/+$/, "");
}
