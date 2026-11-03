"use client";

import { Check, MessageCircle, UserPlus } from "lucide-react";
import { ChurchHeader, PoweredByDove } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { Badge, Chip } from "@/components/ui/Misc";
import { church as staticChurch, STATUS_LABELS } from "@/lib/church";
import { formatForDisplay } from "@/lib/phone";
import type { ChurchInfo, PersonProfile } from "@/lib/types";
import { buildVCard, waMeUrl } from "@/lib/whatsapp";
import { InstallCard } from "./InstallCard";

const BURST = [
  { dx: "-64px", dy: "-36px", color: "bg-gold-fill" },
  { dx: "60px", dy: "-44px", color: "bg-primary" },
  { dx: "-80px", dy: "12px", color: "bg-primary" },
  { dx: "78px", dy: "18px", color: "bg-gold-fill" },
  { dx: "-30px", dy: "-70px", color: "bg-primary" },
  { dx: "34px", dy: "-68px", color: "bg-gold-fill" },
  { dx: "-52px", dy: "52px", color: "bg-gold-fill" },
  { dx: "54px", dy: "56px", color: "bg-primary" },
];

function Celebration() {
  return (
    <div className="relative mx-auto mt-8 flex size-24 items-center justify-center">
      {BURST.map((dot, i) => (
        <span
          key={i}
          aria-hidden
          className={`animate-burst absolute size-2 rounded-full ${dot.color}`}
          style={{ "--dx": dot.dx, "--dy": dot.dy } as React.CSSProperties}
        />
      ))}
      <span className="animate-pop-in flex size-24 items-center justify-center rounded-full bg-gold-fill shadow-md ring-8 ring-gold-soft">
        <Check aria-hidden className="size-11 text-[#2b211f]" strokeWidth={3} />
      </span>
    </div>
  );
}

function saveContact(name: string, phone: string, website: string) {
  const vcard = buildVCard({ name, organization: staticChurch.name, phone, url: website });
  const url = URL.createObjectURL(new Blob([vcard], { type: "text/vcard;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "amazing-grace.vcf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function WhatsAppCard({ name, phone, website }: { name: string; phone: string; website: string }) {
  return (
    <section
      aria-labelledby="whatsapp-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-full bg-gold-soft text-gold">
          <MessageCircle className="size-5" />
        </span>
        <div>
          <h2 id="whatsapp-title" className="font-serif text-lg font-semibold leading-tight">
            Save our WhatsApp number
          </h2>
          <p className="text-sm text-fg-muted">{formatForDisplay(phone)}</p>
        </div>
      </div>
      <p className="mt-3 text-[15px] text-fg-muted">
        Save <strong className="text-fg">{name}</strong> in your contacts so you get birthday
        wishes and check-ins from the church on WhatsApp.
      </p>
      <Button
        variant="secondary"
        fullWidth
        className="mt-4"
        icon={<UserPlus aria-hidden className="size-4" />}
        onClick={() => saveContact(name, phone, website)}
      >
        Save contact
      </Button>
      <a
        href={waMeUrl(phone, `Hello ${name}!`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 flex min-h-11 items-center justify-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
      >
        Say hi on WhatsApp
      </a>
    </section>
  );
}

export function SuccessView({
  person,
  church,
  appUrl,
}: {
  person: PersonProfile;
  church: ChurchInfo;
  appUrl: string;
}) {
  const shortName = church.shortName || staticChurch.shortName;
  const status = STATUS_LABELS[person.membershipStatus] ?? person.membershipStatus;

  return (
    <>
      <ChurchHeader />
      <Celebration />
      <div className="mt-6 text-center">
        <h1 className="font-serif text-[28px] font-semibold leading-tight">
          You&apos;re all set, {person.firstName}!
        </h1>
        <p className="mt-2 text-balance text-fg-muted">
          Thank you for keeping your details up to date with {staticChurch.name}.
        </p>
      </div>

      <section
        aria-label="Your details"
        className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-fg-muted">Your details</p>
            <p className="mt-0.5 break-words font-serif text-xl font-semibold">
              {person.firstName} {person.lastName}
            </p>
          </div>
          <Badge>{status}</Badge>
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
        {church.whatsappNumber && (
          <WhatsAppCard
            name={shortName}
            phone={church.whatsappNumber}
            website={church.websiteUrl || staticChurch.websiteUrl}
          />
        )}
        <InstallCard appUrl={appUrl} />
      </div>
      <PoweredByDove className="py-6" />
    </>
  );
}
