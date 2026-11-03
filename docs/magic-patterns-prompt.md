Design a mobile-first Progressive Web App onboarding flow for a church: members update their profile and then install the app. Members reach it by scanning a QR code at church, so most will be on a phone, standing in a church foyer. They have never logged in, and many are not tech-savvy. The flow should feel warm, welcoming and quick, like being greeted at the door, not like filling in a government form.

## Brand & visual direction
- **Church-first branding.** The church leads every screen. Its official name is **"Abiding Word Of Grace Missions"**, and it was previously known as "Amazing Grace Bible Church". Use the full official name in headers, and wrap it gracefully on narrow screens rather than truncating it. On the claim screen (1), show "(formerly Amazing Grace Bible Church)" as a small muted subtitle under the name so returning members recognise it. Use a round logo placeholder with the monogram "AWG". The product is called **Dove**. Show it only as a small "Powered by Dove" mark (a simple dove icon) in the footer and on the install card.
- **Style: warm & modern.** Warm off-white/cream backgrounds, one rich primary accent (deep plum or royal blue, your choice), and a muted gold secondary for highlights and success moments. Soft rounded corners (12–16px), generous spacing, gentle shadows.
- **Typography:** a friendly serif for headings (e.g. Fraunces or Lora) and a clean sans for body and UI (e.g. Inter or DM Sans). Body text at least 16px.
- **Light and dark mode** for every screen. In dark mode use a warm charcoal (not pure black), and keep the accent and gold legible.
- **Viewport:** 390×844 phone frames. Single column, with the primary action in a sticky bottom bar where the form is long. Touch targets at least 44px. Meet WCAG AA contrast.
- Build a small, reusable component set (buttons, inputs, selectable cards, chips, banners, a toast) so it scales. This flow will grow into a full church lifestyle app (updates, devotionals, events) later.

## Screens & states

### 1. Claim — "Update your details" (`/profile`)
- Church logo and name, the headline "Welcome! Let's update your details", and one line of explanation: "We'll send you a secure link. No password needed."
- A segmented toggle: **Email** | **Phone**.
  - Email: an email input.
  - Phone: a country-code selector defaulting to 🇳🇬 +234, plus a phone number input.
- Primary button: "Send my link". Show a loading state on the button.
- A small privacy reassurance line under the button.
- States: default, validation error (invalid email or phone), submitting.

### 2. Check your inbox
- A friendly illustration or icon (envelope, or a phone/SMS if they used phone).
- "Check your email" / "Check your messages", followed by: "If we have your details, we've sent a secure link to **s•••@example.com**. It expires in 30 minutes."
- A **"Resend link"** button with a visible 60-second countdown. Show two states: disabled with "Resend in 0:42", and enabled.
- A "Use a different email or phone" text link back to screen 1.

### 3. Link problems (two variants)
- **Expired:** a clock icon, "This link has expired", "Links are valid for 30 minutes and can only be used once.", and the primary button "Request a new link".
- **Invalid:** a broken-link icon, "This link isn't valid", "It may have already been used.", and the primary button "Request a new link".
- Keep the tone calm and non-blaming.

### 4. Profile form (`/profile/[token]`), the main screen
- A loading skeleton state while the profile is fetched.
- A header greeting with the pre-filled name: "Hi Sarah 👋 Please check your details are correct."
- Fields are **pre-filled** from the record:
  - **Personal:** First name*, Last name*, Gender (three pill radios: Male / Female / Other), Date of birth (native-friendly date picker).
  - **Contact:** Email, Phone (+234), Address (a single multi-line field).
  - **Your role at church:** Membership status as **selectable cards** (not a dropdown), each with a short description:
    - Visitor: first-time or occasional guest
    - Member: regular part of the congregation
    - Worker: serves in a church department
    - Leader: department head, cell leader or elder
    - Pastor: ordained minister or pastoral staff
- **Departments section, conditional on status.** Show it as a grid of selectable chips/cards (name plus one-line description), for example Choir, Media & Tech, Ushers & Protocol, Children's Ministry.
  - **Worker:** the section is visible and **required**, titled "Which department(s) do you serve in?", with an error state if none are selected.
  - **Leader / Pastor:** the section is visible and **optional**, with the helper text "Select any departments you lead or serve in (optional)."
  - **Visitor / Member:** the section is hidden. Animate it collapsing and expanding.
- Sticky bottom bar with the primary button **"Save & continue"**. Show default, loading and disabled states.
- Show these variants: Worker with 2 departments selected; Visitor with departments hidden; Worker with the "select at least one" error; and a field validation error on Last name.
- A generic error toast: "Something went wrong. Please try again."

### 5. Success + install the app
- A celebratory but tasteful moment: a check mark in a gold or accent circle, perhaps a subtle confetti or dove motif.
- "You're all set, Sarah!" and "Thank you for keeping your details up to date with Abiding Word Of Grace Missions."
- A summary card: name, status badge (e.g. "Worker"), and department chips.
- An **install card**: "Stay connected. Add the app to your home screen for church updates, devotionals and events." Show three variants:
  - **Android/Chrome:** the primary button "Install app" and a "Maybe later" text link.
  - **iOS Safari:** no button. Instead, a short 2-step visual guide: "Tap **Share** ⬆️, then **Add to Home Screen** ➕", with small inline icons.
  - **Already installed / unsupported browser:** the card is replaced by a simple "You can close this page" message.

## Copy & tone
Warm, plain English, short sentences. Address the member by first name once it is known. Avoid jargon such as "token", "authenticate" or "magic link" in the UI; say "secure link".
