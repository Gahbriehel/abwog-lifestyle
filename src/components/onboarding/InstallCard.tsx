"use client";

import { CheckCircle2, Copy, Download, Share, SquarePlus } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { detectInstallContext } from "@/lib/install";
import { useInstallPrompt, useIsClient } from "@/lib/install-prompt";

function CardShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="install-title"
      className="rounded-[var(--radius-card)] bg-primary-soft p-5"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-logo-bg">
          <Image src="/brand/icon-gold.png" alt="" width={32} height={26} />
        </span>
        <h2 id="install-title" className="type-heading text-primary-soft-fg">
          Stay connected
        </h2>
      </div>
      <p className="mt-3 text-sm text-fg-muted">
        Add the app to your home screen for church updates, devotionals and events.
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-control)] bg-surface px-4 py-3">
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-fill text-sm font-bold text-on-gold"
      >
        {n}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-sm text-fg">{children}</span>
    </li>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-card)] border border-border bg-surface p-5 text-center text-sm text-fg-muted">
      {children}
    </p>
  );
}

export function InstallCard({ appUrl }: { appUrl: string }) {
  const isClient = useIsClient();
  const { canPrompt, installed, install } = useInstallPrompt();
  const [state, setState] = useState<"idle" | "later" | "accepted">("idle");
  const [copied, setCopied] = useState(false);

  if (!isClient) return null;

  const context = detectInstallContext({
    userAgent: navigator.userAgent,
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hasPrompt: canPrompt,
  });

  if (installed || state === "accepted") {
    return (
      <Notice>
        <CheckCircle2 aria-hidden className="mx-auto mb-2 size-6 text-gold" />
        The app is on your home screen.
      </Notice>
    );
  }
  if (context === "installed") return null;
  if (state === "later") {
    return (
      <Notice>
        No problem. You can install the app any time from <strong className="text-fg">{appUrl.replace(/^https?:\/\//, "")}</strong>.
      </Notice>
    );
  }

  if (context === "prompt") {
    return (
      <CardShell>
        <Button
          fullWidth
          icon={<Download aria-hidden className="size-4" />}
          onClick={async () => {
            if (await install()) setState("accepted");
          }}
        >
          Install app
        </Button>
        <Button variant="text" fullWidth className="mt-1" onClick={() => setState("later")}>
          Maybe later
        </Button>
      </CardShell>
    );
  }

  if (context === "ios") {
    return (
      <CardShell>
        <ol className="space-y-2">
          <Step n={1}>
            Tap <strong>Share</strong>
            <Share aria-label="the Share icon" className="size-4 text-primary-soft-fg" />
          </Step>
          <Step n={2}>
            Then <strong>Add to Home Screen</strong>
            <SquarePlus aria-label="the Add icon" className="size-4 text-primary-soft-fg" />
          </Step>
        </ol>
        <p className="mt-3 text-sm text-fg-muted">The Share button is at the bottom of Safari.</p>
      </CardShell>
    );
  }

  // In-app browsers (Gmail, WhatsApp, Instagram…) and unsupported browsers can't install.
  const displayUrl = appUrl.replace(/^https?:\/\//, "");
  return (
    <CardShell>
      <p className="text-sm text-fg">
        To install the app, open <strong>{displayUrl}</strong> in Chrome or Safari.
      </p>
      <Button
        variant="secondary"
        fullWidth
        className="mt-3"
        icon={<Copy aria-hidden className="size-4" />}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(appUrl);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Link copied" : "Copy link"}
      </Button>
    </CardShell>
  );
}
