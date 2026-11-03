import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { LinkProblem } from "@/components/onboarding/LinkProblem";
import { ProfileFlow } from "@/components/onboarding/ProfileFlow";
import { ButtonLink } from "@/components/ui/Button";
import { ChurchHeader, IconCircle } from "@/components/ui/Brand";
import { Screen } from "@/components/ui/Screen";
import { appUrl } from "@/lib/app-url";
import { getProfile } from "@/lib/dove";
import { toLinkProblem } from "@/lib/dove-errors";
import type { ProfileBootstrap } from "@/lib/types";

export const metadata: Metadata = {
  title: "Your details",
  robots: { index: false },
  referrer: "no-referrer",
};

type Outcome =
  | { kind: "ok"; data: ProfileBootstrap }
  | { kind: "problem"; code: ReturnType<typeof toLinkProblem> & string }
  | { kind: "error" };

async function load(token: string): Promise<Outcome> {
  try {
    return { kind: "ok", data: await getProfile(token) };
  } catch (error) {
    const code = toLinkProblem(error);
    if (code) return { kind: "problem", code };
    console.error("getProfile failed", error instanceof Error ? error.name : error);
    return { kind: "error" };
  }
}

export default async function ProfileTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const outcome = await load(token);

  if (outcome.kind === "problem") {
    return (
      <Screen>
        <LinkProblem code={outcome.code} />
      </Screen>
    );
  }

  if (outcome.kind === "error") {
    return (
      <Screen>
        <ChurchHeader />
        <div className="mt-12 flex flex-col items-center text-center">
          <IconCircle>
            <WifiOff />
          </IconCircle>
          <h1 className="mt-6 font-serif text-[26px] font-semibold leading-tight">
            We couldn&apos;t load your details
          </h1>
          <p className="mt-2 text-balance text-fg-muted">
            Please check your connection and try again. Your link still works.
          </p>
        </div>
        <ButtonLink href={`/profile/${encodeURIComponent(token)}`} fullWidth className="mt-8">
          Try again
        </ButtonLink>
      </Screen>
    );
  }

  return (
    <Screen footer={false}>
      <ProfileFlow token={token} data={outcome.data} appUrl={appUrl()} />
    </Screen>
  );
}
