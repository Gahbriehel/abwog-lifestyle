"use client";

import { useSyncExternalStore } from "react";
import { readStored, writeStored } from "./storage";

const listeners = new Set<() => void>();
/** Keeps a choice for the rest of the visit even when localStorage is blocked. */
const memory = new Map<string, string>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * A saved preference. It is `null` on the server and on the first render in the
 * browser (so they match), then the saved value.
 */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => memory.get(key) ?? readStored(key),
    () => null,
  );
}

export function saveString(key: string, value: string): void {
  memory.set(key, value);
  writeStored(key, value);
  listeners.forEach((listener) => listener());
}

const noopSubscribe = () => () => {};

/** Whether this browser can read text aloud. `null` until we are in the browser. */
export function useSpeechSupported(): boolean | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined",
    () => null,
  );
}
