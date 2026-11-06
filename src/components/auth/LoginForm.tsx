"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { login } from "@/app/login/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChurchHeader } from "@/components/ui/Brand";
import { TextField } from "@/components/ui/Field";
import { PinField } from "@/components/ui/PinField";
import { loginSchema, type LoginValues } from "@/lib/validation";

type Notice = { kind: "no-pin" } | { kind: "locked" | "error"; message: string };

export function LoginForm() {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: { identifier: "", pin: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    startTransition(async () => {
      // On success the action redirects, so a result only ever means "stay here".
      const result = await login(values);
      if (!result) return;
      if (result.kind === "field") {
        if (result.field === "pin") resetField("pin");
        setError(result.field, { message: result.message }, { shouldFocus: true });
      } else {
        resetField("pin");
        setNotice(result);
      }
    });
  });

  return (
    <>
      <ChurchHeader variant="full" />
      <h1 className="mt-8 type-title text-center">
        Welcome back
      </h1>
      <p className="mt-2 text-balance text-center text-fg-muted">
        Sign in with your phone number or email and your 4-digit PIN.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <TextField
          label="Phone number or email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          error={errors.identifier?.message}
          {...register("identifier")}
        />
        <PinField label="PIN" autoComplete="current-password" error={errors.pin?.message} {...register("pin")} />

        {notice?.kind === "no-pin" && (
          <div role="alert" className="rounded-[var(--radius-control)] bg-gold-soft p-4 text-[15px]">
            <p>You haven&apos;t set a PIN yet. Request an email link to sign in and create one.</p>
            <Link
              href="/profile"
              className="mt-2 inline-block font-semibold text-primary underline-offset-4 hover:underline"
            >
              Email me a link
            </Link>
          </div>
        )}
        {(notice?.kind === "locked" || notice?.kind === "error") && (
          <p role="alert" className="text-sm text-danger">
            {notice.message}
          </p>
        )}

        <Button type="submit" fullWidth loading={pending} loadingLabel="Signing in…">
          Sign in
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center">
        <ButtonLink href="/profile" variant="text">
          Forgot your PIN? Sign in with email
        </ButtonLink>
        <ButtonLink href="/" variant="text">
          Back to home
        </ButtonLink>
      </div>
    </>
  );
}
