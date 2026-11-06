# Dove guide: Confessions

**For:** the Dove (NestJS) backend, plus notes for Olive (admin) and the member PWA so all three agree.

**What a confession is:** a short piece of text that members read or listen to. Each one can have **recorded audio** (a male and a female version) made ahead of time with Kokoro, an open-source voice. When a confession has no audio, the PWA reads it aloud with the phone's built-in voice instead.

**Dove does not generate audio.** The droplet (1 vCPU, 1 GB RAM) can't run Kokoro: in a test it needed about 1.2 GB of memory and took roughly 2x as long as the audio it produced. Audio is made on a staff computer (see §7) and **uploaded** through Olive. Dove only stores the text and the MP3 files and serves them.

**Decisions already made**

| Topic | Decision |
|---|---|
| Shape | A **library** with a staff-controlled order, plus search. |
| Order | Staff set the order by hand. It never depends on dates or on editing a record. |
| Who writes | `ADMIN` and `SUPER_ADMIN` only. |
| Access | Reading is **public** (no sign-in). Writing is admin only. |
| Language | English only. |
| Audio | Kokoro, made off the server. One **female** and one **male** MP3 per confession, uploaded with the confession. |
| Storage | The VPS disk (`public/`), as images already are. No object storage. |
| Fallback | No audio for a confession means the PWA uses the browser voice. |
| Listen counts | Counted now, shown in the PWA only if the church wants them (a PWA setting). |

---

## 1. Data model

```prisma
enum ConfessionStatus {
  DRAFT
  PUBLISHED
}

enum ConfessionVoice {
  FEMALE
  MALE
}

model Confession {
  id           String           @id @default(uuid())
  churchId     String           @map("church_id")
  title        String           @db.VarChar(150)
  slug         String           @db.VarChar(160)            // used in the PWA address: /confessions/<slug>
  body         String           @db.Text                    // plain text, paragraphs separated by a blank line
  scriptureRef String?          @map("scripture_ref") @db.VarChar(100)
  category     String?          @db.VarChar(50)             // optional free text
  status       ConfessionStatus @default(DRAFT)
  sortOrder    Int              @default(0) @map("sort_order")
  publishedAt  DateTime?        @map("published_at")        // set the first time it is published
  listenCount  Int              @default(0) @map("listen_count")
  createdById  String?          @map("created_by_id")
  updatedById  String?          @map("updated_by_id")
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  church Church            @relation(fields: [churchId], references: [id], onDelete: Cascade)
  audio  ConfessionAudio[]

  @@unique([churchId, slug])
  @@index([churchId, status, sortOrder])
  @@map("confessions")
}

model ConfessionAudio {
  id            String          @id @default(uuid())
  confessionId  String          @map("confession_id")
  voice         ConfessionVoice
  url           String          @db.VarChar(512)   // /public/confession-audio/<confessionId>/<voice>-<hash>.mp3
  durationSec   Int             @map("duration_sec")
  sizeBytes     Int             @map("size_bytes")
  textHash      String          @map("text_hash") @db.VarChar(64)  // hash of the body the audio was made from
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  confession Confession @relation(fields: [confessionId], references: [id], onDelete: Cascade)

  @@unique([confessionId, voice])
  @@map("confession_audio")
}
```

Add `confessions Confession[]` to `Church`, then run a Prisma migration.

Notes:

- **`body` is plain text.** No HTML or Markdown. Paragraphs are split on blank lines. This keeps the reader simple and keeps the browser voice from reading out symbols.
- **`slug`** is generated from the title (lowercase, hyphens, no punctuation) and stays editable. It must be unique within the church. If a generated slug is taken, add `-2`, `-3` and so on. Changing a slug breaks old links, so Olive should warn before saving it.
- **`category` is optional free text.** The PWA shows category filters only if at least one published confession has a category.
- **`publishedAt`** is set when a confession first moves to `PUBLISHED` and is kept if it is unpublished and republished. It is for display only, never for ordering.
- **`textHash`** is a SHA-256 of the normalised `body` at the moment the audio was uploaded. Dove compares it with the current body to tell staff when audio is out of date (§4).

## 2. Ordering

The order is set by staff and stored in `sortOrder`. Nothing else affects it, so there is no need to edit a record to push it up the list.

- **New confessions go to the end** (`max(sortOrder) + 1`).
- **Drafts and published ones share one order.** The public list shows only published ones, in that same relative order.
- **Reordering:** `PATCH /confessions/reorder` takes the full list of ids in the new order and sets `sortOrder` to each id's position, in one transaction (see §3.6).
- **Position numbers:** every public item includes `position`, its 1-based rank among **published** confessions. The PWA shows it as the confession's number. Because Dove computes it, the number stays correct across pages and when drafts exist.
- **Previous and next:** the single-confession response includes the neighbours in this order (§3.3).
- Updating a record (`updatedAt`) has **no** effect on order.

## 3. Endpoints

Base: `/api/v1`. Responses use Dove's usual envelope `{ success, message, data, timestamp }`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/confessions` | **Public** | List published confessions (admins also get drafts) |
| `GET` | `/confessions/categories` | **Public** | Distinct categories of published confessions |
| `GET` | `/confessions/:idOrSlug` | **Public** | One confession, with its text |
| `POST` | `/confessions/:id/listen` | **Public** | Count one listen |
| `POST` | `/confessions` | `ADMIN`, `SUPER_ADMIN` | Create |
| `PATCH` | `/confessions/reorder` | `ADMIN`, `SUPER_ADMIN` | Set the order |
| `PATCH` | `/confessions/:id` | `ADMIN`, `SUPER_ADMIN` | Update, including `status` |
| `DELETE` | `/confessions/:id` | `ADMIN`, `SUPER_ADMIN` | Delete (also removes its audio files) |
| `PUT` | `/confessions/:id/audio/:voice` | `ADMIN`, `SUPER_ADMIN` | Upload or replace an MP3 (`female` or `male`) |
| `DELETE` | `/confessions/:id/audio/:voice` | `ADMIN`, `SUPER_ADMIN` | Remove one audio file |

Member tokens (`type: 'member'`) must be rejected by every write endpoint. Register `categories` and `reorder` **before** the `:id` routes.

### 3.1 `GET /confessions`

Mirrors `GET /events`:

- **Church:** `?churchId=` if given, else the staff user's church, else `getDefaultChurchId()`.
- **Public caller:** only `status = PUBLISHED`.
- **Admin caller:** all statuses, with an optional `?status=` filter.
- **Filters:** `category` (case-insensitive exact match) and `search` (matches title or body).
- **Pagination:** `page` (default 1), `limit` (default 20, **max 100** for public; **max 200** for admins, so Olive can load the whole list to reorder it).
- **Order:** `sortOrder` ascending, then `createdAt` ascending.
- List items leave out the full `body` and send a short `excerpt` (about 160 characters, cut on a word boundary).

```json
{
  "success": true,
  "message": "Confessions retrieved successfully",
  "data": {
    "items": [
      {
        "id": "6bde…",
        "slug": "confession-to-start-my-day",
        "title": "Confession to Start my Day",
        "excerpt": "I declare that this is the best day of my life yet. As soon as my feet hit the floor…",
        "scriptureRef": null,
        "category": null,
        "status": "PUBLISHED",
        "position": 3,
        "wordCount": 281,
        "listenCount": 143,
        "audio": {
          "female": { "url": "/public/confession-audio/6bde…/female-a1b2c3d4.mp3", "durationSec": 52 },
          "male":   { "url": "/public/confession-audio/6bde…/male-e5f6a7b8.mp3",   "durationSec": 57 }
        }
      }
    ],
    "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

- `audio` has only the voices that exist, and is `{}` when there is none. URLs are paths on the Dove host (like uploaded images); the PWA prefixes the API origin.
- `position` is `null` for drafts.
- `wordCount` is computed from `body` (split on whitespace).
- `listenCount` is always included. Whether the PWA displays it is the PWA's choice.

### 3.2 `GET /confessions/categories`

```json
{ "data": ["Healing", "Protection", "Provision"] }
```

Distinct, sorted A to Z, non-empty categories among **published** confessions. Send `Cache-Control: public, max-age=60`.

### 3.3 `GET /confessions/:idOrSlug`

Treat the value as an id if it looks like a UUID, otherwise as a slug. Returns the list item shape plus:

- `body`: the full text.
- `previous` and `next`: `{ "slug": "…", "title": "…" }` for the neighbouring **published** confessions in the order, or `null` at either end.
- For admins, an `audioStale` object (see §4).

A public caller asking for a draft gets **404**, not 403, so drafts can't be probed. A confession from another church also returns 404.

### 3.4 `POST /confessions` and `PATCH /confessions/:id`

```json
{
  "title": "Confession to Start my Day",
  "slug": "confession-to-start-my-day",
  "body": "I declare that this is the best day of my life yet.\n\nI am on a perpetual cycle of increase…",
  "scriptureRef": "Psalm 118:24",
  "category": "Daily",
  "status": "DRAFT"
}
```

- `POST` returns `201` with the full item. `slug` is optional (generated from the title). The church comes from the caller's token, never from the body.
- `PATCH` accepts any subset (but not `sortOrder`; use `reorder`). `404` if the id belongs to another church. Moving to `PUBLISHED` for the first time sets `publishedAt = now`. Set `updatedById` to the caller.
- Publishing requires a non-empty `title` and `body`; check the merged result on `PATCH`.

### 3.5 `DELETE /confessions/:id`

Hard delete. Deletes the audio rows **and the MP3 files on disk** for that confession. Returns `200` with a message, or `404`.

### 3.6 `PATCH /confessions/reorder`

```json
{ "ids": ["id-a", "id-b", "id-c"] }
```

`ids` must contain **every** confession of the caller's church exactly once (drafts included). Sets `sortOrder` to each id's index in one transaction. `400` if an id is unknown, from another church, duplicated or missing, with a message that says so. Olive loads the full admin list (limit 200), lets staff drag items, and sends the whole list.

### 3.7 Audio: `PUT` and `DELETE /confessions/:id/audio/:voice`

`:voice` is `female` or `male`.

`PUT` takes `multipart/form-data` with a single `file` field containing an MP3.

- **Rules:** `audio/mpeg` only, `.mp3` extension, **maximum 25 MB**. Check the file's real contents, not just its name or declared type: parse it with a pure-JavaScript library such as `music-metadata` (no `ffmpeg` needed on the server), reject anything that is not valid MP3, and read the duration from it.
- **Stores:** the file at `public/confession-audio/<confessionId>/<voice>-<first 8 chars of file hash>.mp3`, and upserts the `ConfessionAudio` row with `durationSec`, `sizeBytes` and `textHash` (hash of the confession's current body). Putting the hash in the file name means a replaced file gets a new URL, so phones never play a stale cached copy.
- **Replacing:** write the new file first, update the row, then delete the old file. A failure must never leave a row pointing at a missing file.
- Returns `200` with the updated confession.
- `DELETE` removes the row and the file, and returns `200`, or `404` if that voice has no audio.

Serve these files with the same static-assets setup used for images, which supports HTTP **Range** requests. iOS Safari will not play or seek audio without them. Send `Cache-Control: public, max-age=31536000, immutable`, which is safe because the file name changes whenever the content does. If a reverse proxy such as nginx sits in front, make sure it passes `Range` through (it does by default).

### 3.8 `POST /confessions/:id/listen` (public)

Counts one listen. No body. Returns `204` with no content, so the count is not revealed to the caller.

- Increment atomically (`listenCount = listenCount + 1`, not read then write).
- Only **published** confessions of the default church count. Anything else returns `404`.
- **Throttle:** about 20 calls per minute per IP (the existing throttler), because anyone can call this.
- This is an approximate counter by design. There is no per-person de-duplication.

## 4. Audio going out of date

When staff edit a confession's text, the existing audio no longer matches it. Dove does **not** hide or delete the audio (a small typo fix shouldn't silence the confession). Instead, on admin responses only, include:

```json
"audioStale": { "female": true, "male": false }
```

A voice is stale when its stored `textHash` differs from the hash of the current `body`. Voices with no audio are omitted. Olive shows an "audio out of date" badge so staff know to make and upload new files. The public response never includes `audioStale`.

## 5. Validation

| Field | Rule |
|---|---|
| `title` | required, trimmed, 1–150 chars |
| `slug` | optional on create; lowercase letters, digits and hyphens only, 1–160 chars, unique per church (409 if taken) |
| `body` | required, trimmed, 1–20000 chars. Normalise line endings to `\n` and collapse three or more blank lines into one. |
| `scriptureRef` | optional, trimmed, max 100 chars, empty string stored as `null` |
| `category` | optional, trimmed, max 50 chars, empty string stored as `null`. Reuse an existing category's casing when it matches case-insensitively, so "healing" doesn't create a second "Healing". |
| `status` | `DRAFT` or `PUBLISHED`, default `DRAFT` |
| audio file | MP3 only, max 25 MB, must parse as a valid MP3 |

Use `class-validator` DTOs like the rest of Dove, and reject unknown properties (`whitelist` + `forbidNonWhitelisted`).

## 6. Tests

- Public list returns only published items in `sortOrder`, with `excerpt`, `position`, `wordCount`, `listenCount` and `audio`, and no `body`.
- Editing a record does not change its place in the order; `reorder` does.
- `reorder` rejects missing, duplicated and unknown ids.
- `position` numbers published items 1..n and skips drafts; it is `null` for drafts.
- `previous` and `next` follow the order and skip drafts.
- A public `GET` for a draft or another church's confession returns 404.
- Only `ADMIN` and `SUPER_ADMIN` can write. `COORDINATOR`, member tokens and anonymous callers cannot.
- Audio: a non-MP3 file renamed to `.mp3` is rejected; replacing audio changes the URL and removes the old file; deleting a confession removes its files; `audioStale` flips to true after the body changes.
- Listen: increments by one, returns 204, is throttled, and returns 404 for drafts.
- Slug generation handles clashes and punctuation; a taken slug returns 409.

## 7. Making the audio (not part of Dove)

The audio is made on a staff computer with **Kokoro**, then uploaded through Olive. A standalone tool in the PWA repo does the work: `tools/confession-audio/` (its README has the full instructions). Its output files are named `<slug>.female.mp3` and `<slug>.male.mp3`, and the slug in the file name must match the confession's slug in Dove. The tool hashes the text the same way Dove does (SHA-256 of the normalised body), so the two can be compared.

- **Voices:** one female and one male (the test used `af_heart` and `am_michael`).
- **Pace:** generate slightly slower than Kokoro's default, speed **0.9**, as a setting the script accepts. Members can also change playback speed in the PWA.
- **Format:** mono MP3 at 64 kbps, with about 0.7 seconds of silence between paragraphs and even loudness. A one-minute confession is about 0.5 MB, so a library of about 45 confessions is roughly 70 MB per voice.
- **Pronunciation:** if a name is read wrongly, the script accepts a small word list that respells it before reading.
- **Tip for staff:** after a text edit, Olive shows "audio out of date" (§4); generate again and upload to replace.

## 8. Olive (admin) expectations

Olive gets its own guide later; this is what the API is designed for.

- **List:** all confessions in order, with status (Draft or Live), the audio status for each voice (none, ok, out of date) and the listen count. **Drag to reorder**, which sends the whole list to `reorder`.
- **Editor:** title, slug (with a warning on change), scripture reference, optional category, plain-text body with a word counter, and a Publish or Unpublish button.
- **Audio panel:** two slots (Female, Male), each with a player, an upload button that replaces the file, a remove button, and the "out of date" badge.
- **Preview:** a phone-width preview of how the reader screen will look.

## 9. What the PWA does with it

- **`/confessions`:** search box, a list in the staff order showing each item's `position` number, title and length (from the longest audio, or computed from `wordCount` at about 200 words per minute), a headphones icon when audio exists, and optionally the listen count. Category chips appear only if categories exist. Public. It is linked from the menu and a home page teaser, not from the bottom tabs.
- **`/confessions/[slug]`:** readable text with a text-size control, scripture reference, a **Listen** player, and **Previous** and **Next** links.
- **Player with recorded audio:** play and pause, a seek bar, skip back and forward 15 seconds, a **female or male** choice, and playback speed of 0.75×, 1×, 1.25× and 1.5× (default 1×, remembered per phone).
- **Player without audio:** the browser voice, read in chunks, with pause, speed and a highlight on the sentence being read. Starts only from a tap, and hides itself if the browser has no speech support.
- **Counting listens:** the PWA calls `POST /confessions/:id/listen` **once per confession per visit**, after about 10 seconds of actual playback, for recorded audio and browser voice alike. Seeking or replaying doesn't count again.
- **Showing counts:** a single setting in the PWA decides whether `listenCount` is displayed.
- **Errors:** an empty list shows "No confessions yet"; a failed load shows "We couldn't load confessions."
