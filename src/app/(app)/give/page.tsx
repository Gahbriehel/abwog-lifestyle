import type { Metadata } from "next";
import { ErrorCard, EmptyCard } from "@/components/events/EventsEmpty";
import { GivingAccountCard } from "@/components/give/GivingAccountCard";
import { getGivingAccounts } from "@/lib/dove";
import type { GivingAccount } from "@/lib/types";

export const metadata: Metadata = { title: "Give" };

export default async function GivePage() {
  let accounts: GivingAccount[] | null = null;
  try {
    accounts = await getGivingAccounts();
  } catch (error) {
    console.error("giving accounts failed", error instanceof Error ? error.message : error);
  }

  return (
    <>
      <h1 className="type-title">Give</h1>
      <p className="mt-1 max-w-2xl text-balance text-fg-muted">
        Thank you for sowing into the work of God. Make a transfer from your bank app to any account below.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:mt-8 lg:gap-6">
        {accounts === null ? (
          <ErrorCard title="We couldn't load our giving details." hint="Please check your connection and try again." />
        ) : accounts.length === 0 ? (
          <EmptyCard title="Giving details aren't available yet" hint="Please check back soon." />
        ) : (
          accounts.map((account) => <GivingAccountCard key={account.id} account={account} />)
        )}
      </div>
      <p className="mt-6 text-balance text-center text-sm text-fg-muted md:text-left">
        Always confirm account details with the church office if anything looks unfamiliar.
      </p>
    </>
  );
}
