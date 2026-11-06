import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RegisterFlow } from "@/components/events/RegisterFlow";
import { getEvent } from "@/lib/dove";
import { DoveError } from "@/lib/dove-errors";
import { registrationState } from "@/lib/events";
import { loadSession } from "@/lib/member";
import { toInputValue } from "@/lib/phone";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event;
  try {
    event = await getEvent(id);
  } catch (error) {
    if (error instanceof DoveError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
  // Closed, full or walk-in events have nothing to register for; the detail page explains why.
  if (registrationState(event) !== "open") redirect(`/events/${id}`);

  // Members get their details filled in.
  const person = (await loadSession())?.person;
  return (
    <RegisterFlow
      event={{ id: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, location: event.location }}
      defaults={{
        firstName: person?.firstName ?? "",
        lastName: person?.lastName ?? "",
        email: person?.email ?? "",
        phone: person?.phone ? toInputValue(person.phone) : "",
      }}
    />
  );
}
