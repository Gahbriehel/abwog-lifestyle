import { getNightPrayerNext, doveOrigin } from "@/lib/dove";
import type { NightPrayerNext } from "@/lib/types";

// The card depends on the exact time, so this is never cached.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Dove may return an uploaded image as a path on its own host. */
function absoluteImage(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url, doveOrigin()).toString();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const data = await getNightPrayerNext();
    const body: NightPrayerNext = { ...data, imageUrl: absoluteImage(data.imageUrl) };
    return Response.json(body, { headers: NO_STORE });
  } catch (error) {
    console.error("night prayer failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "unavailable" }, { status: 502, headers: NO_STORE });
  }
}
