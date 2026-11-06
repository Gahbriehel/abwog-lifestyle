import type { Metadata } from "next";
import Link from "next/link";
import { ErrorCard, EmptyCard } from "@/components/events/EventsEmpty";
import { GivingAccountCard } from "@/components/give/GivingAccountCard";
import { getGivingAccounts } from "@/lib/dove";
import type { GivingAccount, GivingPurpose } from "@/lib/types";

export const metadata: Metadata = { title: "Give" };

const PURPOSES: { id: GivingPurpose; label: string; hint: string }[] = [
  { id: "TITHE", label: "Tithe", hint: "Your faithful 10%" },
  { id: "OFFERING", label: "Offering", hint: "A generous gift to God" },
  { id: "BUILDING", label: "Building fund", hint: "Build the house of God" },
  { id: "MISSIONS", label: "Missions", hint: "Advance the gospel" },
  { id: "SEED", label: "Seed", hint: "Sow into good ground" },
  { id: "SPECIAL", label: "Special", hint: "Welfare and other giving" },
];

const CURRENCY_ORDER = ["NGN", "USD", "GBP", "EUR"];
const CURRENCY_TITLE: Record<string, string> = {
  NGN: "Naira accounts",
  USD: "Dollar accounts",
  GBP: "Pound accounts",
  EUR: "Euro accounts",
};

function groupByCurrency(accounts: GivingAccount[]) {
  const groups = new Map<string, GivingAccount[]>();
  for (const account of accounts) groups.set(account.currency, [...(groups.get(account.currency) ?? []), account]);
  return [...groups.entries()].sort(([a], [b]) => {
    const ia = CURRENCY_ORDER.indexOf(a);
    const ib = CURRENCY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export default async function GivePage({ searchParams }: { searchParams: Promise<{ purpose?: string }> }) {
  const { purpose: raw } = await searchParams;
  const selected = PURPOSES.find((p) => p.id === raw?.toUpperCase()) ?? PURPOSES[0];

  let accounts: GivingAccount[] | null = null;
  try {
    accounts = await getGivingAccounts(selected.id);
  } catch (error) {
    console.error("giving accounts failed", error instanceof Error ? error.message : error);
  }

  return (
    <>
      <h1 className="type-title">Give</h1>
      <p className="mt-1 max-w-2xl text-balance text-fg-muted">
        Thank you for sowing into the work of God. Choose what you&apos;re giving towards, then make a transfer from your bank app.
      </p>

      <nav aria-label="Giving purpose" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PURPOSES.map((p) => {
          const active = p.id === selected.id;
          return (
            <Link
              key={p.id}
              href={`/give?purpose=${p.id}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`rounded-[var(--radius-control)] border px-3 py-2.5 transition-colors ${
                active ? "border-gold bg-gold-soft" : "border-border bg-surface hover:border-fg-muted"
              }`}
            >
              <span className="block text-sm font-semibold">{p.label}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{p.hint}</span>
            </Link>
          );
        })}
      </nav>

      {accounts === null ? (
        <div className="mt-6">
          <ErrorCard title="We couldn't load our giving details." hint="Please check your connection and try again." />
        </div>
      ) : accounts.length === 0 ? (
        <div className="mt-6">
          <EmptyCard title="Giving details aren't available yet" hint="Please check back soon." />
        </div>
      ) : (
        groupByCurrency(accounts).map(([currency, list]) => (
          <section key={currency} aria-labelledby={`grp-${currency}`} className="mt-8">
            <h2 id={`grp-${currency}`} className="type-eyebrow text-fg-muted">
              {CURRENCY_TITLE[currency] ?? `${currency} accounts`}
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2 lg:gap-6">
              {list.map((account) => (
                <GivingAccountCard key={account.id} account={account} />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="mt-6 text-balance text-center text-sm text-fg-muted md:text-left">
        Always confirm account details with the church office if anything looks unfamiliar.
      </p>
    </>
  );
}
