# Dove guide: Family links and unique contact details

**For:** the Dove (NestJS) backend, plus notes for Olive (admin) and the member PWA so all three agree.

**What this adds:** a member can create a record for a relative (a spouse, a child, a parent) from their own account. The relative is a **separate person** in Dove, linked to the member by the relationship the member picked. Leadership can then see who is related to whom.

**Why it needs more than a relationship table:** Dove does not enforce unique emails or phone numbers on `Person` today (§1). Without that, a relative added with the member's own number would be treated as the same person by claim, login and registration. So the first half of this guide makes email and phone unique, and the second half builds the family links on top.

**Decisions already made**

| Topic | Decision |
|---|---|
| Identity | Every person is a separate record. Email and phone are each **unique per church** when present. Nobody shares them. |
| Taken contact details | Adding a person whose email or phone already exists is **refused**. It never creates a duplicate and never silently links to the existing person. |
| Error text | **Generic.** It does not say which field matched or who owns it (§2). |
| Contact required | Every person needs **an email or a phone**: adding a relative, admin create in Olive and self registration. Admin update may not remove the last one. |
| Ownership | A record someone else created is **not editable by its creator**. Only the person themselves can edit it, after they claim it. Staff keep their existing rights in Olive. |
| Dependents | **There is no "dependent" concept.** Creating a record for someone does not make them dependent on you. |
| Deleting | Deleting a person removes **only their own links**. Their relatives are untouched. |
| Phone-only people | They get in by a **claim link sent over WhatsApp**, either by the relative who created them (A) or by staff (B). There is no SMS. |
| Linking two existing members | **Later.** Not in this request, except staff linking in Olive (§4.5). |

---

## 1. What is wrong today

`Person.email` and `Person.phone` only have indexes. Nothing stops two people from sharing them, and `PeopleService.create` and `update` never check. Claim, login and registration use `findFirst`, so with duplicates they return whichever row comes first.

Production was checked on 2026-11-12 with `scripts/report-duplicate-contacts.ts`: 59 people, **no duplicate emails or phones**, so the unique indexes can be added as they are.

## 2. Unique email and phone

### 2.1 Data steps, in this order (before the migration)

1. `bun scripts/normalize-phones.ts` (dry run), then `--apply`. The dry run on production showed 30 people and 2 users to convert, no invalid numbers and no duplicates.
2. Lower-case and trim stored emails once: `UPDATE people SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;`
3. Run `bun scripts/report-duplicate-contacts.ts` again. It must report no conflicts.

### 2.2 Schema

```prisma
model Person {
  // ...unchanged fields...

  @@unique([churchId, email])
  @@unique([churchId, phone])
  // remove @@index([email]) and @@index([phone]); the unique indexes replace them
}
```

Both columns are nullable, so any number of people may have no email or no phone. Check that the database collation compares email case-insensitively, but do not rely on it: also lower-case in code (§2.3).

### 2.3 Rules in code

- **Emails are trimmed and lower-cased on every write:** `PeopleService.create` and `update`, registration find-or-create, `ProfileService.claim` and `updateByToken`, and the new add-relative endpoint (§4).
- **Phones go through `normalizePhoneOrThrow`** on every write, as already planned.
- **Blank strings become `null`**, for both fields.
- **A taken value returns:**

```json
HTTP 409
{ "success": false, "message": "This email or phone number is already registered.", "code": "CONTACT_ALREADY_REGISTERED" }
```

  One code for both fields, so the response never reveals which one matched or who owns it. Also map a Prisma `P2002` on these two indexes to the same response, so two simultaneous requests cannot slip past the check.

- **Where it applies:** admin create and update, add relative (§4), and `PATCH /profile/:token` when someone changes their own email or phone to one that is taken.
- **Where it does not change:**
  - **Event registration** keeps reusing an existing person it matches by email or phone. That is a lookup, not a new record. The existing 409 for "email and phone belong to different people" stays.
  - **`POST /profile/claim` still answers the generic 200.** If an unknown email arrives with a phone that already belongs to someone else, create the visitor **without the phone** instead of failing. The response stays the same, so nothing leaks.

## 3. Data model: relationships

```prisma
enum RelationshipType {
  SPOUSE
  PARENT
  CHILD
  SIBLING
  OTHER
}

model PersonRelationship {
  id                String           @id @default(uuid())
  churchId          String           @map("church_id")
  personId          String           @map("person_id")          // the person the link is described from
  relatedPersonId   String           @map("related_person_id")  // who they are linked to
  type              RelationshipType                            // what relatedPerson IS to person
  note              String?          @db.VarChar(100)           // free text, for OTHER ("cousin", "guardian")
  createdByPersonId String?          @map("created_by_person_id")
  createdByUserId   String?          @map("created_by_user_id") // set when staff create it in Olive
  createdAt         DateTime         @default(now()) @map("created_at")

  church        Church  @relation(fields: [churchId], references: [id], onDelete: Cascade)
  person        Person  @relation("RelationshipFrom", fields: [personId], references: [id], onDelete: Cascade)
  relatedPerson Person  @relation("RelationshipTo", fields: [relatedPersonId], references: [id], onDelete: Cascade)
  createdBy     Person? @relation("RelationshipCreatedBy", fields: [createdByPersonId], references: [id], onDelete: SetNull)

  @@unique([personId, relatedPersonId])
  @@index([relatedPersonId])
  @@index([churchId])
  @@map("person_relationships")
}
```

Add the three back-relations on `Person` and `relationships PersonRelationship[]` on `Church`.

Notes:

- **Each link is stored once.** "Tunde is Ada's SPOUSE" is one row. Dove returns the inverse when reading from the other side: `PARENT` shows as `CHILD`, `CHILD` as `PARENT`, `SPOUSE` and `SIBLING` stay the same, `OTHER` keeps its note.
- **`onDelete: Cascade` on the two person columns removes only the link row.** Deleting a person never deletes the other person. This is the rule from "creating a profile for my family doesn't make them dependent on me".
- **Reject** a link to yourself, and a second link between the same two people in either direction (look up both `(a, b)` and `(b, a)` before creating).
- **No `householdId` yet.** Households can be derived from these links later if leadership asks for them.

## 4. Endpoints

Base: `/api/v1`. Responses use Dove's usual envelope `{ success, message, data, timestamp }`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `POST` | `/profile/me/relatives` | Signed-in member | Create a new person and link them |
| `GET` | `/profile/me/relatives` | Signed-in member | List my linked people |
| `DELETE` | `/profile/me/relatives/:relationshipId` | Signed-in member | Remove a link (either side may) |
| `POST` | `/profile/me/relatives/:personId/claim-link` | Signed-in member | Get a WhatsApp link to send them (§5) |
| `GET` | `/people/:id/relatives` | Staff | See a person's family |
| `POST` | `/people/:id/relatives` | `ADMIN`, `SUPER_ADMIN` | Link two **existing** people |
| `DELETE` | `/people/:id/relatives/:relationshipId` | `ADMIN`, `SUPER_ADMIN` | Remove a link |

Member endpoints use `MemberAuthGuard` and the current member's id. Staff endpoints use the usual staff guards, and member tokens must be rejected on them.

### 4.1 `POST /profile/me/relatives`

```json
{
  "firstName": "Tunde",
  "lastName": "Adeyemi",
  "relationship": "SPOUSE",
  "relationshipNote": null,
  "email": "tunde@example.com",
  "phone": "08034567890",
  "gender": "MALE",
  "dateOfBirth": "1990-04-02"
}
```

- `firstName`, `lastName`, `relationship` are required. `email`, `phone`, `gender`, `dateOfBirth`, `relationshipNote` are optional, **but at least one of `email` or `phone` must be present.** If neither is, return 400 with code `CONTACT_REQUIRED`.
- `relationship` means what the **new person is to the member** ("Tunde is my SPOUSE").
- Email and phone follow §2. A taken value returns the generic `CONTACT_ALREADY_REGISTERED` and nothing is created.
- Create the `Person` with `membershipStatus: VISITOR` and `namesConfirmed: true`. No profile token or PIN is issued. Create the relationship row with `createdByPersonId` set to the member. Do both in one transaction.
- Rate limit this per member (for example 10 per day) so the endpoint cannot be used to flood the people list.
- Response: `201` with the relative as in §4.2.

### 4.2 `GET /profile/me/relatives`

Returns links in both directions, so someone added by a relative also sees that relative.

```json
{
  "items": [
    {
      "relationshipId": "…",
      "person": { "id": "…", "firstName": "Tunde", "lastName": "Adeyemi" },
      "relationship": "SPOUSE",
      "relationshipNote": null,
      "addedByMe": true,
      "claimed": false,
      "maskedEmail": "t***@example.com",
      "maskedPhone": "•••• ••• 7890",
      "canSendClaimLink": true
    }
  ]
}
```

- **Only these fields are returned.** No date of birth, address, status or full contact details.
- `claimed` is true when the person has a PIN (`pinHash` set).
- `canSendClaimLink` is true when `addedByMe` is true, the person is not claimed and has a phone.
- Reuse the masking already used for the PWA's `mask` helper, or add one in Dove.

### 4.3 Editing is not allowed

There is **no** endpoint for a member to edit a relative's details. The creator typed the details once, and from then on only the person can change them, after claiming (the existing `PATCH /profile/:token` and signed-in flow). Staff edit through the existing people endpoints.

### 4.4 Deleting a link

`DELETE /profile/me/relatives/:relationshipId` is allowed for either person in the link. It removes only the link row. It never deletes a person.

### 4.5 Staff linking (Olive)

`POST /people/:id/relatives` takes `{ relatedPersonId, relationship, relationshipNote? }`. It sets `createdByUserId`. This lets leadership record that two existing members are related, without waiting for the "link existing member" feature. It does not create anyone.

## 5. Getting phone-only people in (no SMS)

Today a profile link is only issued by `POST /profile/claim`, which needs an email. A phone-only claim gets a silent 200 and nothing is sent, and a person cannot set a PIN until they have claimed. So a person with only a phone has no way in. Two routes fix that. Both use the existing single-use profile token, but with a longer lifetime.

- **Link lifetime:** 48 hours for these links, instead of the 30 minutes used for emailed ones. A WhatsApp message may be opened much later. Put it in a named constant next to `PROFILE_LINK_TTL_MS`.
- **Issuing a new token replaces the old one.** That is already how the single token field works.
- **The token is the secret.** Whoever opens the link can claim that profile, as with the emailed link.

### 5.1 A: the relative sends it

`POST /profile/me/relatives/:personId/claim-link` (member auth).

- Allowed only if the member **created** this person (`createdByPersonId` on the link equals the member), the person is not claimed, and has a valid phone. Otherwise 403 or 409 with a clear `code`.
- Issues a token and returns:

```json
{
  "url": "https://app.abwog.org/profile/<token>",
  "whatsappUrl": "https://wa.me/2348034567890?text=<encoded message>",
  "expiresAt": "2026-11-14T10:00:00.000Z"
}
```

- The message names the sender: "Hi Tunde, it's Ada. I've added you to ABWOG so we're all connected. Open this link to set up your profile: <url>". Keep the text in one place so staff can change it later.
- Build the number with the existing `toWhatsAppDigits`.
- Rate limit: 3 per target person per day.
- The PWA opens `whatsappUrl` on the member's own phone. Nothing is sent by Dove.

### 5.2 B: staff send it from Olive

Extend the existing click-to-chat outreach.

- Add `PROFILE_LINK` to `OutreachPurpose` (Prisma migration plus the DTO validation).
- Add a `MessageTemplate` for it with a `{{profileLink}}` variable and seed one default, in the same style as the other templates.
- `POST /outreach/whatsapp/preview` shows the message with a placeholder where the link will go. **It must not issue a token.**
- `POST /outreach/whatsapp` for this purpose issues the 48-hour token, builds the link into the message and returns `whatsappUrl` as the other purposes do.
- **Store the message with the link replaced by `[profile link]`**, never the real URL. `OutreachMessage.body` is visible in the person's timeline, and a stored live token would let any admin take over the profile.
- The existing blocks apply: `NO_PHONE`, `INVALID_PHONE`, `WHATSAPP_OPT_OUT`, `NO_TEMPLATE`. Also return 409 with `ALREADY_CLAIMED` if the person has a PIN.
- This is also the **recovery route** for a phone-only person who lost their PIN: staff send a new link. Say so in the Olive guide.

## 6. Permissions

| Action | Who |
|---|---|
| Create, list and unlink own relatives | Any signed-in member |
| Send a claim link to someone I created | The member who created them |
| Edit a relative's details | Only that person, after they claim; staff in Olive as today |
| See any person's family | Staff |
| Link or unlink two existing people | `ADMIN`, `SUPER_ADMIN` |
| Send a `PROFILE_LINK` over WhatsApp | The same staff who can send other outreach |

Member tokens must be rejected by every staff endpoint here.

## 7. Tests

- Unique indexes: creating a second person with an existing email (any letter case) or phone (any format) returns `CONTACT_ALREADY_REGISTERED`. A person with no email and no phone is still allowed. Two simultaneous creates produce one success and one 409.
- Admin update that changes a phone to a taken one returns the same 409.
- Admin create with neither email nor phone returns 400 `CONTACT_REQUIRED`. An admin update that would leave a person with neither returns the same 400. An update to a person who already has neither, and does not touch contact fields, still succeeds.
- Claim with an unknown email and a taken phone creates a visitor without the phone and returns the generic 200.
- Registration still reuses a matching existing person, and still returns 409 for an email and phone that belong to different people.
- Add relative: creates a person and a link in one transaction. Rolls back both if the email is taken. Rejects a request with neither email nor phone. Rejects a link to yourself.
- Reading from both sides returns the right inverse type. `PARENT` from one side is `CHILD` from the other.
- Deleting a person removes their link rows and leaves the other person untouched.
- Unlinking removes only the link, and either person can do it.
- Claim link: only for a creator, an unclaimed person with a phone. Refused for a claimed person, for someone who did not create them, and for no phone. Rate limit applies.
- `PROFILE_LINK` outreach: preview issues no token. Create issues one, and the stored body contains no token. Blocked for opt-out, no phone, and already claimed.
- Member tokens are rejected on every staff endpoint.

## 8. Order of work

| # | Step |
|---|---|
| 1 | Data steps in §2.1 on production, then re-run the report |
| 2 | Unique index migration, email lower-casing and trimming, `CONTACT_ALREADY_REGISTERED` and the `P2002` mapping, and the claim adjustment in §2.3 |
| 3 | `PersonRelationship` migration and the member and staff endpoints in §4 |
| 4 | Claim link for relatives (§5.1) |
| 5 | `PROFILE_LINK` outreach (§5.2) |
| 6 | Update `API_CONTRACT.md`, `ERD.md`, `FRONTEND_PWA_GUIDE.md`, `FRONTEND_ADMIN_GUIDE.md`, and add an ADR to `DECISIONS.md` |

Steps 1 and 2 are a prerequisite for the rest and can ship alone.

## 9. Notes for the other apps

**Member PWA (this repo)**

- Add an "Add family member" form under the account page, and a list of linked relatives with "Send their link on WhatsApp" for unclaimed ones.
- Show the generic error as given. Do not try to guess which field matched.
- The login page gets a "Message us on WhatsApp" button with prefilled text asking for a profile link. It needs no backend work and gives phone-only people a first step.
- Phone-only people sign in with their phone and PIN once they have claimed.

**Olive (admin)**

- A "Family" section on a person's page: list, link an existing person, unlink.
- A "Send profile link" action on people who have a phone and no PIN. This is the recovery route.

## 10. Decisions confirmed after review

1. **Staff creating people.** Olive follows the same rule: admin create must include an email or a phone, because every person needs a way to reach their own profile later. `PeopleService.create` returns 400 `CONTACT_REQUIRED` when both are empty. Update may not clear both: if an update would leave the person with neither, return the same 400. Existing people who already have neither are left alone until someone edits them.
2. **Staff editing.** Staff in Olive can edit any person.
3. **Names.** A relative is created with `namesConfirmed: true`.
4. **Children with no email and no phone.** They cannot be added without one. A parent can give the child a **secondary email or phone** of their own, which is still unique to that child. There is no "contact via relative" fallback.
