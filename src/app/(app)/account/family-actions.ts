"use server";

import { revalidatePath } from "next/cache";
import { addRelative, createRelativeClaimLink, removeRelative } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { getSessionToken } from "@/lib/session";
import {
  addRelativeSchema,
  toAddRelativePayload,
  type AddRelativeInput,
} from "@/lib/validation";

type FieldName = keyof AddRelativeInput;

const SIGNED_OUT = "Your session has ended. Please sign in again.";

export type AddRelativeResult =
  | { ok: true }
  | { ok: false; field?: FieldName; message: string; signedOut?: boolean };

/** Deliberately vague: Dove never says which of the two matched, or who owns it. */
const CONTACT_TAKEN_MESSAGE =
  "This email or phone number is already registered. Please use a different one.";

export async function addFamilyMember(input: AddRelativeInput): Promise<AddRelativeResult> {
  const parsed = addRelativeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, field: issue.path[0] as FieldName, message: issue.message };
  }

  const accessToken = await getSessionToken();
  if (!accessToken) return { ok: false, signedOut: true, message: SIGNED_OUT };

  try {
    await addRelative(accessToken, toAddRelativePayload(parsed.data));
    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    if (error instanceof DoveError) {
      if (error.status === 401) return { ok: false, signedOut: true, message: SIGNED_OUT };
      if (error.code === "CONTACT_ALREADY_REGISTERED") {
        return { ok: false, field: "email", message: CONTACT_TAKEN_MESSAGE };
      }
      if (error.code === "CONTACT_REQUIRED") {
        return { ok: false, field: "email", message: "Please enter an email address or a phone number." };
      }
      if (error.status === 429) {
        return { ok: false, message: "You've added a lot of people today. Please try again tomorrow." };
      }
    }
    console.error("addFamilyMember failed", error instanceof DoveError ? error.status : error);
    return { ok: false, message: "We couldn't add them. Please try again." };
  }
}

export type RemoveRelativeResult = { ok: true } | { ok: false; message: string; signedOut?: boolean };

export async function unlinkFamilyMember(relationshipId: string): Promise<RemoveRelativeResult> {
  if (typeof relationshipId !== "string" || relationshipId.length === 0 || relationshipId.length > 100) {
    return { ok: false, message: "We couldn't remove that link." };
  }
  const accessToken = await getSessionToken();
  if (!accessToken) return { ok: false, signedOut: true, message: SIGNED_OUT };
  try {
    await removeRelative(accessToken, relationshipId);
    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    if (error instanceof DoveError && error.status === 401) {
      return { ok: false, signedOut: true, message: SIGNED_OUT };
    }
    console.error("unlinkFamilyMember failed", error instanceof DoveError ? error.status : error);
    return { ok: false, message: "We couldn't remove that link. Please try again." };
  }
}

export type ClaimLinkResult =
  | { ok: true; whatsappUrl: string }
  | { ok: false; message: string; signedOut?: boolean };

/** The WhatsApp link opens on the member's own phone; Dove sends nothing itself. */
export async function getFamilyClaimLink(personId: string): Promise<ClaimLinkResult> {
  if (typeof personId !== "string" || personId.length === 0 || personId.length > 100) {
    return { ok: false, message: "We couldn't prepare that link." };
  }
  const accessToken = await getSessionToken();
  if (!accessToken) return { ok: false, signedOut: true, message: SIGNED_OUT };
  try {
    const { whatsappUrl } = await createRelativeClaimLink(accessToken, personId);
    // Only ever hand the browser a WhatsApp address, whatever Dove returned.
    if (!/^https:\/\/wa\.me\//.test(whatsappUrl)) throw new Error("Unexpected link");
    return { ok: true, whatsappUrl };
  } catch (error) {
    if (error instanceof DoveError) {
      if (error.status === 401) return { ok: false, signedOut: true, message: SIGNED_OUT };
      if (error.status === 429) {
        return { ok: false, message: "You've sent a few links already today. Please try again tomorrow." };
      }
      if (error.code === "ALREADY_CLAIMED") {
        return { ok: false, message: "They've already set up their profile, so they don't need a link." };
      }
      if (error.code === "NO_PHONE") {
        return { ok: false, message: "They don't have a phone number on their profile, so there's nowhere to send a link." };
      }
      if (error.code === "NOT_CREATOR") {
        return { ok: false, message: "Only the person who added them can send their link." };
      }
    }
    console.error("getFamilyClaimLink failed", error instanceof DoveError ? error.status : error);
    return { ok: false, message: "We couldn't prepare their link. Please try again." };
  }
}
