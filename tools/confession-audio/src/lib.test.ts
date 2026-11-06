import { describe, expect, it } from "vitest";
import {
  applyPronunciations,
  findLongSentences,
  formatBytes,
  formatDuration,
  isValidSlug,
  normalizeBody,
  parseDocument,
  parseVoices,
  settingsHash,
  sha256,
  slugFromPath,
  speakable,
  splitSentences,
} from "./lib";

describe("normalizeBody", () => {
  it("uses LF endings, trims, and collapses 3+ blank lines into one", () => {
    expect(normalizeBody("  One.\r\n\r\n\r\n\r\nTwo.\r\n")).toBe("One.\n\nTwo.");
  });

  it("gives the same hash for the same text however it was saved", () => {
    expect(sha256(normalizeBody("A\r\n\r\nB\r\n"))).toBe(sha256(normalizeBody("A\n\nB")));
  });
});

describe("parseDocument", () => {
  it("reads an optional title line and keeps it out of the body", () => {
    const doc = parseDocument("# My Title\n\nFirst para.\nstill first.\n\nSecond para.");
    expect(doc.title).toBe("My Title");
    expect(doc.body).toBe("First para.\nstill first.\n\nSecond para.");
    expect(doc.paragraphs).toEqual(["First para. still first.", "Second para."]);
  });

  it("works without a title", () => {
    const doc = parseDocument("﻿Just a body.\n\nTwo.");
    expect(doc.title).toBeNull();
    expect(doc.paragraphs).toEqual(["Just a body.", "Two."]);
  });

  it("returns no paragraphs for an empty body", () => {
    expect(parseDocument("# Only a title\n").paragraphs).toEqual([]);
    expect(parseDocument("   \n").paragraphs).toEqual([]);
  });

  it("does not treat a hashtag-like line without a space as a title", () => {
    expect(parseDocument("#blessed life").title).toBeNull();
  });
});

describe("applyPronunciations", () => {
  const map = { Elymas: "Ellimas", Amen: "Ah-men" };

  it("replaces whole words, ignoring case", () => {
    expect(applyPronunciations("I defeat Elymas. amen!", map)).toBe("I defeat Ellimas. Ah-men!");
  });

  it("leaves words that merely contain the target alone", () => {
    expect(applyPronunciations("Amends and Elymases", map)).toBe("Amends and Elymases");
  });

  it("is safe with regex characters in the word", () => {
    expect(applyPronunciations("a.b and axb", { "a.b": "ay-dot-bee" })).toBe("ay-dot-bee and axb");
  });
});

describe("speakable and sentences", () => {
  it("turns dashes into pauses and collapses spaces", () => {
    expect(speakable("Grace —  and mercy – always…")).toBe("Grace, and mercy, always...");
  });

  it("splits sentences, keeping closing quotes with their sentence", () => {
    expect(splitSentences('I declare "yes." Then I rest! Done?')).toEqual(['I declare "yes."', "Then I rest!", "Done?"]);
  });

  it("flags only overlong sentences", () => {
    const long = `${"word ".repeat(100).trim()}.`;
    expect(findLongSentences([`Short one. ${long}`], 400)).toEqual([long]);
    expect(findLongSentences(["Short one. Another."], 400)).toEqual([]);
  });
});

describe("slugs and voices", () => {
  it("takes the slug from the file name", () => {
    expect(slugFromPath("/a/b/confession-to-start-my-day.txt")).toBe("confession-to-start-my-day");
  });

  it("validates slugs the way Dove does", () => {
    expect(isValidSlug("tithers-confession")).toBe(true);
    expect(isValidSlug("Tithers Confession")).toBe(false);
    expect(isValidSlug("-bad")).toBe(false);
  });

  it("parses --voices", () => {
    expect(parseVoices("male")).toEqual(["male"]);
    expect(parseVoices("female, male,female")).toEqual(["female", "male"]);
    expect(() => parseVoices("robot")).toThrow(/--voices/);
  });
});

describe("settingsHash", () => {
  const base = {
    textHash: "abc",
    title: null,
    voiceId: "af_heart",
    speed: 0.9,
    pauseSec: 0.7,
    dtype: "q8",
    pronunciations: { B: "b", A: "a" },
  };

  it("ignores the order of pronunciation entries", () => {
    expect(settingsHash(base)).toBe(settingsHash({ ...base, pronunciations: { A: "a", B: "b" } }));
  });

  it("changes when anything audible changes", () => {
    const h = settingsHash(base);
    expect(settingsHash({ ...base, speed: 1 })).not.toBe(h);
    expect(settingsHash({ ...base, textHash: "abd" })).not.toBe(h);
    expect(settingsHash({ ...base, voiceId: "af_bella" })).not.toBe(h);
    expect(settingsHash({ ...base, pronunciations: { A: "x", B: "b" } })).not.toBe(h);
  });
});

describe("formatting", () => {
  it("formats durations and sizes", () => {
    expect(formatDuration(52)).toBe("0:52");
    expect(formatDuration(125.4)).toBe("2:05");
    expect(formatBytes(415724)).toBe("406 KB");
    expect(formatBytes(14 * 1024 * 1024)).toBe("14.0 MB");
  });
});
