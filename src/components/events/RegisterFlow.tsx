"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { register as registerAction } from "@/app/(app)/events/[id]/register/actions";
import { Button, buttonClasses } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Toast } from "@/components/ui/Misc";
import { formatEventWhen } from "@/lib/events";
import type { EventRegistration } from "@/lib/types";
import { registerSchema, type RegisterValues } from "@/lib/validation";

interface Props {
  event: { id: string; title: string; startDate: string; endDate: string; location: string | null };
  defaults: RegisterValues;
}

export function RegisterFlow({ event, defaults }: Props) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState<{ registration: EventRegistration; alreadyRegistered: boolean } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), mode: "onSubmit", defaultValues: defaults });

  const onSubmit = handleSubmit((values) => {
    setToast(null);
    startTransition(async () => {
      const result = await registerAction(event.id, values);
      if (result.ok) {
        setDone({ registration: result.registration, alreadyRegistered: result.alreadyRegistered });
        window.scrollTo({ top: 0 });
      } else if (result.field) {
        setError(result.field, { message: result.message }, { shouldFocus: true });
      } else {
        setToast(result.message);
      }
    });
  });

  if (done) return <Confirmation event={event} {...done} />;

  return (
    <div className="flex w-full max-w-xl flex-col">
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <Link href={`/events/${event.id}`} className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1 self-start rounded-[var(--radius-control)] px-2 text-sm font-semibold text-primary hover:underline lg:mb-5">
        <ChevronLeft aria-hidden className="size-4" />
        Back
      </Link>
      <h1 className="type-title">Register</h1>
      <div className="mt-3 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3">
        <p className="type-card">{event.title}</p>
        <p className="mt-0.5 text-sm text-fg-muted">{formatEventWhen(event.startDate, event.endDate)}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <TextField label="First name" autoComplete="given-name" required error={errors.firstName?.message} {...register("firstName")} />
          <TextField label="Last name" autoComplete="family-name" required error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <TextField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          hint="We'll email you your check-in QR code."
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="803 456 7890"
          addon={
            <>
              <span aria-hidden>🇳🇬</span> +234
            </>
          }
          hint="Optional if you gave an email."
          error={errors.phone?.message}
          {...register("phone")}
        />
        <Button type="submit" size="lg" fullWidth loading={pending} loadingLabel="Registering…" className="mt-2">
          Complete registration
        </Button>
      </form>
    </div>
  );
}

function Confirmation({
  event,
  registration,
  alreadyRegistered,
}: Pick<Props, "event"> & { registration: EventRegistration; alreadyRegistered: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-gold-soft text-gold">
        <CircleCheck aria-hidden className="size-8" />
      </span>
      <h1 className="type-title mt-4">
        {alreadyRegistered ? "You're already registered" : "You're registered!"}
      </h1>
      <p className="mt-1 text-fg-muted">{event.title}</p>
      <p className="text-sm text-fg-muted">{formatEventWhen(event.startDate, event.endDate)}</p>

      <section aria-label="Your check-in code" className="mt-6 w-full rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm">
        <Image
          src={registration.qrCodeDataUrl}
          alt={`Check-in QR code for registration ${registration.registrationNumber}`}
          width={220}
          height={220}
          unoptimized
          className="mx-auto size-56 rounded-lg bg-white p-2"
        />
        <p className="type-eyebrow mt-4 text-fg-muted">Registration number</p>
        <p className="font-mono text-lg font-semibold tracking-wider">{registration.registrationNumber}</p>
        {registration.team && (
          <p className="mt-3 text-[15px]">
            Your team: <span className="font-semibold">{registration.team.name}</span>
          </p>
        )}
      </section>

      <p className="mt-4 text-balance text-sm text-fg-muted">
        Screenshot this screen and show the code at the registration desk. Lost it? Register again with the same details to see it again.
      </p>
      <Link href="/events" className={buttonClasses("secondary", true, "mt-6")}>
        Back to events
      </Link>
    </div>
  );
}
