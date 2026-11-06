"use server";

import { recordConfessionListen } from "@/lib/dove";

/** Counting is best-effort: a failure here must never interrupt someone who is listening. */
export async function countListen(id: string): Promise<void> {
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return;
  try {
    await recordConfessionListen(id);
  } catch (error) {
    console.error("listen count failed", error instanceof Error ? error.message : error);
  }
}
