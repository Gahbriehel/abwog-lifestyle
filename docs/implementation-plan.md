# Implementation plan: member profile claim + PWA install

**Sources:**
- UI: the Magic Patterns designs (screens 1–5) and [magic-patterns-prompt.md](./magic-patterns-prompt.md).
- Backend: the **Dove** API (`../dove`). See `dove/docs/FRONTEND_PWA_GUIDE.md` and Part A of `dove/docs/PHASE2_MESSAGING_AND_PROFILE_IMPLEMENTATION.md`.
- Related: `olive/docs/whatsapp-outreach-implementation.md` (admin side) and [whatsapp-business-setup.md](./whatsapp-business-setup.md) (church phone setup).

This repo is the member-facing PWA (the `dove-app` in Dove's docs). **It has no database of its own.** All data lives in Dove.

---

## 0. Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | How members get their link | **Email only.** The Phone tab and its states are removed from screens 1 and 2. No SMS. |
| 2 | Backend | Dove's `POST /profile/claim`, `GET /profile/:token`, `PATCH /profile/:token`. They already exist; Dove Part A fixes them up. |
| 3 | Church naming | Full name **"Abiding Word Of Grace Missions"**. Subtitle on the claim screen: **"(PKA Amazing Grace Bible Church)"**. Short name in messages: "Amazing Grace". |
| 4 | Unknown email | Dove creates a new Visitor and sends the link anyway. The UI always shows "Check your email" (no enumeration). New people see empty name fields (`namesConfirmed: false`). |
| 5 | Status changes to Visitor/Member | Send `departmentIds: []`, which clears departments. Dove enforces the same rule. |
| 6 | Installed app opens to (`start_url`) | `/`: a simple church welcome page until Phase 3 features exist. |
| 7 | Package manager | Bun, matching Dove and Olive. |
| 8 | Domains | Member PWA: **`https://app.abwog.org`**. Dove API: `https://api.abwog.org` (VPS). Olive admin: `https://admin.abwog.org`. Public website: `https://abwog.org`. |

### Environment settings

| Where | Setting | Production value |
|---|---|---|
| This app | `DOVE_API_URL` (server-only) | `https://api.abwog.org/api/v1` |
| Dove | `PROFILE_URL` (new, Dove A1) | `https://app.abwog.org/profile` |
| DNS | `app` record | Points to wherever this app is hosted |

Dove already sends from `info@abwog.org`, a verified domain, so link emails will be delivered.

### Still open

- **Where this app is hosted** (Vercel or the existing VPS). This only decides the DNS record.
- **Magic Patterns code export**, if available, for exact colour tokens.

---

## 1. Stack

- **Next.js 16 (App Router) + TypeScript.** This matches Olive's Next major version.
- **Tailwind CSS v4.** Design tokens are CSS variables with light and dark sets.
- **Fonts** via `next/font`: Fraunces for headings, DM Sans for body.
- **Forms:** `react-hook-form` + `zod`.
- **Calls to Dove go through the Next server** (Server Components and Server Actions). The browser never calls Dove directly, and the Dove URL stays in `DOVE_API_URL` (server-only env).
- **Testing:** Vitest for units; Playwright at 390×844 in light and dark, against a mocked Dove (MSW or a stub server).

---

## 2. Dove dependencies (Part A of the Dove guide)

| Dove item | Why the PWA needs it | Blocks |
|---|---|---|
| A1 `PROFILE_URL` | Links currently point at the wrong app | Launch |
| A2 error `code`s | Choosing between the Expired and Invalid screens | Screen 3 |
| A3 `namesConfirmed` | No "Sarah adeyemi / Guest" placeholders on the form | Screen 4 |
| A4 rate limiting | Stops inbox flooding; the resend countdown matches the server limit | Launch |
| A5 grace window | Someone who opens the link at minute 29 can still save | Screen 4 |
| A6 department rule | Server mirrors the "Worker needs a department" rule | Screen 4 |
| A7 email copy | No "magic link" wording | Launch |
| A9 church `shortName`, `whatsappNumber` | "Save our WhatsApp number" card | Screen 5 |

**Until Dove ships these, develop against a stub that returns the target shapes.** The `code` field in particular: until it ships, fall back to matching the message text (contains "expired") so the screens still work.

---

## 3. Routes & files

```
app/
  layout.tsx                 fonts, tokens, <InstallPromptProvider>, manifest, SW registration (prod)
  manifest.ts
  page.tsx                   welcome page (start_url)
  profile/
    page.tsx                 Claim → Check your email (client state swap)
    actions.ts               requestLink(email) → POST /profile/claim
    [token]/
      page.tsx               server: GET /profile/:token → <LinkProblem> | <ProfileFlow>
      loading.tsx            skeleton
      actions.ts             saveProfile(token, data) → PATCH /profile/:token
lib/
  dove.ts                    typed fetch wrapper (unwraps { data }, maps errors to { code, message })
  types.ts                   types copied from FRONTEND_PWA_GUIDE §7, plus namesConfirmed and church fields
  validation/profile.ts      zod schema
  mask.ts                    s•••@example.com
  church.ts                  static church config for screens without a token (name, PKA line, logo)
  whatsapp.ts                wa.me link + vCard builder
components/ui/               reusable set (§4)
components/onboarding/       screen-level pieces
public/sw.js, icons/
```

- **Security headers on `/profile/*`:** `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`. No third-party scripts on these routes.
- **Never log the token.** That includes server action errors.

---

## 4. Design system

**Tokens (CSS variables, light / dark).** These hex values were picked by eye from screenshots. Replace them with exact export values, then check every text/background pair against WCAG AA. The gold-on-cream pair is the one most likely to fail.

| Token | Light | Dark |
|---|---|---|
| `--bg` | ~`#FAF6EF` cream | ~`#2A2422` warm charcoal |
| `--surface` | white | ~`#342D2A` |
| `--primary` / `--on-primary` | ~`#5B2C5E` plum / white | ~`#D4A5D6` lilac / ~`#2A1A2B` |
| `--gold` / `--gold-soft` | ~`#C9973F` / ~`#F5E9D3` | ~`#D9B061` / ~`#4A3E2C` |
| `--primary-soft` | ~`#F1E3F1` | ~`#4A3349` |
| `--danger` | ~`#B42318` | ~`#F59E8B` |

- Radius is 12px for controls and 16px for cards.
- Dark mode follows the system setting; there is no toggle.

**Components**, each shown with all its states on `/dev/ui` (excluded from production):

| Component | Notes |
|---|---|
| `Button` | Variants: primary / secondary / text; states: loading / disabled; 48px tall |
| `TextField`, `TextArea` | Label, required mark, helper text, error with `aria-describedby` |
| `PillRadioGroup` | Gender |
| `SelectableCard` | Membership status |
| `CheckCard`, `Chip` | Departments |
| `Badge` | |
| `IconCircle` | |
| `ChurchHeader` | `full` variant with the PKA subtitle; `compact` variant. Names wrap, never truncate |
| `PoweredByDove` | |
| `StickyActionBar` | Safe-area padding |
| `Toast` | |
| `Skeleton` | |
| `Collapse` | `grid-template-rows` animation; respects reduced motion |

There is no longer a `SegmentedControl` or `PhoneField`, because the claim screen has no Email/Phone toggle. The phone input in the profile form is a normal `TextField` with `inputMode="tel"` and a fixed "+234" prefix. Dove normalises the number.

---

## 5. Screens

### Screen 1: Claim (`/profile`)
- `ChurchHeader full`: logo, "Abiding Word Of Grace Missions", "(PKA Amazing Grace Bible Church)".
- Headline "Welcome! Let's update your details", then "We'll send you a secure link. No password needed."
- **Email field only**, with "Email address" as the label.
  - Input attributes: `type="email"`, `inputMode="email"`, `autoComplete="email"`.
  - Validate on blur and on submit.
  - Error: "Please enter a valid email address."
- "Send my link" button with loading state ("Sending your link…"), then the privacy line.
- **Design change:** remove the Email/Phone toggle and the "Default · Phone" and "Validation error · Phone" states from the Magic Patterns file. The validation-error state now applies to email.

### Screen 2: Check your email (state inside `/profile`)
- Envelope in an `IconCircle`, then "Check your email".
- Below it: "If we have your details, we've sent a secure link to **s•••@example.com**. It expires in 30 minutes."
- **Resend link:** a 60-second countdown ("Resend in 0:42"), matching Dove's per-email limit, then enabled.
- **"Use a different email"** returns to screen 1 with the field filled in.
- Add the hint: "Can't find it? Check your spam or promotions folder."

### Screen 3: Link problems (`/profile/[token]`)
- `PROFILE_LINK_EXPIRED` → Expired variant. `PROFILE_LINK_INVALID` → Invalid variant. Copy as in the design.
- Both use "Request a new link", which goes to `/profile`.

### Screen 4: Profile form (`/profile/[token]`)
- `loading.tsx` shows the skeleton.
- **Greeting:**
  - "Hi {firstName} 👋" when `namesConfirmed`.
  - Otherwise "Welcome! 👋 Tell us a little about yourself", with the name fields empty and focused first.
- **Sections:** Personal, Contact (email, phone, address), Your role at church (selectable cards), Departments (conditional).
- **Zod schema:**
  - First and last name required, max 100.
  - Gender optional.
  - Date of birth optional, must be in the past.
  - Email required and valid, since it's how they got here.
  - Phone optional, Nigerian format.
  - Address max 500.
  - Status required.
  - `WORKER` needs at least 1 department; `LEADER`/`PASTOR` optional; `VISITOR`/`MEMBER` → `[]`.
- **Sticky "Save & continue":** disabled only while saving.
- **On failed validation:** scroll to the first error and focus it.
- **Server errors from the save:**

| Error | Behaviour |
|---|---|
| `DEPARTMENT_REQUIRED` | Show the inline department error |
| `NAMES_REQUIRED` | Show the inline name errors |
| Expired or invalid link | Show screen 3 |
| Anything else | Toast "Something went wrong. Please try again."; keep what they typed |

### Screen 5: Success + stay connected
- Gold check with a one-time confetti animation (skipped under reduced motion). Then "You're all set, {firstName}!" and the thank-you line.
- **Summary card:** name, status badge, department chips.
- **New "Save our WhatsApp number" card**, shown when `church.whatsappNumber` is set:
  - Copy: "Save **Amazing Grace** in your contacts so you get birthday wishes and check-ins from the church on WhatsApp."
  - **"Save contact"** downloads a `.vcf`. Name: "Amazing Grace (Abiding Word Of Grace Missions)"; phone: the number; URL: the church website. On iOS Safari and Android Chrome this opens the add-contact screen.
  - **"Say hi on WhatsApp"** is a text link to `https://wa.me/<digits>?text=Hello%20Amazing%20Grace!`.
  - Why: when members have saved the number, WhatsApp is far less likely to flag church messages as spam.
  - Add this card to the Magic Patterns design (light and dark).
- **Install card** (`InstallCard`):

| Variant | When | Shows |
|---|---|---|
| Already installed | `display-mode: standalone` / `navigator.standalone` | "You can close this page." |
| Android/Chrome | A `beforeinstallprompt` event was captured | "Install app" + "Maybe later" |
| iOS Safari | iOS, Safari, not an in-app browser | The 2-step Share → Add to Home Screen guide |
| Other browsers / in-app browsers (Gmail, WhatsApp, Instagram) | Anything else | "To install the app, open this page in Chrome or Safari." and "You can close this page." |

- `InstallPromptProvider` in the root layout captures `beforeinstallprompt` on page load. The event fires long before screen 5.

---

## 6. PWA

- **`manifest.ts`:**
  - `name`: "Abiding Word Of Grace Missions"; `short_name`: "Amazing Grace".
  - `start_url: "/"`, `display: "standalone"`, colours from the tokens.
  - Icons at 192 and 512, plus a maskable 512.
- **Apple:** `apple-touch-icon` (180), plus the status bar meta tags.
- **`public/sw.js`:**
  - Precaches the app shell and an offline page.
  - **Never caches `/profile/*`** or server-action POSTs.
  - Registered in production only.
- **Before launch:** check installability in Lighthouse, then test on a real Android phone and a real iPhone.

---

## 7. Build order & estimate

| Phase | Scope | Est. |
|---|---|---|
| 0 | Confirm hosting/domains; get the Magic Patterns export; ask Dove to schedule Part A | — |
| 1 | Scaffold, tokens, fonts, dark mode, `components/ui` + `/dev/ui` | 2–2.5 d |
| 2 | `lib/dove.ts`, types, Dove stub, screens 1–2 | 1 d |
| 3 | Screen 3 + the token page shell | 0.5 d |
| 4 | Screen 4 form + save | 1.5 d |
| 5 | Screen 5: summary, WhatsApp contact card, install card | 1 d |
| 6 | Manifest, icons, service worker, offline page, welcome page | 0.5–1 d |
| 7 | Accessibility pass, Playwright, real devices, foyer QR code | 1 d |
| | **Total** | **~7.5–8.5 days** |

## 8. Testing checklist

- **Unit:**
  - Zod schema across every status and department combination.
  - Email masking.
  - Mapping Dove errors to codes, including the message-text fallback.
  - vCard builder and wa.me link encoding.
- **E2E (Playwright, 390×844, light and dark, Dove stubbed):**
  - Happy path for an existing member.
  - New person (`namesConfirmed: false`).
  - Expired link and invalid link.
  - Worker with no department.
  - Visitor → Worker → Visitor (the departments section collapses and expands).
  - Server error toast.
  - Grace-window save.
- **Manual:**
  - VoiceOver and TalkBack.
  - 200% text zoom.
  - Slow 3G.
  - Opening the link from the Gmail app and from WhatsApp.
  - Install on Android Chrome and iOS Safari.
  - "Save contact" on both platforms.

## 9. Launch

- Print a foyer QR code for `https://app.abwog.org/profile?src=foyer`. Put it next to the church WhatsApp QR from the setup guide.
- Soft launch with staff the Sunday before the announcement.
- Watch the claim → saved conversion, and email bounces (Olive → Reports → Bounces).
- **Privacy:** link the privacy line to a short notice (Nigeria NDPA 2023). The church supplies the wording.
