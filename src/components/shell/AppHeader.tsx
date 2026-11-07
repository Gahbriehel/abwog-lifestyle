"use client";

import { LogIn, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChurchLogo } from "@/components/ui/Brand";
import { buttonClasses } from "@/components/ui/Button";
import { church } from "@/lib/church";
import { cn } from "@/lib/cn";
import { ACCOUNT, isActive, menuFor, SIGN_IN } from "./nav";
import { SignInCta } from "./SignInCta";

/**
 * Top bar on every width. Below lg it opens a slide-in menu (a native <dialog>, so focus trapping
 * and Esc come free); from lg the sidebar sits underneath it and the menu button is hidden.
 */
export function AppHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);

  // Close the menu when navigation completes.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="page-container flex h-14 items-center gap-2 lg:h-16 lg:max-w-none lg:px-6">
        <button
          type="button"
          onClick={() => {
            dialog.current?.showModal();
            // showModal() focuses the first control (the close button), which iOS paints with a halo.
            // Park focus on the dialog itself instead.
            dialog.current?.focus();
          }}
          aria-label="Open menu"
          className="-ml-2.5 inline-flex size-11 items-center justify-center rounded-full text-fg hover:bg-surface-muted lg:hidden"
        >
          <Menu aria-hidden className="size-[22px]" />
        </button>
        <Link href="/" className="flex items-center" aria-label={`${church.shortName} home`}>
          <ChurchLogo size={32} />
        </Link>
        {signedIn ? (
          // Phones reach the account from the tab bar; wider screens get it up here.
          <Link
            href={ACCOUNT.href}
            aria-current={isActive(ACCOUNT, pathname) ? "page" : undefined}
            className={buttonClasses("ghost", false, "ml-auto hidden aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary-soft-fg lg:inline-flex", "sm")}
          >
            <UserRound aria-hidden className="size-4" />
            Account
          </Link>
        ) : (
          <Link href="/login" className={buttonClasses("secondary", false, "ml-auto", "sm")}>
            <LogIn aria-hidden className="size-4" />
            Sign in
          </Link>
        )}
      </div>

      <dialog
        ref={dialog}
        aria-label="Menu"
        tabIndex={-1}
        onClick={(e) => {
          // A click on the backdrop lands on the <dialog> element itself.
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-bg p-0 text-fg outline-none backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <Link
              href="/"
              onClick={() => dialog.current?.close()}
              aria-label={`${church.shortName} home`}
              className="flex items-center gap-2.5"
            >
              <ChurchLogo size={28} />
              <span className="font-serif text-base font-semibold">{church.shortName}</span>
            </Link>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close menu"
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-full outline-none [-webkit-tap-highlight-color:transparent] focus:outline-none hover:bg-surface-muted"
            >
              <X aria-hidden className="size-6" />
            </button>
          </div>
          <nav aria-label="Menu" className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {menuFor(signedIn).filter((item) => signedIn || item.href !== SIGN_IN.href).map((item) => {
                const active = isActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium",
                        active ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                      )}
                    >
                      <Icon aria-hidden className="size-[18px]" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {!signedIn && <SignInCta />}
        </div>
      </dialog>
    </header>
  );
}
