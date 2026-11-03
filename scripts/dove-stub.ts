// Local stand-in for the Dove profile API, matching the shapes in
// dove/docs/FRONTEND_PWA_GUIDE.md plus the Part A additions (codes,
// namesConfirmed, church shortName/whatsappNumber).
//
// Usage: bun dev:stub   (then DOVE_API_URL=http://localhost:4010/api/v1)
//
// Tokens:
//   /profile/member-sarah   existing Worker with two departments
//   /profile/new-visitor    record created from an unknown email (namesConfirmed: false)
//   /profile/leader-no-dept Leader with no departments
//   /profile/expired-link   expired
//   anything else           invalid / already used
// Save with first name "Fail" to simulate a server error.

const PORT = Number(process.env.STUB_PORT ?? 4010);
const APP = process.env.APP_ORIGIN ?? "http://localhost:3100";
const DELAY_MS = 500;

const church = {
  id: "church-1",
  name: "Abiding Word Of Grace Missions",
  slug: "abwog",
  email: "info@abwog.org",
  phone: "+2348000000000",
  websiteUrl: "https://abwog.org",
  shortName: "Amazing Grace",
  whatsappNumber: "+2348012345678",
};

const departments = [
  { id: "dept-choir", name: "Choir", description: "Music & worship ministry" },
  { id: "dept-media", name: "Media & Tech", description: "Sound, livestream and visuals" },
  { id: "dept-ushers", name: "Ushers & Protocol", description: "Hospitality and sanctuary" },
  { id: "dept-children", name: "Children's Ministry", description: "Teaching and nurturing children" },
  { id: "dept-prayer", name: "Prayer Team", description: "Intercession for the church" },
  { id: "dept-evangelism", name: "Evangelism", description: "Outreach and soul winning" },
];

type Person = Record<string, unknown> & { departments: typeof departments };

const people: Record<string, Person> = {
  "member-sarah": {
    id: "p-sarah",
    firstName: "Sarah",
    lastName: "Adeyemi",
    email: "sarah.adeyemi@example.com",
    phone: "+2348034567890",
    gender: "FEMALE",
    dateOfBirth: "1990-12-04",
    address: "14 Olive Garden Street, Ikeja, Lagos",
    membershipStatus: "WORKER",
    departments: [departments[0], departments[1]],
    namesConfirmed: true,
  },
  "new-visitor": {
    id: "p-new",
    firstName: "New",
    lastName: "Visitor",
    email: "newcomer@example.com",
    phone: null,
    gender: null,
    dateOfBirth: null,
    address: null,
    membershipStatus: "VISITOR",
    departments: [],
    namesConfirmed: false,
  },
  "leader-no-dept": {
    id: "p-leader",
    firstName: "John",
    lastName: "Okafor",
    email: "john.okafor@example.com",
    phone: "08051234567",
    gender: "MALE",
    dateOfBirth: null,
    address: null,
    membershipStatus: "LEADER",
    departments: [],
    namesConfirmed: true,
  },
};

const ok = (data: unknown, message = "OK") =>
  Response.json({ success: true, message, data, timestamp: new Date().toISOString() });

const fail = (statusCode: number, message: string, code?: string) =>
  Response.json({ success: false, statusCode, message, ...(code ? { code } : {}) }, { status: statusCode });

function resolve(token: string): Person | Response {
  if (token === "expired-link") {
    return fail(400, "Magic link has expired. Please request a new one.", "PROFILE_LINK_EXPIRED");
  }
  const person = people[token];
  return person ?? fail(400, "Invalid or expired magic link", "PROFILE_LINK_INVALID");
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    await Bun.sleep(DELAY_MS);
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/api\/v1\/profile\/([^/]+)$/);

    if (req.method === "POST" && url.pathname === "/api/v1/profile/claim") {
      const { email } = (await req.json()) as { email?: string };
      const token = email?.includes("new") ? "new-visitor" : "member-sarah";
      console.log(`\n✉️  Link for ${email}: ${APP}/profile/${token}\n`);
      return ok(
        { message: "If an account or record matches this contact, a magic link has been sent." },
        "Profile claim requested",
      );
    }

    if (match && req.method === "GET") {
      const person = resolve(decodeURIComponent(match[1]));
      if (person instanceof Response) return person;
      return ok({ person, church, availableDepartments: departments });
    }

    if (match && req.method === "PATCH") {
      const person = resolve(decodeURIComponent(match[1]));
      if (person instanceof Response) return person;
      const body = (await req.json()) as Record<string, unknown> & { departmentIds?: string[] };
      console.log("PATCH payload:", body);
      if (body.firstName === "Fail") return fail(500, "Internal server error");
      if (body.membershipStatus === "WORKER" && !body.departmentIds?.length) {
        return fail(400, "Please select at least one department", "DEPARTMENT_REQUIRED");
      }
      const saved = {
        ...person,
        ...body,
        namesConfirmed: true,
        departments: departments.filter((d) => body.departmentIds?.includes(d.id)),
      };
      return ok({ message: "Profile updated successfully", person: saved }, "Profile updated successfully");
    }

    return fail(404, "Not found");
  },
});

console.log(`Dove stub listening on http://localhost:${PORT}/api/v1`);
console.log(`Try: ${APP}/profile/member-sarah · /profile/new-visitor · /profile/expired-link · /profile/used`);
