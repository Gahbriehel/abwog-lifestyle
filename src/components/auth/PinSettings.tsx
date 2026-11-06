"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { changePin } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { PinField } from "@/components/ui/PinField";
import { changePinSchemaFor, type ChangePinValues } from "@/lib/validation";

/** Set or change the sign-in PIN from the home screen (no emailed link needed). */
export function PinSettings({ hasPin }: { hasPin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => changePinSchemaFor({ hasPin }), [hasPin]);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePinValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { currentPin: "", pin: "", confirmPin: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await changePin(values, hasPin);
      if (result.ok) {
        reset();
        setOpen(false);
        setDone(true);
        router.refresh();
        return;
      }
      if (result.signedOut) return router.push("/login");
      if (result.field) setError(result.field, { message: result.message }, { shouldFocus: true });
      else setFormError(result.message);
    });
  });

  const title = hasPin ? "Change your PIN" : "Set a sign-in PIN";

  return (
    <section
      aria-labelledby="pin-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-11 items-center justify-center rounded-full bg-gold-soft text-gold"
        >
          <KeyRound className="size-5" />
        </span>
        <div>
          <h2 id="pin-title" className="font-serif text-lg font-semibold leading-tight">
            {title}
          </h2>
          <p className="text-sm text-fg-muted">
            {hasPin ? "PIN sign-in is on." : "Sign in on any device without an email link."}
          </p>
        </div>
      </div>

      {done && !open && (
        <p role="status" className="mt-3 flex items-center gap-2 text-[15px] text-fg-muted">
          <Check aria-hidden className="size-4 text-primary" /> Your PIN is saved.
        </p>
      )}

      {open ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
          {hasPin && (
            <PinField
              label="Current PIN"
              autoComplete="current-password"
              autoFocus
              error={errors.currentPin?.message}
              {...register("currentPin")}
            />
          )}
          <PinField
            label="New PIN"
            autoComplete="new-password"
            autoFocus={!hasPin}
            error={errors.pin?.message}
            {...register("pin")}
          />
          <PinField
            label="Confirm new PIN"
            autoComplete="new-password"
            error={errors.confirmPin?.message}
            {...register("confirmPin")}
          />
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
          <Button type="submit" fullWidth loading={pending} loadingLabel="Saving…">
            Save PIN
          </Button>
          <Button
            variant="text"
            fullWidth
            disabled={pending}
            onClick={() => {
              reset();
              setFormError(null);
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          variant="secondary"
          fullWidth
          className="mt-4"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          {title}
        </Button>
      )}
    </section>
  );
}
