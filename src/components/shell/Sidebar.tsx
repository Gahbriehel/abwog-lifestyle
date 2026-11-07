"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ACCOUNT, isActive, menuFor, type NavItem } from "./nav";
import { SignInCta } from "./SignInCta";

/**
 * Desktop navigation (lg and up), under the top bar. Replaces the bottom tabs, which are hidden
 * at that width, so it reuses the "Main" landmark name: only one is ever rendered visibly.
 * Sign in and Account live in the top bar, so they aren't repeated here.
 */
export function Sidebar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const primary = menuFor(signedIn).filter((item) => item.href !== ACCOUNT.href && item.href !== "/login");

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {primary.map((item) => (
            <li key={item.href}>
              <SidebarLink item={item} active={isActive(item, pathname)} />
            </li>
          ))}
        </ul>
      </nav>
      {!signedIn && <SignInCta />}
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors",
        active ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-muted hover:text-fg",
      )}
    >
      <Icon aria-hidden className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
    </Link>
  );
}
