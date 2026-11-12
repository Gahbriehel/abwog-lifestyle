import { z } from "zod";
import { validateNewPin } from "./pin";
import { toE164 } from "./phone";
import type { AddRelativePayload, MembershipStatus, RegisterPayload, UpdateProfilePayload } from "./types";

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
      .max(255, "That email address is too long.")
      .refine((v) => v === "" || z.email().safeParse(v).success, "Please enter a valid email address."),
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
    // Everyone needs a way back to their profile: an email or a phone (people added by a relative may only have a phone).
    if (values.email === "" && values.phone === "") {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Please enter an email address or a phone number.",
      });
    }
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
    ...(values.email ? { email: values.email.toLowerCase() } : {}),
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

const pinField = z
  .string()
  .refine((v) => /^\d{4}$/.test(v), "Please enter your 4-digit PIN.");

const newPinField = z
  .string()
  .superRefine((v, ctx) => {
    const message = validateNewPin(v);
    if (message) ctx.addIssue({ code: "custom", message });
  });

/** Create-PIN form (onboarding step): a new PIN entered twice. */
export const newPinSchema = z
  .object({ pin: newPinField, confirmPin: z.string() })
  .refine((v) => v.pin === v.confirmPin, {
    path: ["confirmPin"],
    message: "The PINs don't match. Please enter them again.",
  });

export type NewPinValues = z.infer<typeof newPinSchema>;

/** Change-PIN form for a signed-in member. `currentPin` is only asked for when they already have one. */
export function changePinSchemaFor({ hasPin }: { hasPin: boolean }) {
  return z
    .object({
      currentPin: hasPin ? pinField : z.string(),
      pin: newPinField,
      confirmPin: z.string(),
    })
    .refine((v) => v.pin === v.confirmPin, {
      path: ["confirmPin"],
      message: "The PINs don't match. Please enter them again.",
    });
}

export type ChangePinValues = { currentPin: string; pin: string; confirmPin: string };

/** Phone or email, as typed on the login screen. */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Please enter your phone number or email.")
    .refine(
      (v) => (v.includes("@") ? z.email().safeParse(v).success : toE164(v) !== null),
      "That doesn't look like a phone number or email. Please check it.",
    ),
  pin: pinField,
});

export type LoginValues = z.infer<typeof loginSchema>;

/** Dove accepts either form; we send E.164 phones and lower-cased emails. */
export function toIdentifier(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : (toE164(trimmed) ?? trimmed);
}

/** Event registration: Dove needs a name plus an email or a phone number. */
export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Please enter your first name.").max(100, "That's a bit long. Please shorten it."),
    lastName: z.string().trim().min(1, "Please enter your last name.").max(100, "That's a bit long. Please shorten it."),
    email: z
      .string()
      .trim()
      .max(255, "That email address is too long.")
      .refine((v) => v === "" || z.email().safeParse(v).success, "Please enter a valid email address."),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || toE164(v) !== null, "That number doesn't look right. Please check it."),
  })
  .superRefine((values, ctx) => {
    if (values.email === "" && values.phone === "") {
      const message = "Please enter an email address or a phone number.";
      ctx.addIssue({ code: "custom", path: ["email"], message });
    }
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export function toRegisterPayload(values: RegisterValues): RegisterPayload {
  const phone = values.phone ? toE164(values.phone) : null;
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    ...(values.email ? { email: values.email.toLowerCase() } : {}),
    ...(phone ? { phone } : {}),
  };
}

export const RELATIONSHIP_OPTIONS = [
  { value: "SPOUSE", label: "Spouse" },
  { value: "CHILD", label: "Child" },
  { value: "PARENT", label: "Parent" },
  { value: "SIBLING", label: "Sibling" },
  { value: "OTHER", label: "Other relative" },
] as const;

export const RELATIONSHIP_LABELS: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((o) => [o.value, o.label]),
);

/** Add a family member: a name, how they are related, and an email or a phone so they can reach their own profile later. */
export const addRelativeSchema = z
  .object({
    firstName: z.string().trim().min(1, "Please enter their first name.").max(100, "That's a bit long. Please shorten it."),
    lastName: z.string().trim().min(1, "Please enter their last name.").max(100, "That's a bit long. Please shorten it."),
    relationship: z.enum(["SPOUSE", "PARENT", "CHILD", "SIBLING", "OTHER"], {
      error: "Please choose how they are related to you.",
    }),
    relationshipNote: z.string().trim().max(100, "Please keep this under 100 characters."),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).or(z.literal("")),
    dateOfBirth: z.string().refine((v) => v === "" || isPastDate(v), "Please choose a valid date."),
    email: z
      .string()
      .trim()
      .max(255, "That email address is too long.")
      .refine((v) => v === "" || z.email().safeParse(v).success, "Please enter a valid email address."),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || toE164(v) !== null, "That number doesn't look right. Please check it."),
  })
  .superRefine((values, ctx) => {
    if (values.email === "" && values.phone === "") {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Please enter an email address or a phone number so they can reach their profile later.",
      });
    }
  });

export type AddRelativeInput = z.input<typeof addRelativeSchema>;
export type AddRelativeValues = z.output<typeof addRelativeSchema>;

export function toAddRelativePayload(values: AddRelativeValues): AddRelativePayload {
  const phone = values.phone ? toE164(values.phone) : null;
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    relationship: values.relationship,
    ...(values.relationship === "OTHER" && values.relationshipNote ? { relationshipNote: values.relationshipNote } : {}),
    ...(values.email ? { email: values.email.toLowerCase() } : {}),
    ...(phone ? { phone } : {}),
    ...(values.gender ? { gender: values.gender } : {}),
    ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
  };
}
