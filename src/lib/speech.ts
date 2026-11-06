/**
 * Reading a confession aloud with the phone's built-in voice (speechSynthesis).
 * Browsers are uneven here, so the text is read one sentence at a time:
 * long utterances get cut off on some phones, and pausing is unreliable.
 */

export interface SpeechChunk {
  /** Which paragraph this sentence belongs to, for display. */
  paragraph: number;
  text: string;
}

const MAX_CHUNK = 220;

export function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?…]["”’')\]]*)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Breaks a very long sentence at commas and semicolons, then at spaces, so no piece exceeds `max`. */
function splitLong(sentence: string, max: number): string[] {
  if (sentence.length <= max) return [sentence];
  const pieces: string[] = [];
  let current = "";
  for (const part of sentence.split(/(?<=[,;:])\s+/)) {
    if (part.length > max) {
      if (current) pieces.push(current);
      current = "";
      let line = "";
      for (const word of part.split(/\s+/)) {
        if (line && line.length + 1 + word.length > max) {
          pieces.push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      if (line) pieces.push(line);
    } else if (current && current.length + 1 + part.length > max) {
      pieces.push(current);
      current = part;
    } else {
      current = current ? `${current} ${part}` : part;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/** Splits the body into paragraphs (blank-line separated), as Dove stores it. */
export function toParagraphs(body: string): string[] {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export function buildChunks(paragraphs: string[], max = MAX_CHUNK): SpeechChunk[] {
  return paragraphs.flatMap((text, paragraph) =>
    splitSentences(text).flatMap((sentence) => splitLong(sentence, max).map((piece) => ({ paragraph, text: piece }))),
  );
}

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

/** Higher is better. Nigerian, then British, then other English; on-device voices beat network ones. */
export function voiceScore(voice: VoiceLike): number {
  const lang = voice.lang.replace("_", "-").toLowerCase();
  if (!lang.startsWith("en")) return -1;
  let score = 1;
  if (lang === "en-ng") score += 6;
  else if (lang === "en-gb") score += 4;
  else if (lang === "en-us" || lang === "en-za" || lang === "en-ie" || lang === "en-au") score += 2;
  if (voice.localService) score += 2;
  if (/natural|neural|premium|enhanced/i.test(voice.name)) score += 1;
  if (voice.default) score += 0.5;
  return score;
}

export function pickVoice<T extends VoiceLike>(voices: T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const voice of voices) {
    const score = voiceScore(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}
