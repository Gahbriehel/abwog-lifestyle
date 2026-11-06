"use server";

import { updateProfile } from "@/lib/dove";
import { DoveError, toLinkProblem } from "@/lib/dove-errors";
import { PIN_WEAK_MESSAGE, validateNewPin } from "@/lib/pin";
import { setSession } from "@/lib/session";
import type { LinkProblemCode, PersonProfile, ProfileErrorCode } from "@/lib/types";
import {
  profileSchemaFor,
  toUpdatePayload,
  type ProfileFormInput,
} from "@/lib/validation";

type FieldName = keyof ProfileFormInput;

export type SaveResult =
  | { ok: true; person: PersonProfile }
  | { ok: false; kind: "link"; code: LinkProblemCode }
  | { ok: false; kind: "field"; field: FieldName; message: string }
  | { ok: false; kind: "pin"; message: string }
  | { ok: false; kind: "error" };

const FIELD_CODES: Partial<Record<ProfileErrorCode, { field: FieldName; message: string }>> = {
  DEPARTMENT_REQUIRED: {
    field: "departmentIds",
    message: "Please select at least one department.",
  },
  NAMES_REQUIRED: { field: "firstName", message: "Please enter your first name." },
};

/**
 * Saves the profile, with an optional new PIN (the PIN step passes it; "Skip for now" doesn't).
 * When Dove returns an access token the member is signed in on this device.
 */
export async function saveProfile(
  token: string,
  input: ProfileFormInput,
  pin?: string,
): Promise<SaveResult> {
  if (typeof token !== "string" || token.length === 0 || token.length > 256) {
    return { ok: false, kind: "link", code: "PROFILE_LINK_INVALID" };
  }

  // Department rules are enforced by the form (which knows what's on offer) and by Dove.
  const parsed = profileSchemaFor({ departmentsAvailable: false }).safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, kind: "field", field: issue.path[0] as FieldName, message: issue.message };
  }

  if (pin !== undefined) {
    const message = validateNewPin(pin);
    if (message) return { ok: false, kind: "pin", message };
  }

  try {
    const { person, accessToken } = await updateProfile(token, {
      ...toUpdatePayload(parsed.data),
      ...(pin !== undefined ? { pin } : {}),
    });
    if (accessToken) await setSession(accessToken);
    return { ok: true, person };
  } catch (error) {
    const problem = toLinkProblem(error);
    if (problem) return { ok: false, kind: "link", code: problem };
    if (error instanceof DoveError && error.code === "PIN_TOO_WEAK") {
      return { ok: false, kind: "pin", message: PIN_WEAK_MESSAGE };
    }
    const fieldError =
      error instanceof DoveError ? FIELD_CODES[error.code as ProfileErrorCode] : undefined;
    if (fieldError) return { ok: false, kind: "field", ...fieldError };
    console.error("saveProfile failed", error instanceof DoveError ? error.status : error);
    return { ok: false, kind: "error" };
  }
}
