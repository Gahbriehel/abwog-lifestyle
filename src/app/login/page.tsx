import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { Screen } from "@/components/ui/Screen";
import { toE164 } from "@/lib/phone";
import { waMeUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const REQUEST_LINK_TEXT =
  "Hello, I'd like a link to set up my profile on the church app. My name is ";

export default function LoginPage() {
  // The church's WhatsApp number is optional config. Without it, the button simply doesn't show.
  const number = process.env.CHURCH_WHATSAPP_NUMBER ? toE164(process.env.CHURCH_WHATSAPP_NUMBER) : null;
  return (
    <Screen>
      <LoginForm whatsappUrl={number ? waMeUrl(number, REQUEST_LINK_TEXT) : undefined} />
    </Screen>
  );
}
