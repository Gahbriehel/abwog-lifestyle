export type InstallContext =
  | "installed" // already running as an installed app
  | "prompt" // Chrome/Edge/Samsung handed us a beforeinstallprompt event
  | "ios" // iOS browser that can Add to Home Screen via the Share sheet
  | "in-app" // Gmail/WhatsApp/Instagram/Facebook webviews: cannot install
  | "unsupported";

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|GSA\/|Snapchat|Twitter|LinkedInApp|; wv\)/i;

export function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

export function detectInstallContext(input: {
  userAgent: string;
  standalone: boolean;
  hasPrompt: boolean;
}): InstallContext {
  const { userAgent: ua, standalone, hasPrompt } = input;
  if (standalone) return "installed";
  if (IN_APP.test(ua)) return "in-app";
  if (hasPrompt) return "prompt";
  if (isIOS(ua) && /Safari\//.test(ua)) return "ios";
  return "unsupported";
}
