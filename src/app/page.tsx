import Link from "next/link";
import { PinSettings } from "@/components/auth/PinSettings";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { InstallCard } from "@/components/onboarding/InstallCard";
import { ChurchHeader } from "@/components/ui/Brand";
import { buttonClasses } from "@/components/ui/Button";
import { Badge, Chip } from "@/components/ui/Misc";
import { Screen } from "@/components/ui/Screen";
import { appUrl } from "@/lib/app-url";
import { church, STATUS_LABELS } from "@/lib/church";
import { getMe } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { getSessionToken } from "@/lib/session";
import type { MemberSession } from "@/lib/types";

async function loadSession(): Promise<MemberSession | null> {
  const accessToken = await getSessionToken();
  if (!accessToken) return null;
  try {
    return await getMe(accessToken);
  } catch (error) {
    // An expired or revoked session just looks signed out; the next sign-in replaces the cookie.
    if (!(error instanceof DoveError && (error.status === 401 || error.status === 403))) {
      console.error("getMe failed", error instanceof DoveError ? error.status : error);
    }
    return null;
  }
}

const WebsiteLink = () => (
  <a
    href={church.websiteUrl}
    className="mt-6 text-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
  >
    Visit {church.websiteUrl.replace(/^https?:\/\//, "")}
  </a>
);

export default async function HomePage() {
  const session = await loadSession();

  if (!session) {
    return (
      <Screen>
        <ChurchHeader variant="full" />
        <h1 className="mt-8 text-balance text-center font-serif text-[28px] font-semibold leading-tight">
          Welcome to {church.shortName}
        </h1>
        <p className="mt-2 text-balance text-center text-fg-muted">
          Church updates, devotionals and events are coming here soon. For now, help us keep your
          details up to date.
        </p>
        <Link href="/login" className={buttonClasses("primary", true, "mt-8")}>
          Sign in with PIN
        </Link>
        <Link href="/profile" className={buttonClasses("secondary", true, "mt-3")}>
          Update my details
        </Link>
        <div className="mt-6">
          <InstallCard appUrl={appUrl()} />
        </div>
        <WebsiteLink />
      </Screen>
    );
  }

  const { person } = session;
  return (
    <Screen>
      <ChurchHeader />
      <h1 className="mt-6 text-balance font-serif text-[28px] font-semibold leading-tight">
        Hello, {person.firstName}
      </h1>
      <p className="mt-1 text-fg-muted">Welcome back to {church.shortName}.</p>

      <section
        aria-label="Your details"
        className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words font-serif text-xl font-semibold">
            {person.firstName} {person.lastName}
          </p>
          <Badge>{STATUS_LABELS[person.membershipStatus] ?? person.membershipStatus}</Badge>
        </div>
        {person.departments.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-fg-muted">Departments</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {person.departments.map((d) => (
                <li key={d.id}>
                  <Chip>{d.name}</Chip>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mt-4 space-y-4">
        <PinSettings hasPin={person.hasPin} />
        <Link href="/profile" className={buttonClasses("secondary", true)}>
          Update my details
        </Link>
        <InstallCard appUrl={appUrl()} />
      </div>
      <WebsiteLink />
      <div className="mt-2">
        <SignOutButton />
      </div>
    </Screen>
  );
}
