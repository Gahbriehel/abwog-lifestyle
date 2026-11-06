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
//
// Member PIN login (POST /profile/login). Valid PIN for existing members: 4729.
//   sarah.adeyemi@example.com / 08034567890   Sarah, has a PIN
//   john.okafor@example.com                   no PIN set → NO_PIN_SET
//   locked@example.com                        PIN_LOCKED (15 minutes)
//   slow@example.com                          429 rate limit
//   anything else                             INVALID_CREDENTIALS
// A wrong PIN always answers "4 attempts remaining" (the stub keeps no lockout state).
// Sessions are in memory: GET /profile/me, PUT /profile/me/pin, POST /profile/logout.
//
// Public content (dates are relative to when the stub starts, so they are always upcoming):
//   GET  /events (?category, ?search, ?page, ?limit)   published events, past ones included like Dove
//   GET  /events/:id
//   POST /events/:id/register   dupe@example.com → 409 with the existing registration
//                               first name "Fail" → 500; events event-full / event-ended / event-sunday → 400
//   GET  /giving-accounts       active accounts, sorted; ?purpose=TITHE filters (see docs/dove-giving-accounts.md)

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
    hasPin: true,
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
    hasPin: false,
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
    hasPin: false,
  },
};

const DAY = 86_400_000;
const at = (days: number, hour: number, durationHours = 2) => {
  const start = new Date(Date.now() + days * DAY);
  start.setUTCHours(hour, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: new Date(start.getTime() + durationHours * 3_600_000).toISOString() };
};

const baseEvent = {
  imageUrl: null,
  capacity: null,
  requiresRegistration: true,
  isFeatured: false,
  highlights: null,
  registeredCount: 12,
};

const events = [
  {
    ...baseEvent,
    id: "event-youth",
    title: "Youth Conference 2026",
    description: "Three days of worship, teaching and games for young people.\n\nBring a friend!",
    category: "CONFERENCE",
    location: "Main Auditorium, 14 Faith Avenue, Ikeja",
    ...at(14, 17, 48),
    isFeatured: true,
    capacity: 500,
    highlights: ["Live worship", "Team games and leaderboard", "Career clinic"],
  },
  {
    ...baseEvent,
    id: "event-vigil",
    title: "Night of Encounter",
    description: "An all-night prayer vigil.",
    category: "VIGIL",
    location: "Main Auditorium",
    ...at(5, 21, 8),
  },
  {
    ...baseEvent,
    id: "event-sunday",
    title: "Sunday Celebration Service",
    description: "Join us every Sunday. No registration needed.",
    category: "WORSHIP",
    location: "Main Auditorium",
    ...at(3, 8, 3),
    requiresRegistration: false,
  },
  {
    ...baseEvent,
    id: "event-full",
    title: "Leaders' Retreat",
    description: "A retreat for church leaders. All places are taken.",
    category: "GENERAL",
    location: "Retreat Centre, Ibadan",
    ...at(30, 9, 30),
    capacity: 40,
    registeredCount: 40,
  },
  {
    ...baseEvent,
    id: "event-ended",
    title: "Easter Outreach",
    description: "Thank you to everyone who joined.",
    category: "OUTREACH",
    location: "Community Hall",
    ...at(-20, 10, 4),
  },
];

const PURPOSES: string[] = ["TITHE", "OFFERING", "BUILDING", "MISSIONS", "SEED", "SPECIAL"];

const givingAccounts = [
  {
    id: "give-tithe",
    label: "Tithes & Offerings",
    bankName: "GTBank",
    accountName: "Abiding Word Of Grace Missions",
    accountNumber: "0123456789",
    currency: "NGN",
    note: "Use your name and the purpose as the transfer narration.",
    purposes: ["TITHE", "OFFERING", "SEED"],
    sortOrder: 0,
  },
  {
    id: "give-building",
    label: "Building Project",
    bankName: "Zenith Bank",
    accountName: "Abiding Word Of Grace Missions (Building)",
    accountNumber: "1012345678",
    currency: "NGN",
    note: null,
    purposes: ["BUILDING", "OFFERING"],
    sortOrder: 1,
  },
  {
    id: "give-usd",
    label: "Missions (USD)",
    bankName: "Zenith Bank",
    accountName: "Abiding Word Of Grace Missions",
    accountNumber: "5012345678",
    currency: "USD",
    note: "For gifts from outside Nigeria.",
    purposes: ["TITHE", "OFFERING", "BUILDING", "MISSIONS", "SEED"],
    sortOrder: 2,
  },
];

const registrationFor = (n: number) => ({
  id: `reg-${n}`,
  registrationNumber: `REG-2026-${String(n).padStart(4, "0")}`,
  token: `stub-token-${n}`,
  // 1x1 transparent-ish PNG stands in for the QR code.
  qrCodeDataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  team: { id: "team-1", name: "Team Grace", color: "#5B2C5E" },
});
let registrationCount = 100;

const VALID_PIN = "4729";

/** Stub login lookup: matches email or the last 10 digits of a phone. */
function findByIdentifier(identifier: string): string | undefined {
  const needle = identifier.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "").slice(-10);
  return Object.entries(people).find(([, p]) => {
    const email = String(p.email ?? "").toLowerCase();
    const phone = String(p.phone ?? "").replace(/\D/g, "").slice(-10);
    return needle === email || (digits.length === 10 && digits === phone);
  })?.[0];
}

// Session token → who it belongs to and whether they have a PIN (changed by PUT /profile/me/pin).
const sessions = new Map<string, { key: string; hasPin: boolean }>();

function startSession(key: string, hasPin: boolean): string {
  const token = `stub-session-${key}-${crypto.randomUUID()}`;
  sessions.set(token, { key, hasPin });
  return token;
}

function sessionFrom(req: Request): { token: string; key: string; hasPin: boolean } | Response {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const session = sessions.get(token);
  return session ? { token, ...session } : fail(401, "Unauthorized");
}

const ok = (data: unknown, message = "OK") =>
  Response.json({ success: true, message, data, timestamp: new Date().toISOString() });

function fail(statusCode: number, message: string, code?: string): Response {
  return Response.json({ success: false, statusCode, message, ...(code ? { code } : {}) }, { status: statusCode });
}
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

    if (req.method === "POST" && url.pathname === "/api/v1/profile/login") {
      const { identifier, pin } = (await req.json()) as { identifier?: string; pin?: string };
      if (!identifier || !pin) return fail(400, "Identifier and PIN are required");
      const lowered = identifier.trim().toLowerCase();
      if (lowered === "slow@example.com") return fail(429, "Too many requests");
      if (lowered === "locked@example.com") {
        return Response.json(
          {
            success: false,
            statusCode: 403,
            message: "Account locked. Try again in 15 minutes.",
            code: "PIN_LOCKED",
            lockedUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
          },
          { status: 403 },
        );
      }
      const key = findByIdentifier(identifier);
      if (!key) return fail(401, "Invalid credentials", "INVALID_CREDENTIALS");
      const person = people[key];
      if (!person.hasPin) return fail(401, "No PIN set. Please claim your profile link via email to set your PIN.", "NO_PIN_SET");
      if (pin !== VALID_PIN) {
        return Response.json(
          {
            success: false,
            statusCode: 401,
            message: "Incorrect PIN. 4 attempts remaining.",
            code: "INVALID_PIN",
            attemptsRemaining: 4,
          },
          { status: 401 },
        );
      }
      return ok(
        { accessToken: startSession(key, true), person, church },
        "Member login successful",
      );
    }

    if (req.method === "GET" && url.pathname === "/api/v1/profile/me") {
      const session = sessionFrom(req);
      if (session instanceof Response) return session;
      // Like Dove: every successful call returns a freshly signed token (sliding session).
      const accessToken = startSession(session.key, session.hasPin);
      return ok({ person: { ...people[session.key], hasPin: session.hasPin }, church, accessToken });
    }

    if (req.method === "PUT" && url.pathname === "/api/v1/profile/me/pin") {
      const session = sessionFrom(req);
      if (session instanceof Response) return session;
      const { currentPin, newPin } = (await req.json()) as { currentPin?: string; newPin?: string };
      if (!newPin || !/^\d{4}$/.test(newPin)) return fail(400, "PIN must be 4 digits");
      if (session.hasPin && !currentPin) {
        return fail(400, "Current PIN is required to change your PIN", "CURRENT_PIN_REQUIRED");
      }
      if (session.hasPin && currentPin !== VALID_PIN) {
        return Response.json(
          {
            success: false,
            statusCode: 401,
            message: "Incorrect PIN. 4 attempts remaining.",
            code: "INVALID_PIN",
            attemptsRemaining: 4,
          },
          { status: 401 },
        );
      }
      sessions.set(session.token, { key: session.key, hasPin: true });
      return ok({ message: "PIN updated" }, "PIN updated");
    }

    if (req.method === "POST" && url.pathname === "/api/v1/profile/logout") {
      const session = sessionFrom(req);
      if (session instanceof Response) return session;
      sessions.delete(session.token);
      return ok({ message: "Signed out" }, "Signed out");
    }

    if (req.method === "GET" && url.pathname === "/api/v1/events") {
      const category = url.searchParams.get("category");
      const search = url.searchParams.get("search")?.toLowerCase();
      const page = Number(url.searchParams.get("page") ?? 1);
      const limit = Number(url.searchParams.get("limit") ?? 10);
      const filtered = events
        .filter((e) => !category || e.category === category)
        .filter((e) => !search || `${e.title} ${e.description}`.toLowerCase().includes(search))
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      const items = filtered.slice((page - 1) * limit, page * limit);
      return ok(
        { items, meta: { total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) } },
        "List of events retrieved successfully",
      );
    }

    const eventMatch = url.pathname.match(/^\/api\/v1\/events\/([^/]+)(\/register)?$/);
    if (eventMatch) {
      const event = events.find((e) => e.id === decodeURIComponent(eventMatch[1]));
      if (!event) return fail(404, `Event with ID "${eventMatch[1]}" not found`);

      if (req.method === "GET" && !eventMatch[2]) return ok(event, "Event details retrieved successfully");

      if (req.method === "POST" && eventMatch[2]) {
        const body = (await req.json()) as { firstName?: string; email?: string; phone?: string };
        if (!body.email && !body.phone) return fail(400, "Either email or phone must be provided");
        if (body.firstName === "Fail") return fail(500, "Internal server error");
        if (!event.requiresRegistration) return fail(400, "Registration is not required for this event.");
        if (event.endDate < new Date().toISOString()) {
          return fail(400, "Registration is closed for this event because it has already ended.");
        }
        if (event.capacity != null && event.registeredCount >= event.capacity) {
          return fail(400, "Registration is closed because this event has reached capacity.");
        }
        if (body.email === "dupe@example.com") {
          // Nest's ConflictException(object) sends the object as the body.
          return Response.json(
            { statusCode: 409, message: "Attendee has already registered for this event", registration: registrationFor(7) },
            { status: 409 },
          );
        }
        return Response.json(
          {
            success: true,
            message: "Registration successful",
            data: { message: "Registration successful", registration: registrationFor(++registrationCount) },
            timestamp: new Date().toISOString(),
          },
          { status: 201 },
        );
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/giving-accounts") {
      const purpose = url.searchParams.get("purpose");
      if (purpose && !PURPOSES.includes(purpose)) return fail(400, "Invalid purpose", "VALIDATION_ERROR");
      const list = givingAccounts.filter((a) => !purpose || a.purposes.includes(purpose));
      return ok([...list].sort((a, b) => a.sortOrder - b.sortOrder), "Giving accounts retrieved successfully");
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
      const hasPin = Boolean(body.pin || person.hasPin);
      const fields = { ...body };
      delete fields.pin;
      const saved = {
        ...person,
        ...fields,
        namesConfirmed: true,
        hasPin,
        departments: departments.filter((d) => body.departmentIds?.includes(d.id)),
      };
      // Like Dove: a save that leaves the person with a PIN also signs them in.
      const accessToken = hasPin ? startSession(decodeURIComponent(match![1]), true) : undefined;
      return ok(
        { message: "Profile updated successfully", person: saved, ...(accessToken ? { accessToken } : {}) },
        "Profile updated successfully",
      );
    }

    return fail(404, "Not found");
  },
});

console.log(`Dove stub listening on http://localhost:${PORT}/api/v1`);
console.log(`Public: ${APP}/ · /events · /events/event-youth · /give`);
console.log(`Try: ${APP}/profile/member-sarah · /profile/new-visitor · /profile/expired-link · /profile/used`);
