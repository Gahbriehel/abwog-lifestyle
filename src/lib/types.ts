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
  | "PIN_TOO_WEAK";

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

export interface GivingAccount {
  id: string;
  /** What the money is for, e.g. "Tithe" or "Building project". */
  label: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  note: string | null;
  sortOrder: number;
}
