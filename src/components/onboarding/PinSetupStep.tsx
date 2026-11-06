"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { ChurchHeader, IconCircle } from "@/components/ui/Brand";
import { PinField } from "@/components/ui/PinField";
import { newPinSchema, type NewPinValues } from "@/lib/validation";

/**
 * Optional last step of onboarding. `onConfirm` saves the whole profile (with the PIN, or without it
 * when skipped) and returns an error message if the save didn't go through.
 */
export function PinSetupStep({
  hasPin,
  onConfirm,
  onBack,
}: {
  /** They already have a PIN (e.g. resetting it via an emailed link). */
  hasPin: boolean;
  onConfirm: (pin?: string) => Promise<string | null>;
  onBack: () => void;
}) {
  const [saving, setSaving] = useState<"pin" | "skip" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPinValues>({
    resolver: zodResolver(newPinSchema),
    mode: "onSubmit",
    defaultValues: { pin: "", confirmPin: "" },
  });

  const run = async (mode: "pin" | "skip", pin?: string) => {
    setFormError(null);
    setSaving(mode);
    const error = await onConfirm(pin);
    // On success this component is unmounted, so only reset state on failure.
    if (error) {
      setFormError(error);
      setSaving(null);
    }
  };

  const busy = saving !== null;

  return (
    <>
      <ChurchHeader />
      <div className="mt-8 flex flex-col items-center text-center">
        <IconCircle>
          <KeyRound />
        </IconCircle>
        <h1 className="mt-6 font-serif text-[26px] font-semibold leading-tight">
          {hasPin ? "Choose a new PIN" : "Create a 4-digit PIN"}
        </h1>
        <p className="mt-2 text-balance text-fg-muted">
          {hasPin
            ? "Enter a new PIN, or keep the one you have."
            : "Use it with your phone number or email to sign in next time, without waiting for an email link."}
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(({ pin }) => run("pin", pin))}
        className="mt-8 space-y-4"
      >
        <PinField
          label="PIN"
          autoFocus
          autoComplete="new-password"
          error={errors.pin?.message}
          {...register("pin")}
        />
        <PinField
          label="Confirm PIN"
          autoComplete="new-password"
          error={errors.confirmPin?.message}
          {...register("confirmPin")}
        />
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button
          type="submit"
          fullWidth
          loading={saving === "pin"}
          loadingLabel="Saving…"
          disabled={busy}
        >
          Save PIN &amp; finish
        </Button>
        <Button
          variant="secondary"
          fullWidth
          loading={saving === "skip"}
          loadingLabel="Saving…"
          disabled={busy}
          onClick={() => run("skip")}
        >
          {hasPin ? "Keep my current PIN" : "Skip for now"}
        </Button>
        <Button variant="text" fullWidth disabled={busy} onClick={onBack}>
          Back to my details
        </Button>
      </form>
      {!hasPin && (
        <p className="mt-2 text-center text-sm text-fg-muted">
          You can set a PIN later from the home screen.
        </p>
      )}
    </>
  );
}
