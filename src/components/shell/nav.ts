import { CalendarDays, HandHeart, House, LogIn, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also active on nested paths, e.g. /events/123. */
  nested: boolean;
}

export const HOME: NavItem = { href: "/", label: "Home", icon: House, nested: false };
export const EVENTS: NavItem = { href: "/events", label: "Events", icon: CalendarDays, nested: true };
export const GIVE: NavItem = { href: "/give", label: "Give", icon: HandHeart, nested: true };
export const SIGN_IN: NavItem = { href: "/login", label: "Sign in", icon: LogIn, nested: false };
export const ACCOUNT: NavItem = { href: "/account", label: "Account", icon: UserRound, nested: true };

/** Bottom tabs: Home, Events and the account slot. Giving lives in the menu and on the home page. */
export const tabsFor = (signedIn: boolean): NavItem[] => [HOME, EVENTS, signedIn ? ACCOUNT : SIGN_IN];

/** Side menu: everything public, plus the account slot. */
export const menuFor = (signedIn: boolean): NavItem[] => [HOME, EVENTS, GIVE, signedIn ? ACCOUNT : SIGN_IN];

export function isActive(item: NavItem, pathname: string): boolean {
  return item.nested ? pathname === item.href || pathname.startsWith(`${item.href}/`) : pathname === item.href;
}
