import { describe, expect, it } from "vitest";
import {
  absoluteAudioUrl,
  clock,
  lengthLabel,
  listensLabel,
  pageHref,
  parseSpeed,
  playableAudio,
  readingLabel,
} from "./confessions";
import { buildChunks, pickVoice, splitSentences, toParagraphs } from "./speech";

describe("confession labels", () => {
  it("estimates reading time at 200 words a minute, never under a minute", () => {
    expect(readingLabel(281)).toBe("1 min read");
    expect(readingLabel(900)).toBe("5 min read");
    expect(readingLabel(10)).toBe("1 min read");
  });

  it("prefers the recording's length for the card", () => {
    const base = { wordCount: 900 };
    expect(lengthLabel({ ...base, audio: { female: { url: "/a.mp3", durationSec: 130 } } })).toBe("2 min");
    expect(lengthLabel({ ...base, audio: { male: { url: "/a.mp3", durationSec: 20 } } })).toBe("1 min");
    expect(lengthLabel({ ...base, audio: {} })).toBe("5 min read");
  });

  it("pluralises listens", () => {
    expect(listensLabel(1)).toBe("1 listen");
    expect(listensLabel(0)).toBe("0 listens");
    expect(listensLabel(1432)).toMatch(/^1.?432 listens$/);
  });

  it("formats clock times", () => {
    expect(clock(86.9)).toBe("1:26");
    expect(clock(5)).toBe("0:05");
    expect(clock(Number.NaN)).toBe("0:00");
  });
});

describe("audio addresses", () => {
  it("joins Dove's host and the path Dove returns", () => {
    expect(absoluteAudioUrl("https://api.abwog.org", "/public/confession-audio/1/female-ab.mp3")).toBe(
      "https://api.abwog.org/public/confession-audio/1/female-ab.mp3",
    );
    expect(absoluteAudioUrl("https://api.abwog.org/", "public/x.mp3")).toBe("https://api.abwog.org/public/x.mp3");
  });

  it("leaves full addresses alone", () => {
    expect(absoluteAudioUrl("https://api.abwog.org", "https://cdn.example.com/a.mp3")).toBe("https://cdn.example.com/a.mp3");
  });

  it("keeps only the voices that exist", () => {
    expect(playableAudio("https://h", { male: { url: "/m.mp3", durationSec: 9 } })).toEqual({
      male: { src: "https://h/m.mp3", durationSec: 9 },
    });
    expect(playableAudio("https://h", {})).toEqual({});
  });
});

describe("playback speed and paging", () => {
  it("accepts only the offered speeds", () => {
    expect(parseSpeed("1.25")).toBe(1.25);
    expect(parseSpeed("0.75")).toBe(0.75);
    expect(parseSpeed("2")).toBe(1);
    expect(parseSpeed(null)).toBe(1);
    expect(parseSpeed("abc")).toBe(1);
  });

  it("builds list links, dropping empty filters and page 1", () => {
    expect(pageHref("/confessions", { q: "debt", category: undefined }, 1)).toBe("/confessions?q=debt");
    expect(pageHref("/confessions", { q: "debt" }, 3)).toBe("/confessions?q=debt&page=3");
    expect(pageHref("/confessions", {}, 1)).toBe("/confessions");
  });
});

describe("reading aloud: chunks", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    expect(toParagraphs("One two\nthree.\n\n\nFour.\r\n\r\nFive.")).toEqual(["One two three.", "Four.", "Five."]);
  });

  it("splits sentences and keeps closing quotes with their sentence", () => {
    expect(splitSentences('I declare "yes." Then I rest! Done?')).toEqual(['I declare "yes."', "Then I rest!", "Done?"]);
  });

  it("makes one chunk per sentence and remembers the paragraph", () => {
    expect(buildChunks(["A one. A two.", "B one."])).toEqual([
      { paragraph: 0, text: "A one." },
      { paragraph: 0, text: "A two." },
      { paragraph: 1, text: "B one." },
    ]);
  });

  it("breaks very long sentences at commas, then words, within the limit", () => {
    const long = `${"grace and mercy, ".repeat(30).trim()}`.replace(/,$/, ".");
    const chunks = buildChunks([long], 100);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.text.length <= 100)).toBe(true);
    expect(chunks.map((c) => c.text).join(" ").replace(/\s+/g, " ")).toBe(long);

    const noCommas = buildChunks([`${"word ".repeat(80).trim()}.`], 50);
    expect(noCommas.every((c) => c.text.length <= 50)).toBe(true);
  });

  it("returns nothing for empty text", () => {
    expect(buildChunks([])).toEqual([]);
  });
});

describe("reading aloud: voice choice", () => {
  const v = (name: string, lang: string, localService = true) => ({ name, lang, localService });

  it("prefers Nigerian, then British, then other English", () => {
    expect(pickVoice([v("A", "en-US"), v("B", "en-GB"), v("C", "en-NG")])?.name).toBe("C");
    expect(pickVoice([v("A", "en-US"), v("B", "en-GB")])?.name).toBe("B");
    expect(pickVoice([v("A", "fr-FR"), v("B", "en-IN")])?.name).toBe("B");
  });

  it("prefers on-device voices over network ones in the same language", () => {
    expect(pickVoice([v("Net", "en-GB", false), v("Local", "en-GB", true)])?.name).toBe("Local");
  });

  it("handles underscores in language codes", () => {
    expect(pickVoice([v("A", "en_GB")])?.name).toBe("A");
  });

  it("returns null when there is no English voice", () => {
    expect(pickVoice([v("A", "fr-FR"), v("B", "yo-NG")])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});
