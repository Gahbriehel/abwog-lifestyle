# Dove guide: Scripture of the Week and Scripture of the Year

**For:** the Dove (NestJS) backend, plus notes for Olive (admin) so staff can manage it. The member PWA side is already built and waits for this.

**What it is:** two short scriptures shown at the top of the member PWA home page, under a **This week** / **This year** switch. Staff choose them in Olive. Today they can't, so the PWA has nothing to show.

**Decisions already made**

| Topic | Decision |
|---|---|
| Kinds | Two: `WEEK` and `YEAR`. Same shape, same screens. |
| History | Kept. Staff add a new record rather than overwriting, so there is a log of past scriptures. |
| What is "current" | The **latest published** record of that kind whose `startsOn` is today or earlier (church time, `Africa/Lagos`). Staff can schedule next week's scripture ahead of time. |
| Who writes | `ADMIN` and `SUPER_ADMIN` only. |
| Access | Reading the current ones is **public** (no sign-in). Everything else is admin only. |
| Nothing current | Not an error. The kind comes back as `null` and the PWA hides it (and hides the whole card if both are `null`). |
| Language | English only. |

---

## 1. Data model

```prisma
enum ScriptureKind {
  WEEK
  YEAR
}

enum ScriptureStatus {
  DRAFT
  PUBLISHED
}

model Scripture {
  id          String          @id @default(uuid())
  churchId    String          @map("church_id")
  kind        ScriptureKind
  text        String          @db.VarChar(1500)           // the verse(s), plain text
  reference   String          @db.VarChar(100)            // "Exodus 33:19"
  translation String?         @db.VarChar(20)             // "NKJV"
  givenBy     String?         @map("given_by") @db.VarChar(100) // "Rev. Deji Olabode"
  startsOn    DateTime        @map("starts_on") @db.Date  // first day it is current
  status      ScriptureStatus @default(DRAFT)
  createdById String?         @map("created_by_id")
  updatedById String?         @map("updated_by_id")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  church Church @relation(fields: [churchId], references: [id], onDelete: Cascade)

  @@index([churchId, kind, status, startsOn])
  @@map("scriptures")
}
```

Add `scriptures Scripture[]` to `Church`, then run a Prisma migration.

Notes:

- **`text` is plain text.** No HTML or Markdown. The PWA wraps it in quotation marks itself, so don't store them.
- **`startsOn` is a calendar date, not a timestamp**, interpreted in `Africa/Lagos`. Compute "today" in that timezone, not UTC, or the scripture changes over at 1 am.
- **`givenBy`** is the minister who gave the word. It is optional, and the PWA shows it under the reference when present.
- A kind may have **several records with the same `startsOn`**. Break the tie with `createdAt` descending (newest wins).

## 2. Which record is "current"

For each kind, in the caller's church (see §3.1 for how the church is picked):

```
status = PUBLISHED  AND  startsOn <= today(Africa/Lagos)
ORDER BY startsOn DESC, createdAt DESC
LIMIT 1
```

So a `YEAR` scripture saved on 1 January stays current until staff publish the next one, and a `WEEK` scripture stays current until the next one starts. There is no expiry date and nothing is ever "empty" between weeks.

## 3. Endpoints

Base: `/api/v1`. Responses use Dove's usual envelope `{ success, message, data, timestamp }`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/scriptures/current` | **Public** | The current `WEEK` and `YEAR` scripture |
| `GET` | `/scriptures` | `ADMIN`, `SUPER_ADMIN` | List all, for the Olive screens |
| `POST` | `/scriptures` | `ADMIN`, `SUPER_ADMIN` | Create |
| `PATCH` | `/scriptures/:id` | `ADMIN`, `SUPER_ADMIN` | Update, including `status` |
| `DELETE` | `/scriptures/:id` | `ADMIN`, `SUPER_ADMIN` | Delete |

Member tokens (`type: 'member'`) must be rejected by every write endpoint. Register `current` **before** the `:id` routes.

### 3.1 `GET /scriptures/current` (public)

- **Church:** `?churchId=` if given, else `getDefaultChurchId()` (same as `GET /events`).
- Returns exactly two keys. Either can be `null`.
- Send `Cache-Control: public, max-age=60`.

```json
{
  "success": true,
  "message": "Current scriptures retrieved successfully",
  "data": {
    "week": {
      "id": "6bde…",
      "kind": "WEEK",
      "text": "Then he said, I will make all my goodness pass before you, and I will proclaim the name of the Lord before you…",
      "reference": "Exodus 33:19",
      "translation": "NKJV",
      "givenBy": "Rev. Deji Olabode",
      "startsOn": "2026-11-02"
    },
    "year": {
      "id": "91ac…",
      "kind": "YEAR",
      "text": "Behold, I will do a new thing…",
      "reference": "Isaiah 43:19",
      "translation": "NKJV",
      "givenBy": null,
      "startsOn": "2026-01-01"
    }
  }
}
```

`startsOn` is sent as `YYYY-MM-DD`. Public responses never include `status`, `createdById` or other audit fields. The PWA relies on exactly the fields shown above.

### 3.2 `GET /scriptures` (admin)

- **Filters:** `kind` (`WEEK` or `YEAR`) and `status`.
- **Pagination:** `page` (default 1), `limit` (default 20, max 100).
- **Order:** `startsOn` descending, then `createdAt` descending.
- Same item shape as above plus `status`, `createdAt`, `updatedAt`.
- Each item also carries `isCurrent: boolean`, true for the record that `GET /scriptures/current` would return for its kind. Olive uses it to mark the live one.

### 3.3 `POST /scriptures` and `PATCH /scriptures/:id`

```json
{
  "kind": "WEEK",
  "text": "Then he said, I will make all my goodness pass before you…",
  "reference": "Exodus 33:19",
  "translation": "NKJV",
  "givenBy": "Rev. Deji Olabode",
  "startsOn": "2026-11-09",
  "status": "PUBLISHED"
}
```

- `POST` returns `201` with the full item. The church comes from the caller's token, never from the body. `startsOn` defaults to today (Lagos) if omitted.
- `PATCH` accepts any subset except `kind` (to change a kind, delete and recreate). `404` if the id belongs to another church. Set `updatedById` to the caller.
- Publishing requires non-empty `text` and `reference`; check the merged result on `PATCH`.

### 3.4 `DELETE /scriptures/:id`

Hard delete. Returns `200` with a message, or `404`. If the deleted record was current, the previous one becomes current again (that follows from §2, nothing special to do).

## 4. Validation

| Field | Rule |
|---|---|
| `kind` | required on create, `WEEK` or `YEAR` |
| `text` | required, trimmed, 1–1500 chars. Normalise line endings to `\n` and collapse runs of whitespace around line breaks. |
| `reference` | required, trimmed, 1–100 chars |
| `translation` | optional, trimmed, max 20 chars, empty string stored as `null` |
| `givenBy` | optional, trimmed, max 100 chars, empty string stored as `null` |
| `startsOn` | `YYYY-MM-DD`, a real date |
| `status` | `DRAFT` or `PUBLISHED`, default `DRAFT` |

Use `class-validator` DTOs like the rest of Dove, and reject unknown properties (`whitelist` + `forbidNonWhitelisted`).

## 5. Olive (admin screens)

One new page, **Scripture**, in the sidebar next to Confessions. `ADMIN` and `SUPER_ADMIN` only.

- **Two tabs, "This week" and "This year"**, matching the PWA. Each shows its **Live now** record at the top (the one with `isCurrent: true`), then **Scheduled** (starts in the future), then **Past**. Use `GET /scriptures?kind=…`.
- **Add / edit form:** text, reference, translation (default "NKJV", remembered between entries), given by, **starts on** (date picker, defaulting to today for a year and to the coming Monday for a week), and a Draft / Published switch.
- **Preview** beside the form: the same soft card the member sees, so staff can check line length before publishing.
- **Warn** when publishing a record whose `startsOn` is today or earlier, because it replaces the live one immediately. The message should say which one it replaces.
- **Delete** with a confirmation. Mention if it is the live record.
- An empty state for each tab: "Nothing is showing for this week yet. Members won't see a scripture until you add one."

## 6. The member PWA (already done)

For reference, so all three agree. The PWA calls `GET /scriptures/current` on every home page load and:

- Shows a **Scripture** card with a **This week** / **This year** switch.
- Shows only the tabs that came back non-null. With one, there is no switch. With none, the card is hidden.
- Treats any error as "nothing to show" and carries on. A `404` is not logged, so deploying the PWA before Dove is safe.

## 7. Tests

- `current` returns the latest published record per kind and ignores drafts.
- A record with a future `startsOn` is not current until that date (test around midnight in Lagos, not UTC).
- Two records with the same `startsOn`: the newest by `createdAt` wins.
- `current` returns `null` for a kind with no eligible record, and still returns `200`.
- Public `current` leaks no admin fields.
- Member tokens get `403` on every write endpoint. Unauthenticated callers get `401`.
- Admin list: `isCurrent` is true for exactly one record per kind (or none).
- Another church's records never appear and can't be edited (`404`).

## 8. Rollout order

1. Dove: migration, endpoints, tests. Deploy.
2. Olive: the Scripture page.
3. Staff add the first week and year scriptures. The PWA needs no release, since it already hides the card until data exists.
