/** Dove validates prayer categories against exactly this list (dove/src/contact/constants). Keep them in step. */
export const PRAYER_CATEGORIES = [
  "Healing & Health",
  "Family & Marriage",
  "Financial Breakthrough",
  "Spiritual Growth",
  "General Prayer",
] as const;

export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number];

export const DEFAULT_PRAYER_CATEGORY: PrayerCategory = "General Prayer";

export const PRAYER_MAX_LENGTH = 1000;

export const PRAYER_VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public", description: "Our prayer team and pastors can see this." },
  { value: "PRIVATE", label: "Private", description: "Only the pastoral team will see this." },
] as const;

export type PrayerVisibility = (typeof PRAYER_VISIBILITY_OPTIONS)[number]["value"];
