"use client";

import type { ChangeEvent, ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { TextField } from "./Field";

type PinFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "inputMode" | "maxLength">;

/** 4-digit PIN input: numeric keypad, masked, digits only. Works with react-hook-form's `register`. */
export function PinField({ onChange, className, autoComplete = "off", ...props }: PinFieldProps) {
  return (
    <TextField
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      autoComplete={autoComplete}
      placeholder="••••"
      className={cn("text-center font-mono text-2xl tracking-[0.5em]", className)}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
        onChange?.(event);
      }}
      {...props}
    />
  );
}
