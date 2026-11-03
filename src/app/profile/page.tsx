import type { Metadata } from "next";
import { ClaimFlow } from "@/components/onboarding/ClaimFlow";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Update your details",
  robots: { index: false },
};

export default function ClaimPage() {
  return (
    <Screen>
      <ClaimFlow />
    </Screen>
  );
}
