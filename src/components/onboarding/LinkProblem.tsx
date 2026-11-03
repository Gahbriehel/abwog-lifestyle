import { Clock, Link2Off } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { ChurchHeader, IconCircle } from "@/components/ui/Brand";
import type { LinkProblemCode } from "@/lib/types";

const COPY: Record<LinkProblemCode, { title: string; body: string }> = {
  PROFILE_LINK_EXPIRED: {
    title: "This link has expired",
    body: "Links are valid for 30 minutes and can only be used once.",
  },
  PROFILE_LINK_INVALID: {
    title: "This link isn't valid",
    body: "It may have already been used.",
  },
};

export function LinkProblem({ code }: { code: LinkProblemCode }) {
  const { title, body } = COPY[code];
  return (
    <>
      <ChurchHeader />
      <div className="mt-12 flex flex-col items-center text-center">
        <IconCircle>{code === "PROFILE_LINK_EXPIRED" ? <Clock /> : <Link2Off />}</IconCircle>
        <h1 className="mt-6 font-serif text-[26px] font-semibold leading-tight">{title}</h1>
        <p className="mt-2 text-balance text-fg-muted">{body}</p>
        <p className="mt-4 text-balance text-fg-muted">
          Don&apos;t worry, your details are safe. Getting a new link only takes a moment.
        </p>
      </div>
      <Link href="/profile" className={buttonClasses("primary", true, "mt-8")}>
        Request a new link
      </Link>
    </>
  );
}
