"use client";

import { Check } from "lucide-react";
import { useId, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";
import { FieldError } from "./Field";

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string | null;
}

interface GroupProps {
  legend: string;
  legendClassName?: string;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  id?: string;
  ref?: Ref<HTMLFieldSetElement>;
}

function Group({ legend, legendClassName, description, error, required, children, id, ref }: GroupProps) {
  const generated = useId();
  const baseId = id ?? generated;
  return (
    <fieldset
      ref={ref}
      id={baseId}
      tabIndex={-1}
      aria-describedby={error ? `${baseId}-error` : description ? `${baseId}-desc` : undefined}
      className="min-w-0 focus:outline-none"
    >
      <legend className={cn("mb-1.5 text-sm font-medium text-fg", legendClassName)}>
        {legend}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </legend>
      {description && (
        <div id={`${baseId}-desc`} className="mb-3 text-sm text-fg-muted">
          {description}
        </div>
      )}
      {children}
      <FieldError id={`${baseId}-error`}>{error}</FieldError>
    </fieldset>
  );
}

/** Pill-shaped radios (gender). */
export function PillRadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  ref,
}: {
  ref?: Ref<HTMLFieldSetElement>;
  legend: string;
  name: string;
  options: readonly Option<T>[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <Group ref={ref} legend={legend} error={error}>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-[15px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border-strong bg-surface text-fg hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {selected && <Check aria-hidden className="size-4" />}
              {option.label}
            </label>
          );
        })}
      </div>
    </Group>
  );
}

/** Radio cards with a description (membership status). */
export function SelectableCardGroup<T extends string>({
  legend,
  description,
  name,
  options,
  value,
  onChange,
  error,
  id,
  ref,
}: {
  ref?: Ref<HTMLFieldSetElement>;
  legend: string;
  description?: ReactNode;
  name: string;
  options: readonly Option<T>[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
  id?: string;
}) {
  return (
    <Group
      ref={ref}
      id={id}
      legend={legend}
      legendClassName="type-heading"
      description={description}
      error={error}
    >
      <div className="space-y-2.5">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-16 cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-primary" : "border-border-strong",
                )}
              >
                {selected && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-fg">{option.label}</span>
                {option.description && (
                  <span className="block text-sm text-fg-muted">{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </Group>
  );
}

/** Checkbox cards in a grid (departments). */
export function CheckCardGroup({
  legend,
  description,
  name,
  options,
  values,
  onChange,
  error,
  required,
  id,
  ref,
}: {
  ref?: Ref<HTMLFieldSetElement>;
  legend: string;
  description?: ReactNode;
  name: string;
  options: readonly Option<string>[];
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  required?: boolean;
  id?: string;
}) {
  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  return (
    <Group
      ref={ref}
      id={id}
      legend={legend}
      legendClassName="text-[17px] font-semibold leading-snug"
      description={description}
      error={error}
      required={required}
    >
      <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex min-h-16 cursor-pointer flex-col rounded-[var(--radius-control)] border p-3 pr-10 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                checked
                  ? "border-primary bg-primary-soft"
                  : error
                    ? "border-danger bg-surface"
                    : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => toggle(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "absolute right-3 top-3 flex size-5 items-center justify-center rounded-md border-2",
                  checked ? "border-primary bg-primary text-on-primary" : "border-border-strong",
                )}
              >
                {checked && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="font-semibold text-fg">{option.label}</span>
              {option.description && (
                <span className="text-sm leading-snug text-fg-muted">{option.description}</span>
              )}
            </label>
          );
        })}
      </div>
    </Group>
  );
}
