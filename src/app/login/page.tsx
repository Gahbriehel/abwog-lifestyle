import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Screen>
      <LoginForm />
    </Screen>
  );
}
