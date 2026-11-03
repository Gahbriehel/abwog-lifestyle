"use client";

import { useState } from "react";
import type { LinkProblemCode, PersonProfile, ProfileBootstrap } from "@/lib/types";
import { LinkProblem } from "./LinkProblem";
import { ProfileForm } from "./ProfileForm";
import { SuccessView } from "./SuccessView";

type Step =
  | { name: "form" }
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

  if (step.name === "saved") {
    return <SuccessView person={step.person} church={data.church} appUrl={appUrl} />;
  }
  if (step.name === "problem") return <LinkProblem code={step.code} />;

  return (
    <ProfileForm
      token={token}
      data={data}
      onSaved={(person) => {
        // The link is now used up. Drop it from the address bar and history so
        // "Add to Home Screen" (iOS uses the current URL) and refreshes land on
        // the app home instead of a "link isn't valid" screen.
        window.history.replaceState(null, "", "/");
        window.scrollTo({ top: 0 });
        setStep({ name: "saved", person });
      }}
      onLinkProblem={(code) => {
        window.scrollTo({ top: 0 });
        setStep({ name: "problem", code });
      }}
    />
  );
}
