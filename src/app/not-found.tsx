import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { ChurchHeader } from "@/components/ui/Brand";
import { Screen } from "@/components/ui/Screen";

export default function NotFound() {
  return (
    <Screen>
      <ChurchHeader />
      <div className="mt-12 text-center">
        <h1 className="font-serif text-[26px] font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-fg-muted">It may have moved. Let&apos;s take you home.</p>
      </div>
      <Link href="/" className={buttonClasses("primary", true, "mt-8")}>
        Go home
      </Link>
    </Screen>
  );
}
