import type { ConfessionAudioMap, ConfessionSummary, ConfessionVoice } from "./types";

/** A listen is counted after this many seconds of actual playback. */
export const LISTEN_THRESHOLD_SECONDS = 10;

const WORDS_PER_MINUTE = 200;

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/** "2 min read" */
export function readingLabel(wordCount: number): string {
  return `${readingMinutes(wordCount)} min read`;
}

/** Whole minutes for a length in seconds, never below 1. */
export function minutesLabel(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function listensLabel(count: number): string {
  return `${count.toLocaleString("en-NG")} ${count === 1 ? "listen" : "listens"}`;
}

/** Dove sends audio as a path on its own host; the browser needs the full address. */
export function absoluteAudioUrl(origin: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export interface PlayableAudio {
  src: string;
  durationSec: number;
}

export type PlayableAudioMap = Partial<Record<ConfessionVoice, PlayableAudio>>;

export function playableAudio(origin: string, audio: ConfessionAudioMap): PlayableAudioMap {
  const out: PlayableAudioMap = {};
  for (const voice of ["female", "male"] as const) {
    const file = audio[voice];
    if (file?.url) out[voice] = { src: absoluteAudioUrl(origin, file.url), durationSec: file.durationSec };
  }
  return out;
}

export const hasAudio = (audio: ConfessionAudioMap) => Boolean(audio.female?.url || audio.male?.url);

/** Length to show on a card: the recording if there is one, otherwise the estimated reading time. */
export function lengthLabel(item: Pick<ConfessionSummary, "audio" | "wordCount">): string {
  const seconds = item.audio.female?.durationSec ?? item.audio.male?.durationSec;
  return seconds ? minutesLabel(seconds) : readingLabel(item.wordCount);
}

/** "1:26" */
export function clock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function parseSpeed(stored: string | null): PlaybackSpeed {
  const n = Number(stored);
  return (PLAYBACK_SPEEDS as readonly number[]).includes(n) ? (n as PlaybackSpeed) : 1;
}

export function speedLabel(speed: number): string {
  return `${speed}×`;
}

/** Number of "page" links to show for a list. */
export function pageHref(base: string, params: Record<string, string | undefined>, page: number): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) q.set(key, value);
  if (page > 1) q.set("page", String(page));
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}
