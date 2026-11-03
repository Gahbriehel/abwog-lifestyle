"use client";

import { useSyncExternalStore } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent | null;
    __appInstalled?: boolean;
  }
}

const EVENT = "installpromptchange";

/**
 * Inlined into <head> so `beforeinstallprompt` is captured even if it fires
 * before React hydrates. The success screen uses it minutes later.
 */
export const installPromptCaptureScript = `(function(){
window.__installPrompt=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event('${EVENT}'));});
window.addEventListener('appinstalled',function(){window.__installPrompt=null;window.__appInstalled=true;window.dispatchEvent(new Event('${EVENT}'));});
})();`;

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function useInstallPrompt() {
  const prompt = useSyncExternalStore(
    subscribe,
    () => window.__installPrompt ?? null,
    () => null,
  );
  const installed = useSyncExternalStore(
    subscribe,
    () => window.__appInstalled ?? false,
    () => false,
  );

  async function install(): Promise<boolean> {
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // A prompt can only be used once.
    window.__installPrompt = null;
    window.dispatchEvent(new Event(EVENT));
    return outcome === "accepted";
  }

  return { canPrompt: !!prompt, installed, install };
}

const noopSubscribe = () => () => {};

/** True after hydration; avoids server/client mismatches for browser-only UI. */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
