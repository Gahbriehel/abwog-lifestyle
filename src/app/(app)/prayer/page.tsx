import type { Metadata } from "next";
import { PrayerForm } from "@/components/prayer/PrayerForm";
import { loadSession } from "@/lib/member";
import { toInputValue } from "@/lib/phone";

export const metadata: Metadata = { title: "Prayer" };

export default async function PrayerPage() {
  // Members get their details filled in; guests type them.
  const person = (await loadSession())?.person;
  return (
    <PrayerForm
      defaults={{
        name: person ? `${person.firstName} ${person.lastName}`.trim() : "",
        email: person?.email ?? "",
        phone: person?.phone ? toInputValue(person.phone) : "",
      }}
    />
  );
}
