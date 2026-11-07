"use client";

import { useSyncExternalStore } from "react";
import { readStored, writeStored } from "./storage";

export type ThemePreference = "light" | "dark" | "system";

const KEY = "theme";
const EVENT = "themechange";

/**
 * Inlined into <head> so the right theme is on <html> before first paint (no flash). Resolves
 * "system" against the OS setting and keeps following it while that's the saved choice.
 */
export const themeScript = `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function p(){try{var v=localStorage.getItem("${KEY}");return v==="light"||v==="dark"?v:"system"}catch(e){return"system"}}function a(){var dark=p()==="dark"||(p()==="system"&&m.matches);d.classList.toggle("dark",dark);var c=document.querySelector('meta[name="theme-color"][data-theme-color]');if(!c){c=document.createElement("meta");c.name="theme-color";c.setAttribute("data-theme-color","");document.head.appendChild(c)}c.content=dark?"#1f1b19":"#fbf7f1"}a();m.addEventListener("change",a);addEventListener("${EVENT}",a)})();`;

function read(): ThemePreference {
  const v = readStored(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setTheme(pref: ThemePreference) {
  if (pref === "system") {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // Not remembering a preference is fine.
    }
  } else {
    writeStored(KEY, pref);
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The saved choice; "system" on the server and during hydration. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, read, () => "system");
}
