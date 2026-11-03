// Shapes returned by the Dove API (see dove/docs/FRONTEND_PWA_GUIDE.md §7).

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
}

export type LinkProblemCode = "PROFILE_LINK_EXPIRED" | "PROFILE_LINK_INVALID";

/** Machine-readable `code` on Dove's 400 responses. Switch on this, not `message`. */
export type ProfileErrorCode = LinkProblemCode | "NAMES_REQUIRED" | "DEPARTMENT_REQUIRED";
