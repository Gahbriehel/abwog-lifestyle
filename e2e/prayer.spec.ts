import { expect, test } from "@playwright/test";

test.describe("prayer requests (no sign-in)", () => {
  test("home card leads to the form and a request can be sent", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Send a prayer request" }).click();
    await expect(page).toHaveURL(/\/prayer$/);
    await expect(page.getByRole("heading", { level: 1, name: "Prayer" })).toBeVisible();

    await page.getByLabel("Your name").fill("Sarah Adeyemi");
    await page.getByLabel("Email address").fill("sarah@example.com");
    await page.getByLabel("Category").selectOption("Healing & Health");
    await page.getByLabel("Your prayer request").fill("Please pray for my mother's recovery.");
    await page.getByText("Private", { exact: true }).click();
    await page.getByRole("button", { name: "Send prayer request" }).click();

    await expect(page.getByRole("heading", { name: "We've received your request" })).toBeVisible();
    await page.getByRole("button", { name: "Send another request" }).click();
    await expect(page.getByLabel("Your prayer request")).toHaveValue("");
  });

  test("asks for the missing details", async ({ page }) => {
    await page.goto("/prayer");
    await page.getByRole("button", { name: "Send prayer request" }).click();
    await expect(page.getByText("Please enter your name.")).toBeVisible();
    await expect(page.getByText("Please enter your email address.")).toBeVisible();
    await expect(page.getByText("Please write your prayer request.")).toBeVisible();
  });

  test("a server error keeps what was typed", async ({ page }) => {
    await page.goto("/prayer");
    await page.getByLabel("Your name").fill("Sarah Adeyemi");
    await page.getByLabel("Email address").fill("sarah@example.com");
    await page.getByLabel("Your prayer request").fill("Fail please");
    await page.getByRole("button", { name: "Send prayer request" }).click();
    await expect(page.getByText("We couldn't send your request. Please try again.")).toBeVisible();
    await expect(page.getByLabel("Your prayer request")).toHaveValue("Fail please");
  });
});
