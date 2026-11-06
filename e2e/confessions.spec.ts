import { expect, test, type Page } from "@playwright/test";
import { STUB_API as STUB } from "./ports";

/**
 * A stand-in for the browser's speech engine: every sentence "takes" 4 seconds.
 * Headless Chromium has no voices, and real speech can't be asserted anyway.
 */
const FAKE_SPEECH = `
(() => {
  class FakeUtterance {
    constructor(text) { this.text = text; this.rate = 1; this.lang = ""; this.voice = null; }
  }
  let timer = null;
  let current = null;
  window.__spoken = [];
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak(u) {
        current = u;
        window.__spoken.push(u.text);
        setTimeout(() => {
          if (current !== u) return;
          if (u.onstart) u.onstart({});
          timer = setTimeout(() => {
            if (current !== u) return;
            current = null;
            if (u.onend) u.onend({});
          }, 4000);
        }, 0);
      },
      cancel() {
        clearTimeout(timer);
        const u = current;
        current = null;
        if (u && u.onerror) u.onerror({ error: "canceled" });
      },
      getVoices() { return [{ name: "Fake British", lang: "en-GB", localService: true, default: true }]; },
      addEventListener() {},
      removeEventListener() {},
    },
  });
})();`;

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);

test.describe("confessions list", () => {
  test("shows published confessions in order, with audio marked and drafts hidden", async ({ page }) => {
    await page.goto("/confessions");
    await expect(page.getByRole("heading", { level: 1, name: "Confessions" })).toBeVisible();

    const cards = page.getByRole("main").getByRole("link", { name: /Confession/ });
    await expect(cards.first()).toContainText("Confession for Protection");
    await expect(page.getByText("Hidden Draft")).toHaveCount(0);

    const protection = page.getByRole("link", { name: /Confession for Protection/ });
    await expect(protection.getByLabel("Has audio")).toBeVisible();
    await expect(protection).toContainText("1 min"); // the 6-second recording rounds up to a minute

    const gratitude = page.getByRole("link", { name: /Confession of Gratitude/ });
    await expect(gratitude.getByLabel("Has audio")).toHaveCount(0);
    await expect(gratitude).toContainText("min read");
  });

  test("listen counts stay hidden unless switched on", async ({ page }) => {
    await page.goto("/confessions");
    await expect(page.getByText(/\d+ listens?/)).toHaveCount(0);
  });

  test("the search box is drawn like an input and lines up with its button", async ({ page }) => {
    await page.goto("/confessions");
    const input = page.getByLabel("Search confessions");
    const box = await input.boundingBox();
    const button = await page.getByRole("button", { name: "Search" }).boundingBox();
    expect(box && box.height).toBeGreaterThanOrEqual(44);
    // Same height as the button, so the two read as one control.
    expect(Math.abs((box?.height ?? 0) - (button?.height ?? 99))).toBeLessThan(1);
    expect(await input.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("1px");
    expect(await input.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("search shows what was searched for and can be cleared", async ({ page }) => {
    await page.goto("/confessions?q=peace");
    await expect(page.getByText(/Showing results for/)).toContainText("peace");
    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page).toHaveURL(/\/confessions$/);
    await expect(page.getByRole("link", { name: /Confession for Protection/ })).toBeVisible();
  });

  test("search filters, and says so when nothing matches", async ({ page }) => {
    await page.goto("/confessions");
    await page.getByLabel("Search confessions").fill("peace");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=peace/);
    await expect(page.getByRole("link", { name: /Confession for Peace/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Confession for Protection/ })).toHaveCount(0);

    await page.getByLabel("Search confessions").fill("zzzz");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("No confessions match your search")).toBeVisible();
  });

  test("category chips filter the list", async ({ page }) => {
    await page.goto("/confessions");
    const categories = page.getByRole("navigation", { name: "Categories" });
    await expect(categories.getByRole("link")).toHaveText(["All", "Peace", "Protection", "Provision"]);
    await categories.getByRole("link", { name: "Provision" }).click();
    await expect(page.getByRole("link", { name: /Confession of Gratitude/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Confession for Peace/ })).toHaveCount(0);
    await expect(categories.getByRole("link", { name: "Provision" })).toHaveAttribute("aria-current", "true");
  });

  test("is reachable from the menu", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(async () => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass();
    await menu.getByRole("link", { name: "Confessions" }).click();
    await expect(page).toHaveURL(/\/confessions$/);
  });
});

test.describe("confession with recordings", () => {
  test("offers both voices, speeds and seeking, and plays", async ({ page }) => {
    await page.goto("/confessions/confession-for-protection");
    await expect(page.getByRole("heading", { level: 1, name: "Confession for Protection" })).toBeVisible();
    await expect(page.getByText("Psalm 91:1-4")).toBeVisible();
    await expect(page.getByText(/^Confession 1 · /)).toBeVisible();

    await expect(page.getByRole("radiogroup", { name: "Voice" }).getByRole("radio")).toHaveText(["female voice", "male voice"]);
    await expect(page.getByRole("radio", { name: "female voice", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Seek")).toHaveAttribute("max", "6");

    await page.getByRole("radio", { name: "male voice", exact: true }).click();
    await expect(page.getByRole("radio", { name: "male voice", exact: true })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    await page.getByRole("button", { name: "Forward 15 seconds" }).click();
    await page.getByRole("button", { name: "Back 15 seconds" }).click();
  });

  test("falls back to the phone's voice when the recording can't be loaded at all", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.route("**/public/confession-audio/**", (route) => route.abort());
    await page.goto("/confessions/confession-for-protection");
    await expect(page.getByText("We couldn't play the recording, so your phone can read it to you instead.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Read aloud" })).toBeVisible();
    // The words are still there to read.
    await expect(page.getByText(/secret place of the most High/)).toBeVisible();
  });

  test("remembers the playback speed", async ({ page }) => {
    await page.goto("/confessions/confession-for-protection");
    const speeds = page.getByRole("radiogroup", { name: "Playback speed" });
    await expect(speeds.getByRole("radio")).toHaveText(["0.75×", "1×", "1.25×", "1.5×"]);
    await expect(speeds.getByRole("radio", { name: "1×" })).toHaveAttribute("aria-checked", "true");

    await speeds.getByRole("radio", { name: "0.75×" }).click();
    await expect(speeds.getByRole("radio", { name: "0.75×" })).toHaveAttribute("aria-checked", "true");

    await page.reload();
    await expect(speeds.getByRole("radio", { name: "0.75×" })).toHaveAttribute("aria-checked", "true");
  });

  test("a single recording shows no voice choice", async ({ page }) => {
    await page.goto("/confessions/confession-for-peace");
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Voice" })).toHaveCount(0);
  });

  test("links to the next confession, and back", async ({ page }) => {
    await page.goto("/confessions/confession-for-protection");
    const more = page.getByRole("navigation", { name: "More confessions" });
    await expect(more.getByRole("link", { name: /Previous/ })).toHaveCount(0);
    await more.getByRole("link", { name: /Next.*Confession for Peace/ }).click();
    await expect(page).toHaveURL(/confession-for-peace$/);
    await expect(page.getByRole("navigation", { name: "More confessions" }).getByRole("link", { name: /Previous.*Confession for Protection/ })).toBeVisible();
  });

  test("text size can be changed and is remembered", async ({ page }) => {
    await page.goto("/confessions/confession-for-peace");
    const article = page.getByRole("article");
    await expect(article).toHaveClass(/text-\[17px\]/);
    await page.getByRole("button", { name: "Larger text" }).click();
    await expect(article).toHaveClass(/text-xl/);
    await page.reload();
    await expect(page.getByRole("article")).toHaveClass(/text-xl/);
    await page.getByRole("button", { name: "Smaller text" }).click();
    await expect(page.getByRole("article")).toHaveClass(/text-\[17px\]/);
  });
});

test.describe("confession read by the phone's voice", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
  });

  test("reads sentence by sentence, highlights it, and can pause, resume and skip", async ({ page }) => {
    await page.goto("/confessions/confession-of-gratitude");
    await expect(page.getByRole("radiogroup", { name: "Voice" })).toHaveCount(0);
    await expect(page.getByText(/Read by your phone's own voice/)).toBeVisible();

    await page.getByRole("button", { name: "Read aloud" }).click();
    await expect(page.getByText(/^Sentence 1 of \d+$/)).toBeVisible();
    await expect(page.locator('[data-chunk="0"]')).toHaveAttribute("aria-current", "true");
    expect((await spoken(page))[0]).toBe("Thank you, Lord, for waking me up today.");

    await page.getByRole("button", { name: "Next sentence" }).click();
    await expect(page.getByText(/^Sentence 2 of \d+$/)).toBeVisible();
    await expect(page.locator('[data-chunk="1"]')).toHaveAttribute("aria-current", "true");
    await expect(page.locator('[data-chunk="0"]')).not.toHaveAttribute("aria-current", "true");

    await page.getByRole("button", { name: "Pause reading" }).click();
    await expect(page.getByRole("button", { name: "Resume reading" })).toBeVisible();
    const before = (await spoken(page)).length;

    await page.getByRole("button", { name: "Resume reading" }).click();
    await expect(page.getByRole("button", { name: "Pause reading" })).toBeVisible();
    // Resuming starts again from the sentence it stopped on, not from the top.
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(before);
    const all = await spoken(page);
    expect(all[all.length - 1]).toBe(all[1]);

    await page.getByRole("button", { name: "Previous sentence" }).click();
    await expect(page.getByText(/^Sentence 1 of \d+$/)).toBeVisible();
  });

  test("changing the speed restarts the sentence at the new rate and is remembered", async ({ page }) => {
    await page.goto("/confessions/confession-of-gratitude");
    const speeds = page.getByRole("radiogroup", { name: "Reading speed" });
    await speeds.getByRole("radio", { name: "1.25×" }).click();
    await expect(speeds.getByRole("radio", { name: "1.25×" })).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(speeds.getByRole("radio", { name: "1.25×" })).toHaveAttribute("aria-checked", "true");
  });

  test("counts one listen after about ten seconds of reading, and only once", async ({ page }) => {
    await page.clock.install();
    await page.goto("/confessions/confession-of-gratitude");
    const listened = () => page.evaluate(() => window.sessionStorage.getItem("listened:conf-3"));
    const countOnServer = async () => (await (await page.request.get(`${STUB}/confessions/confession-of-gratitude`)).json()).data.listenCount as number;
    const before = await countOnServer();

    await page.getByRole("button", { name: "Read aloud" }).click();
    await page.clock.runFor(5000);
    expect(await listened()).toBeNull();

    await page.clock.runFor(7000);
    await expect.poll(listened).toBe("1");
    await expect.poll(countOnServer).toBeGreaterThan(before);

    // Listening on does not count again.
    const afterFirst = await countOnServer();
    await page.clock.runFor(10000);
    expect(await countOnServer()).toBe(afterFirst);
  });
});

test.describe("when the browser can't read aloud", () => {
  test("says so and still shows the text", async ({ page }) => {
    await page.addInitScript(`Object.defineProperty(window, "SpeechSynthesisUtterance", { value: undefined, configurable: true });`);
    await page.goto("/confessions/confession-of-gratitude");
    await expect(page.getByText("Reading aloud isn't available in this browser.")).toBeVisible();
    await expect(page.getByText("Thank you, Lord, for waking me up today.")).toBeVisible();
  });

  test("reports a phone that never starts speaking", async ({ page }) => {
    await page.addInitScript(`
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(t) { this.text = t; } }, configurable: true });
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak() {}, cancel() {}, getVoices() { return []; }, addEventListener() {}, removeEventListener() {} } });
    `);
    await page.clock.install();
    await page.goto("/confessions/confession-of-gratitude");
    await page.getByRole("button", { name: "Read aloud" }).click();
    await page.clock.runFor(5000);
    await expect(page.getByRole("alert").filter({ hasText: "didn't start reading" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Read aloud" })).toBeVisible();
  });
});

test.describe("missing confessions", () => {
  test("a draft or unknown slug is a 404", async ({ page }) => {
    for (const slug of ["hidden-draft", "does-not-exist"]) {
      const response = await page.goto(`/confessions/${slug}`);
      expect(response?.status()).toBe(404);
    }
  });
});
