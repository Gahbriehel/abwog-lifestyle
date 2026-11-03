"use client";

import { ChurchHeader } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Screen>
      <ChurchHeader />
      <div className="mt-12 text-center">
        <h1 className="font-serif text-[26px] font-semibold">Something went wrong</h1>
        <p className="mt-2 text-fg-muted">Please try again in a moment.</p>
      </div>
      <Button fullWidth className="mt-8" onClick={reset}>
        Try again
      </Button>
    </Screen>
  );
}
