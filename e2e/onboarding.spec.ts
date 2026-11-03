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

    await page.getByRole("button", { name: "Save & continue" }).click();
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

    await page.getByRole("button", { name: "Save & continue" }).click();
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
    await page.getByRole("button", { name: "Save & continue" }).click();
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
    await page.getByRole("button", { name: "Save & continue" }).click();
    await expect(page.getByRole("heading", { name: "You're all set, John!" })).toBeVisible();
  });

  test("a server error shows a toast and keeps what was typed", async ({ page }) => {
    await page.goto("/profile/member-sarah");
    await page.getByLabel("First name").fill("Fail");
    await page.getByRole("button", { name: "Save & continue" }).click();
    await expect(page.getByRole("status").getByText("Something went wrong. Please try again.")).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveValue("Fail");
  });
});

test("home page offers the profile update and install card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Amazing Grace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Update my details" })).toHaveAttribute("href", "/profile");
  await expect(page.getByRole("heading", { name: "Stay connected" })).toBeVisible();
});
