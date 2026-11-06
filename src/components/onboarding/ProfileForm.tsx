"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { ChurchHeader } from "@/components/ui/Brand";
import { CheckCardGroup, PillRadioGroup, SelectableCardGroup } from "@/components/ui/Choice";
import { TextArea, TextField } from "@/components/ui/Field";
import { Collapse, StickyActionBar } from "@/components/ui/Misc";
import { MEMBERSHIP_OPTIONS } from "@/lib/church";
import { toInputValue } from "@/lib/phone";
import type { ProfileBootstrap } from "@/lib/types";
import {
  DEPARTMENTS_REQUIRED,
  profileSchemaFor,
  showsDepartments,
  type ProfileFormInput,
} from "@/lib/validation";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

function SectionTitle({ children }: { children: string }) {
  return <h2 className="type-heading">{children}</h2>;
}

export interface FormFieldError {
  field: keyof ProfileFormInput;
  message: string;
}

export function ProfileForm({
  data,
  draft,
  initialError,
  onContinue,
}: {
  data: ProfileBootstrap;
  /** What the member typed before, when they come back from a later step. */
  draft?: ProfileFormInput;
  /** A server-side field error to show on arrival (e.g. Dove wants a department). */
  initialError?: FormFieldError;
  /** Called with the validated form; saving happens after the PIN step. */
  onContinue: (values: ProfileFormInput) => void;
}) {
  const { person, availableDepartments } = data;
  const namesConfirmed = person.namesConfirmed !== false;
  const departmentsAvailable = availableDepartments.length > 0;

  const schema = useMemo(() => profileSchemaFor({ departmentsAvailable }), [departmentsAvailable]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: draft ?? {
      firstName: namesConfirmed ? person.firstName : "",
      lastName: namesConfirmed ? person.lastName : "",
      gender: person.gender ?? "",
      dateOfBirth: person.dateOfBirth ?? "",
      email: person.email ?? "",
      phone: toInputValue(person.phone),
      address: person.address ?? "",
      membershipStatus: person.membershipStatus,
      departmentIds: person.departments.map((d) => d.id),
    },
  });

  const status = useWatch({ control, name: "membershipStatus" });
  const departmentsRequired = DEPARTMENTS_REQUIRED.includes(status);
  const departmentsOpen = departmentsAvailable && showsDepartments(status);

  useEffect(() => {
    if (initialError) {
      setError(initialError.field, { message: initialError.message }, { shouldFocus: true });
    }
  }, [initialError, setError]);

  const onSubmit = handleSubmit((values) => onContinue(values));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <ChurchHeader />

      <div className="mt-6">
        <h1 className="type-title">
          {namesConfirmed ? `Hi ${person.firstName}` : "Welcome!"}{" "}
          <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-fg-muted">
          {namesConfirmed
            ? "Please check your details are correct."
            : "Tell us a little about yourself."}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-1 flex-col">
        <div className="space-y-10">
          <section className="space-y-4" aria-labelledby="personal">
            <div id="personal">
              <SectionTitle>Personal</SectionTitle>
            </div>
            <TextField
              label="First name"
              required
              autoComplete="given-name"
              autoFocus={!namesConfirmed && !draft}
              error={errors.firstName?.message}
              {...register("firstName")}
            />
            <TextField
              label="Last name"
              required
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register("lastName")}
            />
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <PillRadioGroup
                  ref={field.ref}
                  legend="Gender"
                  name={field.name}
                  options={GENDER_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.gender?.message}
                />
              )}
            />
            <TextField
              label="Date of birth"
              type="date"
              autoComplete="bday"
              max={today}
              min="1900-01-01"
              error={errors.dateOfBirth?.message}
              {...register("dateOfBirth")}
            />
          </section>

          <section className="space-y-4" aria-labelledby="contact">
            <div id="contact">
              <SectionTitle>Contact</SectionTitle>
            </div>
            <TextField
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
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
              hint="We'll use this to wish you happy birthday and keep in touch."
              error={errors.phone?.message}
              {...register("phone")}
            />
            <TextArea
              label="Home address"
              autoComplete="street-address"
              rows={3}
              error={errors.address?.message}
              {...register("address")}
            />
          </section>

          <section className="space-y-6">
            <Controller
              control={control}
              name="membershipStatus"
              render={({ field }) => (
                <SelectableCardGroup
                  ref={field.ref}
                  legend="Your role at church"
                  description="Choose the one that fits you best."
                  name={field.name}
                  options={MEMBERSHIP_OPTIONS}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (isSubmitted) void trigger("departmentIds");
                  }}
                  error={errors.membershipStatus?.message}
                />
              )}
            />

            <Collapse open={departmentsOpen}>
              <Controller
                control={control}
                name="departmentIds"
                render={({ field }) => (
                  <CheckCardGroup
                    ref={field.ref}
                    legend={
                      departmentsRequired
                        ? "Which department(s) do you serve in?"
                        : "Your departments"
                    }
                    required={departmentsRequired}
                    description={
                      departmentsRequired
                        ? "Select all that apply."
                        : "Select any departments you lead or serve in (optional)."
                    }
                    name={field.name}
                    options={availableDepartments.map((d) => ({
                      value: d.id,
                      label: d.name,
                      description: d.description,
                    }))}
                    values={field.value}
                    onChange={field.onChange}
                    error={departmentsOpen ? errors.departmentIds?.message : undefined}
                  />
                )}
              />
            </Collapse>
          </section>
        </div>

        <StickyActionBar>
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </StickyActionBar>
      </form>
    </>
  );
}
