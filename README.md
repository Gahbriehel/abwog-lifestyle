# Amazing Grace: member app (PWA)

The member-facing Progressive Web App for **Abiding Word Of Grace Missions** (PKA Amazing Grace Bible Church), served at **https://app.abwog.org**.

What anyone can do, without signing in:
- See what's coming up on the home page and the **Events** tab, open an event and **register** for it (they get a check-in QR code).
- Open **Give** (from the menu or the home page) to see the church's bank accounts and copy an account number.
- Browse **Confessions** (from the menu or the home page): search, read, and **listen**. Each confession can have a recorded female and male voice, with speed control, skip back and forward 15 seconds, and lock-screen controls. A confession without a recording is read aloud by the phone's own voice, sentence by sentence, with pause and speed controls.

What members can do:
- Sign in with a PIN; the greeting, account tab and event registration form adapt.
- Scan the foyer QR code and request a secure link by email.
- Check and update their details: personal info, contact, role at church, departments.
- Save the church WhatsApp number.
- Install the app to their home screen.

Later phases add updates, devotionals and events to the same installed app.

All data lives in the **Dove** API (`../dove`, deployed at `https://api.abwog.org`). This app has no database of its own. Server Components and Server Actions call Dove, so the browser never talks to the API directly.

- Plan: [docs/implementation-plan.md](docs/implementation-plan.md)
- Backend work for giving: [docs/dove-giving-accounts.md](docs/dove-giving-accounts.md)
- Backend work for confessions: [docs/dove-confessions.md](docs/dove-confessions.md)
- Backend work this app depends on: Part A of `dove/docs/PHASE2_MESSAGING_AND_PROFILE_IMPLEMENTATION.md`
- Church WhatsApp setup: [docs/whatsapp-business-setup.md](docs/whatsapp-business-setup.md)

## Quick start

```bash
bun install
cp .env.example .env.local
bun dev:stub      # terminal 1: local stand-in for Dove on :4010
bun dev           # terminal 2: app on http://localhost:3100
```

The stub prints the "emailed" link when you request one. You can also open these directly:

| URL | Scenario |
|---|---|
| `/profile/member-sarah` | Existing Worker with two departments |
| `/profile/new-visitor` | Record Dove created from an unknown email (empty name fields) |
| `/profile/leader-no-dept` | Leader, departments optional |
| `/profile/expired-link` | Expired link screen |
| `/profile/anything-else` | Invalid or used link screen |
| `/events`, `/events/event-youth` | Public events (also `event-sunday` no registration, `event-full`, `event-ended`) |
| `/events/event-youth/register` | Register; email `dupe@example.com` → "already registered", first name `Fail` → error |
| `/give` | Three giving accounts (NGN, NGN, USD) |
| `/confessions` | Four confessions: search, categories (Peace, Protection, Provision) |
| `/confessions/confession-for-protection` | Both voices (female and male), with next link |
| `/confessions/confession-for-peace` | Female recording only |
| `/confessions/confession-of-gratitude` | No recording, so the phone's voice reads it |
| `/confessions/hidden-draft` | A draft: 404, like the real API |

Enter the first name **Fail** and save to see the error toast.

To use the real Dove API instead, set `DOVE_API_URL` in `.env.local`, e.g. `http://localhost:3000/api/v1`.

## Environment

| Variable | Where it's used | Production value |
|---|---|---|
| `DOVE_API_URL` | Server only | `https://api.abwog.org/api/v1` |
| `APP_URL` | Metadata and install instructions | `https://app.abwog.org` |

Dove must have `PROFILE_URL=https://app.abwog.org/profile` so emailed links open this app (Dove A1).

## Confessions in the app

The list, reader and player are in `src/app/(app)/confessions/` and `src/components/confessions/`. Backend contract: [docs/dove-confessions.md](docs/dove-confessions.md).

- **Listen counts:** Dove always counts listens (once per confession per visit, after about 10 seconds of playback). Showing the number to members is a switch: `features.showListenCounts` in `src/lib/church.ts` (off by default).
- **Phone voice:** read aloud with the browser's built-in speech (`src/lib/speech.ts`, `SpeechPlayer.tsx`). It reads one sentence at a time, because long utterances get cut off on some phones. It may stop if the screen locks.

## Confession audio (staff tool)

Confession MP3s (a female and a male voice) are made on a staff computer with a free voice called Kokoro, then uploaded in Olive. The tool lives in [tools/confession-audio/](tools/confession-audio/) and has its own README with setup, usage and troubleshooting. It is not part of the app and is not installed with it.

## Scripts

| Script | What it does |
|---|---|
| `bun dev` / `bun run build` / `bun start` | Next.js on port 3100 |
| `bun dev:stub` | Dove stub on port 4010 |
| `bun run test` | Unit tests (Vitest) |
| `bun run test:e2e` | Playwright on a 390×844 phone viewport, in light and dark mode. Starts its own stub (port 4011) and dev server (port 3101, build folder `.next-e2e`), so it never touches a `bun dev` you have running, which may be talking to the real API. Set `PW_CHROMIUM_PATH` to reuse an installed Chromium; otherwise run `bunx playwright install chromium` first. |
| `bun run check-all` | Types, lint and unit tests |
| `bun icons` | Regenerates the PWA icons from `public/brand/icon-gold.png` |

## Structure

```
src/app/
  page.tsx                  home (manifest start_url) with the install card
  profile/page.tsx          claim → "check your email"
  profile/actions.ts        requestLink → POST /profile/claim
  profile/[token]/page.tsx  GET /profile/:token → form, link problem, or load error
  profile/[token]/actions.ts saveProfile → PATCH /profile/:token
  manifest.ts, icon.png, apple-icon.png
src/components/ui/          design-system primitives (Button, fields, choice groups, brand, toast…)
src/components/onboarding/  screens (ClaimFlow, ProfileForm, SuccessView, InstallCard, LinkProblem)
src/lib/                    Dove client, validation (zod), phone, install detection, WhatsApp/vCard
public/sw.js                service worker: offline page + static assets; never caches /profile/*
scripts/                    dove-stub.ts, generate-icons.ts
e2e/                        Playwright tests
```

## Notes

- **Errors switch on Dove's `code`.** Expired vs invalid links, `NAMES_REQUIRED` and `DEPARTMENT_REQUIRED` are all read from the `code` field (a message-based fallback for links remains, but is no longer needed). The WhatsApp card only appears when Dove returns a `whatsappNumber`.
- **Rate limits.** Dove allows 1 link request per email per 60 s and 5 per hour, and silently skips the email beyond that, so the 60 s resend countdown is the only feedback. A `429` only comes from Dove's per-IP cap.
- **The secure link is never left behind.** It never appears in the `Referer` header, and `/profile/*` sends `no-store` and `noindex`. After a successful save, the address bar is replaced with `/`, so refreshing or adding to the home screen doesn't land on a used link.
- **Install prompt timing.** `beforeinstallprompt` is captured by an inline script in `<head>`, because it can fire before React loads.
- **Colours.** The design colours were matched by eye from the Magic Patterns screenshots, then adjusted to meet WCAG AA: gold text and form-control borders were darkened. Replace them with exact export values if available, and re-check contrast.
- **Logo.** The church's real logo (gold dove and Bible) replaces the "AWG" monogram placeholder from the design.
