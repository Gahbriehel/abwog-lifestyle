"use client";

import { useState } from "react";
import { saveProfile } from "@/app/profile/[token]/actions";
import type { LinkProblemCode, PersonProfile, ProfileBootstrap } from "@/lib/types";
import type { ProfileFormInput } from "@/lib/validation";
import { LinkProblem } from "./LinkProblem";
import { PinSetupStep } from "./PinSetupStep";
import { ProfileForm, type FormFieldError } from "./ProfileForm";
import { SuccessView } from "./SuccessView";

type Step =
  | { name: "form"; draft?: ProfileFormInput; error?: FormFieldError }
  | { name: "set-pin"; draft: ProfileFormInput }
  | { name: "saved"; person: PersonProfile }
  | { name: "problem"; code: LinkProblemCode };

export function ProfileFlow({
  token,
  data,
  appUrl,
}: {
  token: string;
  data: ProfileBootstrap;
  appUrl: string;
}) {
  const [step, setStep] = useState<Step>({ name: "form" });

  const goTo = (next: Step) => {
    window.scrollTo({ top: 0 });
    setStep(next);
  };

  /** Saves the profile (with a PIN, or none when skipped). Returns a message if it failed. */
  const save = async (draft: ProfileFormInput, pin?: string): Promise<string | null> => {
    const result = await saveProfile(token, draft, pin);
    if (result.ok) {
      // The link is now used up. Drop it from the address bar and history so
      // "Add to Home Screen" (iOS uses the current URL) and refreshes land on
      // the app home instead of a "link isn't valid" screen.
      window.history.replaceState(null, "", "/");
      goTo({ name: "saved", person: result.person });
      return null;
    }
    if (result.kind === "link") {
      goTo({ name: "problem", code: result.code });
      return null;
    }
    if (result.kind === "field") {
      // The problem is in the details, so take them back to fix it (their PIN isn't kept).
      goTo({ name: "form", draft, error: { field: result.field, message: result.message } });
      return null;
    }
    if (result.kind === "pin") return result.message;
    return "Something went wrong. Please try again.";
  };

  if (step.name === "saved") {
    return <SuccessView person={step.person} church={data.church} appUrl={appUrl} />;
  }
  if (step.name === "problem") return <LinkProblem code={step.code} />;

  if (step.name === "set-pin") {
    const { draft } = step;
    return (
      <PinSetupStep
        hasPin={data.person.hasPin}
        onConfirm={(pin) => save(draft, pin)}
        onBack={() => goTo({ name: "form", draft })}
      />
    );
  }

  return (
    <ProfileForm
      // Remount when returning with a server error so the form re-applies it.
      key={step.error ? `${step.error.field}:${step.error.message}` : "form"}
      data={data}
      draft={step.draft}
      initialError={step.error}
      onContinue={(draft) => goTo({ name: "set-pin", draft })}
    />
  );
}
