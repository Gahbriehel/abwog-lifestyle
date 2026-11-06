// Static church identity for screens rendered before we have a token (and as a
// fallback when Dove doesn't return the field yet).
export const church = {
  name: "Abiding Word Of Grace Missions",
  formerName: "PKA Amazing Grace Bible Church",
  shortName: "Amazing Grace",
  /** Sent to Dove on PIN login to pick the church. */
  slug: "abwog",
  websiteUrl: "https://abwog.org",
} as const;

export const MEMBERSHIP_OPTIONS = [
  {
    value: "VISITOR",
    label: "Visitor",
    description: "First-time or occasional guest",
  },
  {
    value: "MEMBER",
    label: "Member",
    description: "Regular part of the congregation",
  },
  {
    value: "WORKER",
    label: "Worker",
    description: "Serves in a church department",
  },
  {
    value: "LEADER",
    label: "Leader",
    description: "Department head, cell leader or elder",
  },
  {
    value: "PASTOR",
    label: "Pastor",
    description: "Ordained minister or pastoral staff",
  },
] as const;

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  MEMBERSHIP_OPTIONS.map((o) => [o.value, o.label]),
);
