"use client";

import { AlertCircle } from "lucide-react";
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export const controlClasses =
  "block min-h-12 w-full rounded-[var(--radius-control)] border bg-surface px-4 text-base text-fg placeholder:text-fg-muted/70 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring";

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

function FieldShell({ id, label, required, hint, error, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-fg-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  addon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  hint,
  error,
  addon,
  required,
  className,
  id: idProp,
  ref,
  ...props
}: TextFieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const input = (
    <input
      ref={ref}
      id={id}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      aria-describedby={
        [addon ? `${id}-addon` : null, describedBy(id, error, hint)].filter(Boolean).join(" ") ||
        undefined
      }
      className={cn(
        controlClasses,
        error ? "border-danger" : "border-border-strong",
        addon ? "flex-1" : undefined,
        className,
      )}
      {...props}
    />
  );
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      {addon ? (
        <div className="flex gap-2">
          <span
            id={`${id}-addon`}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-[var(--radius-control)] border border-border-strong bg-surface px-3 text-base text-fg"
          >
            {addon}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({
  label,
  hint,
  error,
  required,
  className,
  id: idProp,
  ref,
  ...props
}: TextAreaProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          controlClasses,
          "min-h-24 py-3 leading-normal",
          error ? "border-danger" : "border-border-strong",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
