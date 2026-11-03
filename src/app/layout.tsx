import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { church } from "@/lib/church";
import { installPromptCaptureScript } from "@/lib/install-prompt";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://app.abwog.org"),
  title: { default: church.shortName, template: `%s · ${church.shortName}` },
  description: `${church.name} (${church.formerName}). Keep your details up to date and stay connected with your church.`,
  applicationName: church.shortName,
  appleWebApp: { capable: true, title: church.shortName, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#241e1c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${fraunces.variable} ${dmSans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: installPromptCaptureScript }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
