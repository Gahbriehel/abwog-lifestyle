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
      if (!person.hasPin) return fail(400, "No PIN has been set for this account", "NO_PIN_SET");
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
      return ok({ person: { ...people[session.key], hasPin: session.hasPin }, church });
    }

    if (req.method === "PUT" && url.pathname === "/api/v1/profile/me/pin") {
      const session = sessionFrom(req);
      if (session instanceof Response) return session;
      const { currentPin, newPin } = (await req.json()) as { currentPin?: string; newPin?: string };
      if (!newPin || !/^\d{4}$/.test(newPin)) return fail(400, "PIN must be 4 digits");
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
console.log(`Try: ${APP}/profile/member-sarah · /profile/new-visitor · /profile/expired-link · /profile/used`);
