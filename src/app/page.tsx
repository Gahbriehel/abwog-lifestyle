import Link from "next/link";
import { InstallCard } from "@/components/onboarding/InstallCard";
import { buttonClasses } from "@/components/ui/Button";
import { ChurchHeader } from "@/components/ui/Brand";
import { Screen } from "@/components/ui/Screen";
import { appUrl } from "@/lib/app-url";
import { church } from "@/lib/church";

export default function HomePage() {
  return (
    <Screen>
      <ChurchHeader variant="full" />
      <h1 className="mt-8 text-balance text-center font-serif text-[28px] font-semibold leading-tight">
        Welcome to {church.shortName}
      </h1>
      <p className="mt-2 text-balance text-center text-fg-muted">
        Church updates, devotionals and events are coming here soon. For now, help us keep your
        details up to date.
      </p>
      <Link href="/profile" className={buttonClasses("primary", true, "mt-8")}>
        Update my details
      </Link>
      <div className="mt-6">
        <InstallCard appUrl={appUrl()} />
      </div>
      <a
        href={church.websiteUrl}
        className="mt-6 text-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
      >
        Visit {church.websiteUrl.replace(/^https?:\/\//, "")}
      </a>
    </Screen>
  );
}
