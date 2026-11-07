import { LogIn } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

/** Filled "Sign in" button with a hint, pinned to the bottom of the side navigation for signed-out visitors. */
export function SignInCta() {
  return (
    <div className="border-t border-border px-3 pb-4 pt-4">
      <Link href="/login" className={buttonClasses("primary", true, undefined, "md")}>
        <LogIn aria-hidden className="size-4" />
        Sign in
      </Link>
      <p className="mt-2 text-center text-xs text-fg-muted">Sign in to access more features</p>
    </div>
  );
}
