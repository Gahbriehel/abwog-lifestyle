"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { setTheme, useThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Light / Dark / System switch. "System" follows the device setting. */
export function ThemeToggle() {
  const current = useThemePreference();
  return (
    <div className="px-3 pb-3 pt-3">
      <p className="type-eyebrow mb-2 px-1 text-fg-muted">Theme</p>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-surface-muted p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-3px)] text-[13px] font-medium transition-colors",
                selected ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon aria-hidden className="size-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
