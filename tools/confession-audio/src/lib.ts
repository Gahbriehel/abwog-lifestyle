import { createHash } from "node:crypto";
import { basename, extname } from "node:path";

export type Gender = "female" | "male";
export const GENDERS: readonly Gender[] = ["female", "male"];

/** Kokoro's sample rate. Everything the script writes to ffmpeg is at this rate. */
export const SAMPLE_RATE = 24_000;

/**
 * Normalises a confession body exactly the way Dove does before hashing it
 * (see docs/dove-confessions.md): LF line endings, trimmed, and three or more
 * blank lines collapsed into one. The hash then matches the one Dove stores.
 */
export function normalizeBody(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim().replace(/\n{3,}/g, "\n\n");
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export interface Document {
  /** From an optional first line like "# My title". Spoken first, never part of the body. */
  title: string | null;
  /** The confession text as stored in Dove. */
  body: string;
  paragraphs: string[];
}

/** Splits a text file into an optional "# Title" line and the body. */
export function parseDocument(raw: string): Document {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const match = text.match(/^\s*#[ \t]+(.+?)[ \t]*(?:\n|$)/);
  const title = match ? match[1].trim() : null;
  const body = normalizeBody(match ? text.slice(match[0].length) : text);
  const paragraphs = body === "" ? [] : body.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim());
  return { title, body, paragraphs };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive respelling, e.g. { "Elymas": "Ellimas" }. Longer words win. */
export function applyPronunciations(text: string, map: Record<string, string>): string {
  let out = text;
  for (const word of Object.keys(map).sort((a, b) => b.length - a.length)) {
    if (word.trim() === "") continue;
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}'’])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, "giu"), map[word]);
  }
  return out;
}

/** Small clean-ups so the voice doesn't stumble: dashes become pauses, spaces collapse. */
export function speakable(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/…/g, "...")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Splits a paragraph into sentences. */
export function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?…]["”’')\]]*)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Kokoro reads about 500 phoneme tokens at a time; a sentence far longer than
 * that can be cut off. Returns the sentences long enough to be worth splitting.
 */
export function findLongSentences(paragraphs: string[], maxChars = 400): string[] {
  return paragraphs.flatMap(splitSentences).filter((s) => s.length > maxChars);
}

export function slugFromPath(path: string): string {
  return basename(path, extname(path));
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function parseVoices(arg: string): Gender[] {
  const wanted = arg
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const bad = wanted.filter((v) => !GENDERS.includes(v as Gender));
  if (bad.length > 0 || wanted.length === 0) {
    throw new Error(`--voices must be "female", "male" or "female,male" (got "${arg}")`);
  }
  return [...new Set(wanted)] as Gender[];
}

export interface Settings {
  textHash: string;
  title: string | null;
  voiceId: string;
  speed: number;
  pauseSec: number;
  dtype: string;
  pronunciations: Record<string, string>;
}

/** Everything that changes how the audio sounds. If it is unchanged, the old file is still good. */
export function settingsHash(settings: Settings): string {
  const sorted = Object.fromEntries(Object.entries(settings.pronunciations).sort(([a], [b]) => a.localeCompare(b)));
  return sha256(JSON.stringify({ ...settings, pronunciations: sorted }));
}

export function formatDuration(totalSec: number): string {
  const s = Math.round(totalSec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export interface ManifestVoice {
  voiceId: string;
  file: string;
  settingsHash: string;
  durationSec: number;
  sizeBytes: number;
  generatedAt: string;
}

export interface Manifest {
  [slug: string]: { textHash: string; voices: Partial<Record<Gender, ManifestVoice>> };
}
