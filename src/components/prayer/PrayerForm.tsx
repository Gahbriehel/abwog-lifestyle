"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { sendPrayerRequest } from "@/app/(app)/prayer/actions";
import { Button, buttonClasses } from "@/components/ui/Button";
import { SelectableCardGroup } from "@/components/ui/Choice";
import { TextArea, TextField, controlClasses } from "@/components/ui/Field";
import { Toast } from "@/components/ui/Misc";
import { cn } from "@/lib/cn";
import { DEFAULT_PRAYER_CATEGORY, PRAYER_CATEGORIES, PRAYER_MAX_LENGTH, PRAYER_VISIBILITY_OPTIONS } from "@/lib/prayer";
import { prayerRequestSchema, type PrayerRequestValues } from "@/lib/validation";

interface Props {
  defaults: { name: string; email: string; phone: string };
}

export function PrayerForm({ defaults }: Props) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const empty: PrayerRequestValues = {
    ...defaults,
    category: DEFAULT_PRAYER_CATEGORY,
    message: "",
    visibility: "PUBLIC",
    website: "",
  };
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<PrayerRequestValues>({ resolver: zodResolver(prayerRequestSchema), mode: "onSubmit", defaultValues: empty });

  const message = useWatch({ control, name: "message" }) ?? "";
  const visibility = useWatch({ control, name: "visibility" });

  const onSubmit = handleSubmit((values) => {
    setToast(null);
    startTransition(async () => {
      const result = await sendPrayerRequest(values);
      if (result.ok) {
        setSent(true);
        window.scrollTo({ top: 0 });
      } else if (result.field && result.field !== "website") {
        setError(result.field, { message: result.message }, { shouldFocus: true });
      } else {
        // The typed request stays in the form so nothing is lost.
        setToast(result.message);
      }
    });
  });

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-gold-soft text-gold">
          <HeartHandshake aria-hidden className="size-8" />
        </span>
        <h1 className="type-title mt-4">We&apos;ve received your request</h1>
        <p className="mt-1 text-balance text-fg-muted">Our prayer team will stand with you. God bless you.</p>
        <Button
          variant="secondary"
          fullWidth
          className="mt-6"
          onClick={() => {
            reset({ ...empty, message: "" });
            setSent(false);
          }}
        >
          Send another request
        </Button>
        <Link href="/" className={buttonClasses("text", true, "mt-2")}>
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col">
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <h1 className="type-title">Prayer</h1>
      <p className="mt-1 text-balance text-fg-muted">
        Share what you&apos;d like us to pray about. Our prayer team and pastors will pray with you.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <TextField label="Your name" autoComplete="name" required error={errors.name?.message} {...register("name")} />
        <TextField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          hint="So our team can follow up with you."
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Phone number (optional)"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="803 456 7890"
          addon={
            <>
              <span aria-hidden>🇳🇬</span> +234
            </>
          }
          error={errors.phone?.message}
          {...register("phone")}
        />

        <div>
          <label htmlFor="prayer-category" className="mb-1.5 block text-sm font-medium text-fg">
            Category
          </label>
          <select id="prayer-category" className={cn(controlClasses, "border-border-strong")} {...register("category")}>
            {PRAYER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <TextArea
          label="Your prayer request"
          required
          rows={5}
          maxLength={PRAYER_MAX_LENGTH}
          placeholder="Write your prayer request here…"
          hint={`${message.length} / ${PRAYER_MAX_LENGTH}`}
          error={errors.message?.message}
          {...register("message")}
        />

        <SelectableCardGroup
          legend="Who can see this?"
          name="visibility"
          options={PRAYER_VISIBILITY_OPTIONS}
          value={visibility}
          onChange={(value) => setValue("visibility", value)}
        />

        {/* Honeypot: people never see or tab to this. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
          </label>
        </div>

        <Button type="submit" size="lg" fullWidth loading={pending} loadingLabel="Sending…" className="mt-2">
          Send prayer request
        </Button>
      </form>
    </div>
  );
}
