import { z } from "zod";
import { toE164 } from "./phone";
import type { MembershipStatus, UpdateProfilePayload } from "./types";

export const claimSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .email("Please enter a valid email address.")
    .max(255, "That email address is too long."),
});

export type ClaimValues = z.infer<typeof claimSchema>;

const STATUSES = ["VISITOR", "MEMBER", "WORKER", "LEADER", "PASTOR"] as const;

export const DEPARTMENTS_REQUIRED: MembershipStatus[] = ["WORKER"];
export const DEPARTMENTS_OPTIONAL: MembershipStatus[] = ["LEADER", "PASTOR"];

export function showsDepartments(status: MembershipStatus | "" | undefined) {
  return (
    !!status &&
    (DEPARTMENTS_REQUIRED.includes(status) ||
      DEPARTMENTS_OPTIONAL.includes(status))
  );
}

function isPastDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now() && date.getUTCFullYear() >= 1900;
}

const profileObject = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "Please enter your first name.")
      .max(100, "That's a bit long. Please shorten it."),
    lastName: z
      .string()
      .trim()
      .min(1, "Please enter your last name.")
      .max(100, "That's a bit long. Please shorten it."),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).or(z.literal("")),
    dateOfBirth: z
      .string()
      .refine((v) => v === "" || isPastDate(v), "Please choose a valid date."),
    email: z
      .string()
      .trim()
      .min(1, "Please enter your email address.")
      .email("Please enter a valid email address.")
      .max(255, "That email address is too long."),
    phone: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || toE164(v) !== null,
        "That number doesn't look right. Please check it.",
      ),
    address: z.string().trim().max(500, "Please keep your address under 500 characters."),
    membershipStatus: z.enum(STATUSES, {
      error: "Please choose your role at church.",
    }),
    departmentIds: z.array(z.string()),
  });

/**
 * Workers must pick a department, but only when the church has departments to
 * pick from; otherwise the member could never save.
 */
export function profileSchemaFor({ departmentsAvailable }: { departmentsAvailable: boolean }) {
  return profileObject.superRefine((values, ctx) => {
    if (
      departmentsAvailable &&
      DEPARTMENTS_REQUIRED.includes(values.membershipStatus) &&
      values.departmentIds.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["departmentIds"],
        message: "Please select at least one department.",
      });
    }
  });
}

export const profileSchema = profileSchemaFor({ departmentsAvailable: true });

export type ProfileFormInput = z.input<typeof profileObject>;
export type ProfileValues = z.output<typeof profileObject>;

/** Builds Dove's PATCH body: omit empty optionals Dove would reject, clear hidden departments. */
export function toUpdatePayload(values: ProfileValues): UpdateProfilePayload {
  const phone = values.phone ? toE164(values.phone) : null;
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email.toLowerCase(),
    ...(phone ? { phone } : {}),
    ...(values.gender ? { gender: values.gender } : {}),
    ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
    address: values.address,
    membershipStatus: values.membershipStatus,
    departmentIds: showsDepartments(values.membershipStatus)
      ? values.departmentIds
      : [],
  };
}
