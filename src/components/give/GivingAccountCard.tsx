"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { GivingAccount } from "@/lib/types";

export function GivingAccountCard({ account }: { account: GivingAccount }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (older iOS, insecure context). The number is on screen to copy by hand.
    }
  }

  return (
    <section aria-label={account.label} className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-xs sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="type-heading min-w-0 break-words">{account.label}</h2>
        {account.currency !== "NGN" && (
          <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold">{account.currency}</span>
        )}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="type-eyebrow text-fg-muted">Bank</dt>
          <dd className="mt-0.5 font-medium">{account.bankName}</dd>
        </div>
        <div>
          <dt className="type-eyebrow text-fg-muted">Account name</dt>
          <dd className="mt-0.5 break-words font-medium">{account.accountName}</dd>
        </div>
        <div className="rounded-[var(--radius-control)] bg-surface-muted px-4 py-3 sm:col-span-2">
          <dt className="type-eyebrow text-fg-muted">Account number</dt>
          <dd className="mt-0.5 font-mono text-[1.375rem] font-semibold tracking-wider">{account.accountNumber}</dd>
        </div>
      </dl>
      {account.note && <p className="mt-3 text-sm text-fg-muted">{account.note}</p>}
      <div aria-hidden className="hidden flex-1 sm:block sm:min-h-4" />
      <Button
        variant="secondary"
        fullWidth
        className="mt-4"
        onClick={copy}
        icon={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      >
        {copied ? "Copied" : "Copy account number"}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Account number copied" : ""}
      </span>
    </section>
  );
}
