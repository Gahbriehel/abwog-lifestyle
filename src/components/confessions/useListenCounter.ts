"use client";

import { useCallback, useRef } from "react";
import { countListen } from "@/app/(app)/confessions/actions";
import { LISTEN_THRESHOLD_SECONDS } from "@/lib/confessions";
import { readStored, writeStored } from "@/lib/storage";

/**
 * Counts one listen per confession per visit, once the person has actually
 * listened for a few seconds. Seeking or replaying never counts again.
 */
export function useListenCounter(confessionId: string) {
  const played = useRef(0);
  const reported = useRef(false);
  const key = `listened:${confessionId}`;

  return useCallback(
    (seconds: number) => {
      if (reported.current || seconds <= 0) return;
      played.current += seconds;
      if (played.current < LISTEN_THRESHOLD_SECONDS) return;
      reported.current = true;
      if (readStored(key, "session")) return;
      writeStored(key, "1", "session");
      void countListen(confessionId);
    },
    [confessionId, key],
  );
}
