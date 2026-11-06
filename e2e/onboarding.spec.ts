import { expect, test } from "@playwright/test";

// Runs against scripts/dove-stub.ts. Tokens are documented at the top of that file.

// Wait for hydration before typing, otherwise React can re-apply default values mid-fill.
test.beforeEach(async ({ page }) => {
  const goto = page.goto.bind(page);
  page.goto = async (url, options) => {
    const response = await goto(url, options);
    await page.waitForLoadState("networkidle");
    return response;
  };
});

test.describe("claim", () => {
  test("validates the email, then shows the check-your-email screen", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("PKA Amazing Grace Bible Church")).toBeVisible();

    await page.getByLabel("Email address").fill("sarah@");
    await page.getByRole("button", { name: "Send my link" }).click();
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();

    await page.getByLabel("Email address").fill("sarah.adeyemi@example.com");
    await page.getByRole("button", { name: "Send my link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByText("s•••@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();

    await page.getByRole("button", { name: "Use a different email" }).click();
    await expect(page.getByLabel("Email address")).toHaveValue("sarah.adeyemi@example.com");
  });
});

test.describe("link problems", () => {
  test("expired link", async ({ page }) => {
    await page.goto("/profile/expired-link");
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    await page.getByRole("link", { name: "Request a new link" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test("used or invalid link", async ({ page }) => {
    await page.goto("/profile/already-used");
    await expect(page.getByRole("heading", { name: "This link isn't valid" })).toBeVisible();
  });
});

test.describe("profile form", () => {
  test("existing member saves and sees the success screen", async ({ page }) => {
    await page.goto("/profile/member-sarah");
    await expect(page.getByRole("heading", { name: /Hi Sarah/ })).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveValue("Sarah");
    await expect(page.getByLabel("Phone number")).toHaveValue("803 456 7890");

    await page.getByRole("button", { name: "Continue" }).click();
    // Sarah already has a PIN, so the PIN step offers to keep it.
    await expect(page.getByRole("heading", { name: "Choose a new PIN" })).toBeVisible();
    await page.getByRole("button", { name: "Keep my current PIN" }).click();
    await expect(page.getByRole("heading", { name: "You're all set, Sarah!" })).toBeVisible();
    // The used link is dropped from the address bar.
    await expect(page).toHaveURL(/\/$/);
    const details = page.getByRole("region", { name: "Your details" });
    await expect(details.getByText("Worker")).toBeVisible();
    await expect(details.getByText("Media & Tech")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Save our WhatsApp number" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stay connected" })).toBeVisible();
  });

  test("new visitor starts with empty names and must fill them in", async ({ page }) => {
    await page.goto("/profile/new-visitor");
    await expect(page.getByRole("heading", { name: /Welcome!/ })).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveValue("");
    await expect(page.getByLabel("First name")).toBeFocused();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Please enter your first name.")).toBeVisible();
    await expect(page.getByLabel("First name")).toBeFocused();
  });

  test("workers must choose a department; visitors don't see the section", async ({ page }) => {
    await page.goto("/profile/new-visitor");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Obi");

    const departments = page.getByRole("group", { name: /Which department/ });
    await expect(departments).toBeHidden();

    await page.getByText("Worker", { exact: true }).click();
    await expect(departments).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Please select at least one department.")).toBeVisible();

    await page.getByText("Choir", { exact: true }).click();
    await expect(page.getByText("Please select at least one department.")).toBeHidden();

    await page.getByText("Visitor", { exact: true }).click();
    await expect(departments).toBeHidden();
  });

  test("leaders see departments as optional", async ({ page }) => {
    await page.goto("/profile/leader-no-dept");
    await expect(page.getByRole("group", { name: "Your departments" })).toBeVisible();
    await expect(page.getByText("Select any departments you lead or serve in (optional).")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page.getByRole("heading", { name: "You're all set, John!" })).toBeVisible();
  });

  test("a server error keeps what was typed", async ({ page }) => {
    await page.goto("/profile/member-sarah");
    await page.getByLabel("First name").fill("Fail");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Keep my current PIN" }).click();
    await expect(page.getByRole("alert").getByText("Something went wrong. Please try again.")).toBeVisible();

    await page.getByRole("button", { name: "Back to my details" }).click();
    await expect(page.getByLabel("First name")).toHaveValue("Fail");
  });
});

test.describe("PIN setup", () => {
  async function fillLeader(page: import("@playwright/test").Page) {
    await page.goto("/profile/leader-no-dept");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Create a 4-digit PIN" })).toBeVisible();
  }

  test("checks the PIN before saving", async ({ page }) => {
    await fillLeader(page);
    const save = page.getByRole("button", { name: "Save PIN & finish" });

    await save.click();
    await expect(page.getByText("Your PIN must be exactly 4 digits.")).toBeVisible();

    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByLabel("Confirm PIN").fill("1234");
    await save.click();
    await expect(page.getByText("That PIN is too easy to guess.")).toBeVisible();

    await page.getByLabel("PIN", { exact: true }).fill("4729");
    await page.getByLabel("Confirm PIN").fill("4728");
    await save.click();
    await expect(page.getByText("The PINs don't match.")).toBeVisible();
  });

  test("only accepts digits", async ({ page }) => {
    await fillLeader(page);
    await page.getByLabel("PIN", { exact: true }).pressSequentially("4a7b2c9d5");
    await expect(page.getByLabel("PIN", { exact: true })).toHaveValue("4729");
  });

  test("saving a PIN finishes onboarding and signs the member in", async ({ page }) => {
    await fillLeader(page);
    await page.getByLabel("PIN", { exact: true }).fill("4729");
    await page.getByLabel("Confirm PIN").fill("4729");
    await page.getByRole("button", { name: "Save PIN & finish" }).click();
    await expect(page.getByRole("heading", { name: "You're all set, John!" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing John," })).toBeVisible();
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Change your PIN" })).toBeVisible();
  });

  test("skipping leaves the member signed out", async ({ page }) => {
    await fillLeader(page);
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page.getByRole("heading", { name: "You're all set, John!" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing," })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("back returns to the details with everything still filled in", async ({ page }) => {
    await page.goto("/profile/leader-no-dept");
    await page.getByLabel("First name").fill("Johnny");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Back to my details" }).click();
    await expect(page.getByLabel("First name")).toHaveValue("Johnny");
  });
});

test.describe("login", () => {
  async function signIn(page: import("@playwright/test").Page, identifier: string, pin: string) {
    await page.goto("/login");
    await page.getByLabel("Phone number or email").fill(identifier);
    await page.getByLabel("PIN", { exact: true }).fill(pin);
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  test("signs in with email and PIN, then signs out", async ({ page }) => {
    await signIn(page, "sarah.adeyemi@example.com", "4729");
    await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing Sarah," })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/account");
    const details = page.getByRole("region", { name: "Your details" });
    await expect(details.getByText("Media & Tech")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sign in" })).toBeVisible();
    // The session is gone: a reload stays signed out.
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("signs in with a local phone number", async ({ page }) => {
    await signIn(page, "0803 456 7890", "4729");
    await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing Sarah," })).toBeVisible();
  });

  test("shows attempts remaining for a wrong PIN and clears the PIN", async ({ page }) => {
    await signIn(page, "sarah.adeyemi@example.com", "9999");
    await expect(page.getByText("Incorrect PIN. 4 attempts remaining.")).toBeVisible();
    await expect(page.getByLabel("PIN", { exact: true })).toHaveValue("");
  });

  test("unknown account", async ({ page }) => {
    await signIn(page, "nobody@example.com", "4729");
    await expect(page.getByText("We couldn't find a profile with that phone number or email.")).toBeVisible();
  });

  test("member without a PIN is pointed to the email link", async ({ page }) => {
    await signIn(page, "john.okafor@example.com", "4729");
    await expect(page.getByText("You haven't set a PIN yet.")).toBeVisible();
    await page.getByRole("link", { name: "Email me a link" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test("locked account", async ({ page }) => {
    await signIn(page, "locked@example.com", "4729");
    await expect(page.getByRole("alert").getByText(/Too many wrong PINs\. Please try again in 15 minutes/)).toBeVisible();
  });

  test("rate limited", async ({ page }) => {
    await signIn(page, "slow@example.com", "4729");
    await expect(page.getByText("Too many attempts. Please wait a moment and try again.")).toBeVisible();
  });

  test("validates before calling the server", async ({ page }) => {
    await signIn(page, "sarah@", "47");
    await expect(page.getByText("That doesn't look like a phone number or email.")).toBeVisible();
    await expect(page.getByText("Please enter your 4-digit PIN.")).toBeVisible();
  });

  test("forgot PIN goes to the email link flow", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot your PIN? Sign in with email" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });
});

test.describe("change PIN when signed in", () => {
  test("changes the PIN with the current one", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Phone number or email").fill("sarah.adeyemi@example.com");
    await page.getByLabel("PIN", { exact: true }).fill("4729");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing Sarah," })).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "Change your PIN" }).click();
    await page.getByLabel("Current PIN").fill("0000");
    await page.getByLabel("New PIN", { exact: true }).fill("8153");
    await page.getByLabel("Confirm new PIN").fill("8153");
    await page.getByRole("button", { name: "Save PIN" }).click();
    await expect(page.getByText("That isn't your current PIN. 4 attempts remaining.")).toBeVisible();

    await page.getByLabel("Current PIN").fill("4729");
    await page.getByRole("button", { name: "Save PIN" }).click();
    await expect(page.getByText("Your PIN is saved.")).toBeVisible();
  });
});

test("signed-out home page offers sign in, the profile update and install card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing," })).toBeVisible();
  await expect(page.getByRole("link", { name: "Update my details" })).toHaveAttribute("href", "/profile");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("heading", { name: "Stay connected" })).toBeVisible();
});
