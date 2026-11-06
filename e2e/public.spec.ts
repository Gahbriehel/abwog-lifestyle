import { expect, test } from "@playwright/test";

test.describe("public screens (no sign-in)", () => {
  test("home greets guests and lists upcoming events", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing," })).toBeVisible();
    await expect(page.getByRole("link", { name: /Night of Encounter/ })).toBeVisible();
    // Ended events never show.
    await expect(page.getByText("Easter Outreach")).toHaveCount(0);

    const tabs = page.getByRole("navigation", { name: "Main" });
    await expect(tabs.getByRole("link")).toHaveText(["Home", "Events", "Sign in"]);
    await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  test("menu reaches the giving page", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("navigation", { name: "Menu" });
    // The page can be clicked before it has finished loading its scripts, so retry until the menu opens.
    await expect(async () => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass();
    await menu.getByRole("link", { name: "Give" }).click();
    await expect(page).toHaveURL(/\/give$/);
    await expect(page.getByRole("heading", { level: 1, name: "Give" })).toBeVisible();
    // Tithe is the default purpose: Naira account first, then the USD one.
    await expect(page.getByRole("region", { name: "Tithes & Offerings" }).getByText("0123456789")).toBeVisible();
    await expect(page.getByRole("region", { name: "Missions (USD)" }).getByText("USD", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Building Project" })).toHaveCount(0);

    await page.getByRole("navigation", { name: "Giving purpose" }).getByRole("link", { name: /Building fund/ }).click();
    await expect(page).toHaveURL(/purpose=BUILDING/);
    await expect(page.getByRole("region", { name: "Building Project" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Tithes & Offerings" })).toHaveCount(0);
  });

  test("events list shows upcoming events only", async ({ page }) => {
    await page.goto("/events");
    await expect(page.getByRole("link", { name: /Youth Conference 2026/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sunday Celebration Service/ })).toBeVisible();
    await expect(page.getByText("Easter Outreach")).toHaveCount(0);
  });

  test("event states: open, no registration needed, full, ended", async ({ page }) => {
    await page.goto("/events/event-youth");
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
    await expect(page.getByText("Team games and leaderboard")).toBeVisible();

    await page.goto("/events/event-sunday");
    await expect(page.getByText(/Everyone is welcome/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toHaveCount(0);

    await page.goto("/events/event-full");
    await expect(page.getByText(/This event is full/)).toBeVisible();

    await page.goto("/events/event-ended");
    await expect(page.getByText("This event has ended.")).toBeVisible();

    // A closed event can't be registered for even by typing the URL.
    await page.goto("/events/event-full/register");
    await expect(page).toHaveURL(/\/events\/event-full$/);
  });

  test("registering shows the QR confirmation", async ({ page }) => {
    await page.goto("/events/event-youth/register");
    await page.getByRole("button", { name: "Complete registration" }).click();
    await expect(page.getByText("Please enter your first name.")).toBeVisible();

    await page.getByLabel(/First name/).fill("Ada");
    await page.getByLabel(/Last name/).fill("Obi");
    await page.getByRole("button", { name: "Complete registration" }).click();
    await expect(page.getByText("Please enter an email address or a phone number.")).toBeVisible();

    await page.getByLabel("Email address").fill("ada@example.com");
    await page.getByRole("button", { name: "Complete registration" }).click();
    await expect(page.getByRole("heading", { name: "You're registered!" })).toBeVisible();
    await expect(page.getByText(/REG-2026-/)).toBeVisible();
    await expect(page.getByText("Team Grace")).toBeVisible();
    await expect(page.getByRole("img", { name: /Check-in QR code/ })).toBeVisible();
  });

  test("registering twice shows the existing registration", async ({ page }) => {
    await page.goto("/events/event-youth/register");
    await page.getByLabel(/First name/).fill("Ada");
    await page.getByLabel(/Last name/).fill("Obi");
    await page.getByLabel("Email address").fill("dupe@example.com");
    await page.getByRole("button", { name: "Complete registration" }).click();
    await expect(page.getByRole("heading", { name: "You're already registered" })).toBeVisible();
    await expect(page.getByText("REG-2026-0007")).toBeVisible();
  });

  test("a server error keeps the form and shows a message", async ({ page }) => {
    await page.goto("/events/event-youth/register");
    await page.getByLabel(/First name/).fill("Fail");
    await page.getByLabel(/Last name/).fill("Obi");
    await page.getByLabel("Email address").fill("ada@example.com");
    await page.getByRole("button", { name: "Complete registration" }).click();
    await expect(page.getByText(/couldn.t complete your registration/)).toBeVisible();
    await expect(page.getByLabel(/First name/)).toHaveValue("Fail");
  });

  test("signing in changes the greeting and tabs, and prefills registration", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Phone number or email").fill("sarah.adeyemi@example.com");
    await page.getByLabel("PIN").fill("4729");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Hello Amazing Sarah," })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link")).toHaveText(["Home", "Events", "Account"]);

    await page.goto("/events/event-youth/register");
    await expect(page.getByLabel(/First name/)).toHaveValue("Sarah");
    await expect(page.getByLabel("Email address")).toHaveValue("sarah.adeyemi@example.com");

    await page.goto("/account");
    await expect(page.getByRole("region", { name: "Your details" })).toBeVisible();
  });

  test("account redirects guests to sign in", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login$/);
  });
});
