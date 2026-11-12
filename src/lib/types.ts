// Shapes returned by the Dove API (see dove/docs/FRONTEND_PWA_GUIDE.md (member session and PIN)).

export type Gender = "MALE" | "FEMALE" | "OTHER";

export type MembershipStatus =
  | "VISITOR"
  | "MEMBER"
  | "WORKER"
  | "LEADER"
  | "PASTOR";

export interface DepartmentInfo {
  id: string;
  name: string;
  description?: string | null;
  role?: string | null;
  joinedAt?: string;
}

export interface PersonProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null; // "YYYY-MM-DD"
  address: string | null;
  membershipStatus: MembershipStatus;
  departments: DepartmentInfo[];
  /** False when Dove created this record from an unknown email (placeholder names like "New Visitor"). */
  namesConfirmed: boolean;
  /** Whether the member has set a PIN for signing in on other devices. */
  hasPin: boolean;
}

export interface ChurchInfo {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  shortName?: string | null;
  /** E.164, e.g. "+2348012345678". */
  whatsappNumber?: string | null;
  branchName?: string | null;
  campusName?: string | null;
}

export interface ProfileBootstrap {
  person: PersonProfile;
  church: ChurchInfo;
  availableDepartments: DepartmentInfo[];
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
  membershipStatus: MembershipStatus;
  departmentIds: string[];
  /** 4-digit numeric PIN; omitted when the member skips the PIN step. */
  pin?: string;
}

export interface UpdateProfileResult {
  person: PersonProfile;
  /** Present when the save also signs the member in (they have a PIN). */
  accessToken?: string;
}

export interface MemberLoginPayload {
  /** Phone (E.164) or email. */
  identifier: string;
  pin: string;
  churchSlug?: string;
}

export interface MemberSession {
  person: PersonProfile;
  church: ChurchInfo;
  /** Freshly signed 30-day token (sliding session). Present on GET /profile/me and login. */
  accessToken?: string;
}

export interface MemberLoginResult extends MemberSession {
  accessToken: string;
}

export type LinkProblemCode = "PROFILE_LINK_EXPIRED" | "PROFILE_LINK_INVALID";

/** Machine-readable `code` on Dove's 400 responses. Switch on this, not `message`. */
export type ProfileErrorCode =
  | LinkProblemCode
  | "NAMES_REQUIRED"
  | "DEPARTMENT_REQUIRED"
  | "PIN_TOO_WEAK"
  | "CONTACT_ALREADY_REGISTERED"
  | "CONTACT_REQUIRED";

/** Codes on the member PIN endpoints (login and change PIN). */
export type PinErrorCode =
  | "INVALID_PIN"
  | "PIN_LOCKED"
  | "NO_PIN_SET"
  | "INVALID_CREDENTIALS"
  | "CURRENT_PIN_REQUIRED"
  | "PIN_TOO_WEAK";

// ── Public content (events, registration, giving) ──────────────────────────

export type EventCategory =
  | "GENERAL"
  | "CONFERENCE"
  | "VIGIL"
  | "COMMUNION"
  | "REVIVAL"
  | "WORSHIP"
  | "OUTREACH";

export interface EventSummary {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  location: string | null;
  /** ISO timestamps. */
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  capacity: number | null;
  requiresRegistration: boolean;
  isFeatured: boolean;
  highlights: string[] | null;
  registeredCount?: number;
}

export interface EventList {
  items: EventSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email?: string;
  /** E.164 (Dove normalises and silently drops numbers it can't parse). */
  phone?: string;
  gender?: Gender;
}

export interface EventRegistration {
  id: string;
  registrationNumber: string;
  /** The token encoded in the QR code. */
  token: string;
  /** PNG data URL of the check-in QR code. */
  qrCodeDataUrl: string;
  team?: { id: string; name: string; color?: string | null } | null;
}

export interface RegisterResult {
  registration: EventRegistration;
}

export type GivingPurpose = "TITHE" | "OFFERING" | "BUILDING" | "MISSIONS" | "SEED" | "SPECIAL";

export interface GivingAccount {
  id: string;
  /** What the money is for, e.g. "Tithe" or "Building project". */
  label: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  note: string | null;
  /** What this account can receive; one account may serve several purposes. */
  purposes: GivingPurpose[];
  sortOrder: number;
}

// ── Confessions ────────────────────────────────────────────────────────────

export type ConfessionVoice = "female" | "male";

/** One recorded voice. `url` is a path on Dove's host (e.g. /public/confession-audio/...). */
export interface ConfessionAudioFile {
  url: string;
  durationSec: number;
}

export type ConfessionAudioMap = Partial<Record<ConfessionVoice, ConfessionAudioFile>>;

export interface ConfessionSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  scriptureRef: string | null;
  category: string | null;
  /** Rank among published confessions, set by staff order. Shown as the confession's number. */
  position: number | null;
  wordCount: number;
  listenCount: number;
  audio: ConfessionAudioMap;
}

export interface ConfessionList {
  items: ConfessionSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ConfessionNeighbour {
  slug: string;
  title: string;
}

export interface ConfessionDetail extends ConfessionSummary {
  body: string;
  previous: ConfessionNeighbour | null;
  next: ConfessionNeighbour | null;
}

// ── Scripture (home page) ──────────────────────────────────────────────────

export type ScriptureKind = "WEEK" | "YEAR";

export interface Scripture {
  id: string;
  kind: ScriptureKind;
  text: string;
  /** "Exodus 33:19" */
  reference: string;
  /** "NKJV" */
  translation: string | null;
  /** Who gave the word, e.g. "Rev. Deji Olabode". */
  givenBy: string | null;
  /** "YYYY-MM-DD", the first day this scripture is current. */
  startsOn: string;
}

/** Either can be null when nothing is published for it yet. */
export interface CurrentScriptures {
  week: Scripture | null;
  year: Scripture | null;
}

// ── Push notifications and the Night Prayer. See docs/dove-notifications.md ─

export type PushTopic = "night-prayer" | "confessions" | "scriptures" | "encouragement";

export type NightPrayerStatus = "upcoming" | "live" | "ended" | "cancelled" | "inactive";

/** `GET /night-prayer/next`. Every instant is a UTC ISO string; `now` is the server's clock. */
export interface NightPrayerNext {
  status: NightPrayerStatus;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  meetUrl: string | null;
  startsAt: string | null;
  joinOpensAt: string | null;
  endsAt: string | null;
  note: string | null;
  now: string;
}


// ── Family links (see docs/dove-family-links.md) ───────────────────────────

export type RelationshipType = "SPOUSE" | "PARENT" | "CHILD" | "SIBLING" | "OTHER";

export interface Relative {
  relationshipId: string;
  person: { id: string; firstName: string; lastName: string };
  /** What this person is to the signed-in member. */
  relationship: RelationshipType;
  relationshipNote: string | null;
  addedByMe: boolean;
  /** True once they have set a PIN, i.e. they have taken over their own profile. */
  claimed: boolean;
  maskedEmail: string | null;
  maskedPhone: string | null;
  canSendClaimLink: boolean;
}

export interface AddRelativePayload {
  firstName: string;
  lastName: string;
  relationship: RelationshipType;
  relationshipNote?: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string;
}

export interface RelativeClaimLink {
  url: string;
  whatsappUrl: string;
  /** ISO timestamp. */
  expiresAt: string;
}
