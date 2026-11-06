import { SessionRenewal } from "@/components/auth/SessionRenewal";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sidebar } from "@/components/shell/Sidebar";
import { TabBar } from "@/components/shell/TabBar";
import { getSessionToken } from "@/lib/session";

/**
 * Shell for the public screens (home, events, giving) and the member's account.
 * Nothing here requires a session; the cookie only decides which account tab to show.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const signedIn = (await getSessionToken()) !== null;
  return (
    <>
      <AppHeader signedIn={signedIn} />
      {signedIn && <SessionRenewal />}
      <Sidebar signedIn={signedIn} />
      <div className="lg:pl-64">
        <div className="page-container flex min-h-[calc(100dvh-3.5rem)] flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:pt-8 lg:min-h-[calc(100dvh-4rem)] lg:pb-16 lg:pt-10">
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
      <TabBar signedIn={signedIn} />
    </>
  );
}
