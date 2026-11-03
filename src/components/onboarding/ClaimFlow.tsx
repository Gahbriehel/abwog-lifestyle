"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { requestLink } from "@/app/profile/actions";
import { Button } from "@/components/ui/Button";
import { ChurchHeader, IconCircle } from "@/components/ui/Brand";
import { TextField } from "@/components/ui/Field";
import { maskEmail } from "@/lib/mask";
import { claimSchema, type ClaimValues } from "@/lib/validation";

const RESEND_SECONDS = 60;

export function ClaimFlow() {
  const [sent, setSent] = useState<{ email: string; at: number } | null>(null);
  const [lastEmail, setLastEmail] = useState("");

  if (sent) {
    return (
      <CheckEmail
        email={sent.email}
        sentAt={sent.at}
        onResent={(at) => setSent({ email: sent.email, at })}
        onChangeEmail={() => {
          setLastEmail(sent.email);
          setSent(null);
        }}
      />
    );
  }

  return (
    <ClaimForm
      defaultEmail={lastEmail}
      onSent={(email) => {
        setSent({ email, at: Date.now() });
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

function ClaimForm({ defaultEmail, onSent }: { defaultEmail: string; onSent: (email: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ClaimValues>({
    resolver: zodResolver(claimSchema),
    mode: "onTouched",
    defaultValues: { email: defaultEmail },
  });

  const onSubmit = handleSubmit(({ email }) => {
    setFormError(null);
    startTransition(async () => {
      const result = await requestLink(email);
      if (result.ok) return onSent(email);
      if (result.field) setError(result.field, { message: result.message }, { shouldFocus: true });
      else setFormError(result.message);
    });
  });

  return (
    <>
      <ChurchHeader variant="full" />
      <h1 className="mt-8 text-balance text-center font-serif text-[28px] font-semibold leading-tight">
        Welcome! Let&apos;s update your details
      </h1>
      <p className="mt-2 text-balance text-center text-fg-muted">
        We&apos;ll send you a secure link. No password needed.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <TextField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" fullWidth loading={pending} loadingLabel="Sending your link…">
          Send my link
        </Button>
      </form>

      <p className="mt-5 flex items-start justify-center gap-2 text-center text-sm text-fg-muted">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>We only use your details to keep in touch with you. We never share them.</span>
      </p>
    </>
  );
}

function useCountdown(from: number, seconds: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [from]);
  return Math.max(0, seconds - Math.floor((now - from) / 1000));
}

function CheckEmail({
  email,
  sentAt,
  onResent,
  onChangeEmail,
}: {
  email: string;
  sentAt: number;
  onResent: (at: number) => void;
  onChangeEmail: () => void;
}) {
  const remaining = useCountdown(sentAt, RESEND_SECONDS);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const resend = () =>
    startTransition(async () => {
      setNotice(null);
      const result = await requestLink(email);
      if (result.ok) {
        onResent(Date.now());
        // Dove silently skips the email if this address hit its hourly limit.
        setNotice({ tone: "ok", text: "If we have your details, we've sent a new link." });
      } else {
        setNotice({ tone: "error", text: result.message });
      }
    });

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <>
      <ChurchHeader />
      <div className="mt-10 flex flex-col items-center text-center">
        <IconCircle>
          <Mail />
        </IconCircle>
        <h1 className="mt-6 font-serif text-[26px] font-semibold leading-tight">Check your email</h1>
        <p className="mt-3 text-balance text-fg-muted">
          If we have your details, we&apos;ve sent a secure link to{" "}
          <strong className="text-fg">{maskEmail(email)}</strong>. It expires in 30 minutes.
        </p>
        <p className="mt-3 text-sm text-fg-muted">
          Can&apos;t find it? Check your spam or promotions folder.
        </p>
      </div>

      <div className="mt-8">
        <Button
          variant="secondary"
          fullWidth
          onClick={resend}
          disabled={remaining > 0}
          loading={pending}
          loadingLabel="Sending…"
        >
          {remaining > 0 ? (
            <>
              Resend in{" "}
              <span className="tabular-nums">
                {mm}:{ss}
              </span>
            </>
          ) : (
            "Resend link"
          )}
        </Button>
        <p aria-live="polite" className="mt-2 min-h-5 text-center text-sm">
          {notice && (
            <span className={notice.tone === "ok" ? "text-fg-muted" : "text-danger"}>{notice.text}</span>
          )}
        </p>
        <Button variant="text" fullWidth onClick={onChangeEmail}>
          Use a different email
        </Button>
      </div>
    </>
  );
}
