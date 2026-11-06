import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PinSettings } from "@/components/auth/PinSettings";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { buttonClasses } from "@/components/ui/Button";
import { Badge, Chip } from "@/components/ui/Misc";
import { church, STATUS_LABELS } from "@/lib/church";
import { loadSession } from "@/lib/member";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const session = await loadSession();
  if (!session) redirect("/login");
  const { person } = session;

  return (
    <div className="flex w-full max-w-xl flex-col">
      <h1 className="type-title">Account</h1>
      <p className="mt-1 text-fg-muted">Your details at {church.shortName}.</p>

      <section
        aria-label="Your details"
        className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-xs sm:p-6 lg:mt-8"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="type-heading min-w-0 break-words">
            {person.firstName} {person.lastName}
          </p>
          <Badge>{STATUS_LABELS[person.membershipStatus] ?? person.membershipStatus}</Badge>
        </div>
        {person.departments.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="type-eyebrow text-fg-muted">Departments</p>
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
      </div>
      <div className="mt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
