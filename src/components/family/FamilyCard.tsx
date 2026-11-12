"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  addFamilyMember,
  getFamilyClaimLink,
  unlinkFamilyMember,
} from "@/app/(app)/account/family-actions";
import { Button } from "@/components/ui/Button";
import { PillRadioGroup } from "@/components/ui/Choice";
import { controlClasses, FieldError, TextField } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Misc";
import { cn } from "@/lib/cn";
import type { Relative } from "@/lib/types";
import {
  addRelativeSchema,
  RELATIONSHIP_LABELS,
  RELATIONSHIP_OPTIONS,
  type AddRelativeInput,
} from "@/lib/validation";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
] as const;

/** Add the people in your family who aren't on the app yet, and help them in. */
export function FamilyCard({ relatives }: { relatives: Relative[] }) {
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="family-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-11 items-center justify-center rounded-full bg-gold-soft text-gold"
        >
          <Users className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="family-title" className="type-card">
            Your family
          </h2>
          <p className="text-sm text-fg-muted">
            Add family who aren&apos;t on the app yet, so the church can reach them too.
          </p>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-3 text-sm text-fg-muted">
          {notice}
        </p>
      )}

      {relatives.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {relatives.map((relative) => (
            <RelativeRow key={relative.relationshipId} relative={relative} onNotice={setNotice} />
          ))}
        </ul>
      )}

      {adding ? (
        <AddFamilyForm
          onDone={() => {
            setAdding(false);
            setNotice("Added. They'll appear here.");
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button
          variant="secondary"
          fullWidth
          className="mt-4"
          icon={<UserPlus aria-hidden className="size-4" />}
          onClick={() => {
            setNotice(null);
            setAdding(true);
          }}
        >
          Add a family member
        </Button>
      )}
    </section>
  );
}

function RelativeRow({
  relative,
  onNotice,
}: {
  relative: Relative;
  onNotice: (message: string | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { person } = relative;
  const contact = [relative.maskedEmail, relative.maskedPhone].filter(Boolean).join(" · ");

  const sendLink = () => {
    setError(null);
    onNotice(null);
    startTransition(async () => {
      const result = await getFamilyClaimLink(person.id);
      if (result.ok) {
        // Opens WhatsApp on this phone with their link ready to send. Dove sends nothing itself.
        window.location.assign(result.whatsappUrl);
        return;
      }
      if (result.signedOut) return router.push("/login");
      setError(result.message);
    });
  };

  const unlink = () => {
    setError(null);
    startTransition(async () => {
      const result = await unlinkFamilyMember(relative.relationshipId);
      if (result.ok) {
        setConfirming(false);
        onNotice("Link removed. Nobody was deleted.");
        router.refresh();
        return;
      }
      if (result.signedOut) return router.push("/login");
      setError(result.message);
    });
  };

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">
            {person.firstName} {person.lastName}
          </p>
          <p className="text-sm text-fg-muted">
            {RELATIONSHIP_LABELS[relative.relationship] ?? relative.relationship}
            {contact ? ` · ${contact}` : ""}
          </p>
        </div>
        <Badge tone={relative.claimed ? "primary" : "gold"}>
          {relative.claimed ? "On the app" : "Not set up"}
        </Badge>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {relative.canSendClaimLink && (
          <Button
            size="sm"
            variant="secondary"
            loading={pending && !confirming}
            loadingLabel="Preparing…"
            icon={<MessageCircle aria-hidden className="size-4" />}
            onClick={sendLink}
          >
            Send their link on WhatsApp
          </Button>
        )}
        {confirming ? (
          <>
            <p className="w-full text-sm text-fg-muted">
              Remove {person.firstName} {person.lastName} from your family links? This disconnects the
              relationship, but doesn&apos;t delete their church profile.
            </p>
            <Button size="sm" variant="secondary" loading={pending} loadingLabel="Removing…" onClick={unlink}>
              Yes, remove the link
            </Button>
            <Button size="sm" variant="text" disabled={pending} onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button size="sm" variant="text" disabled={pending} onClick={() => setConfirming(true)}>
            Remove link
          </Button>
        )}
      </div>
    </li>
  );
}

function AddFamilyForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddRelativeInput>({
    resolver: zodResolver(addRelativeSchema),
    mode: "onSubmit",
    defaultValues: {
      firstName: "",
      lastName: "",
      relationshipNote: "",
      gender: "",
      dateOfBirth: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await addFamilyMember(values);
      if (result.ok) {
        onDone();
        router.refresh();
        return;
      }
      if (result.signedOut) return router.push("/login");
      if (result.field) setError(result.field, { message: result.message }, { shouldFocus: true });
      else setFormError(result.message);
    });
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4 border-t border-border pt-4">
      <p className="text-sm text-fg-muted">
        They get their own profile. Only they can edit it once they&apos;ve set it up.
      </p>
      <TextField
        label="First name"
        required
        autoComplete="off"
        autoFocus
        error={errors.firstName?.message}
        {...register("firstName")}
      />
      <TextField
        label="Last name"
        required
        autoComplete="off"
        error={errors.lastName?.message}
        {...register("lastName")}
      />

      <div>
        <label htmlFor="relationship" className="mb-1.5 block text-sm font-medium text-fg">
          They are your…
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        </label>
        <select
          id="relationship"
          defaultValue=""
          aria-invalid={errors.relationship ? true : undefined}
          aria-describedby={errors.relationship ? "relationship-error" : undefined}
          className={cn(controlClasses, errors.relationship ? "border-danger" : "border-border-strong")}
          {...register("relationship")}
        >
          <option value="" disabled>
            Choose one
          </option>
          {RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldError id="relationship-error">{errors.relationship?.message}</FieldError>
      </div>

      <TextField
        label="Email address"
        type="email"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        hint="Email or phone (or both) is needed, so they can reach their own profile later. For a child, use your own second email or number."
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        placeholder="803 456 7890"
        addon={
          <>
            <span aria-hidden>🇳🇬</span> +234
          </>
        }
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Controller
        control={control}
        name="gender"
        render={({ field }) => (
          <PillRadioGroup
            ref={field.ref}
            legend="Gender (optional)"
            name={field.name}
            options={GENDER_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            error={errors.gender?.message}
          />
        )}
      />
      <TextField
        label="Date of birth (optional)"
        type="date"
        max={today}
        min="1900-01-01"
        error={errors.dateOfBirth?.message}
        {...register("dateOfBirth")}
      />

      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" fullWidth loading={pending} loadingLabel="Adding…">
        Add to my family
      </Button>
      <Button variant="text" fullWidth disabled={pending} onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
