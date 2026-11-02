import { test, expect } from "@playwright/test";
test("imports, renders, plays and retains an arrangement offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Your music. Your pace." }),
  ).toBeVisible();
  await page
    .getByLabel("Import Guitar Pro files")
    .setInputFiles("fixtures/first-light.gp");
  await expect(page.getByRole("status")).toContainText(
    "1 arrangement imported",
    { timeout: 30000 },
  );
  await page
    .getByRole("button", { name: "Favourite First light", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unfavourite First light", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search title or artist").fill("Fretless");
  await page
    .getByRole("button", { name: "First light Fretless", exact: true })
    .click();
  await expect(page.locator(".at-surface")).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Playback position")).not.toHaveValue("0", {
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.locator(".speed select").selectOption("0.5");
  await page.getByRole("button", { name: "Loop", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Loop", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Metronome", exact: true }).click();
  await page
    .getByRole("button", { name: "Practice mode", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/player-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Exit practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Library", exact: true })
    .first()
    .click();
  // A newly activated worker controls the next navigation. Waiting for it to
  // claim the current document would hang with Workbox's default lifecycle.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          return registrations.some(
            (r) => r.active?.state === "activated" && !r.installing,
          );
        }),
      { timeout: 30000 },
    )
    .toBe(true);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "First light Fretless", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "First light Fretless", exact: true })
    .click();
  await expect(page.locator(".at-surface")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByLabel("Playback position")).not.toHaveValue("0");
  expect(errors).toEqual([]);
});
test("handles corrupt imports and narrow layouts", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel("Import Guitar Pro files").setInputFiles({
    name: "broken.gp",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("broken"),
  });
  await expect(page.getByRole("alert")).toContainText("could not be read");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/library-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("imports a URL, preserves its source and prevents duplicates", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  await page.route("https://example.com/first-light.gp", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/octet-stream",
      headers: { "access-control-allow-origin": "*" },
      body: readFileSync("fixtures/first-light.gp"),
    }),
  );
  await page.goto("./");
  await page
    .getByRole("button", { name: "Import from URL", exact: true })
    .click();
  await page
    .getByLabel("Paste a tab link")
    .fill("https://example.com/first-light.gp");
  await page.getByRole("button", { name: "Import URL", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Imported “First light” from URL.",
  );
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Source for First light" }),
  ).toHaveAttribute("href", "https://example.com/first-light.gp");
  await page
    .getByRole("button", { name: "Import from URL", exact: true })
    .click();
  await page
    .getByLabel("Paste a tab link")
    .fill("https://example.com/first-light.gp");
  await page.getByRole("button", { name: "Import URL", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "already in your library",
  );
  await expect(
    page.getByRole("button", { name: "First light Fretless", exact: true }),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("accepts dropped Songsterr links and explains the official download route", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator(".app").dispatchEvent("drop", {
    dataTransfer: await page.evaluateHandle(() => {
      const data = new DataTransfer();
      data.setData(
        "text/uri-list",
        "https://www.songsterr.com/a/wsa/guns-n-roses-sweet-child-o-mine-tab-s23",
      );
      return data;
    }),
  });
  await expect(
    page.getByText("Songsterr link detected", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open on Songsterr" }),
  ).toHaveAttribute(
    "href",
    "https://www.songsterr.com/a/wsa/guns-n-roses-sweet-child-o-mine-tab-s23",
  );
  await expect(
    page.getByRole("button", { name: "Import URL", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("converts pasted text, plays it and remembers grid and notation preferences", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Paste tab text", exact: true })
    .click();
  await page
    .getByLabel("Title (optional)", { exact: true })
    .fill("Evening exercise");
  await page
    .getByLabel("Tab text", { exact: true })
    .fill(
      "Tempo: 96\n[Intro]\ne|----------------|\nB|----------------|\nG|----------------|\nD|--2---4---5---7--|\nA|----------------|\nE|----------------|",
    );
  await page
    .getByRole("button", { name: "Convert and save tab", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Converted and saved");
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Grid", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", {
      name: "Evening exercise Unknown artist",
      exact: true,
    })
    .click();
  await expect(page.locator(".at-surface")).toBeVisible();
  await expect(
    page.getByText(/Timing is estimated from text spacing/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByLabel("Playback position")).not.toHaveValue("0");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.getByLabel("Display", { exact: true }).selectOption("tabs");
  await page.getByLabel("Layout", { exact: true }).selectOption("horizontal");
  await page
    .getByRole("button", { name: "Loop current measure", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Loop", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Library", exact: true })
    .first()
    .click();
  await page.reload();
  await page
    .getByRole("button", {
      name: "Evening exercise Unknown artist",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Display", { exact: true })).toHaveValue("tabs");
  await expect(page.getByLabel("Layout", { exact: true })).toHaveValue(
    "horizontal",
  );
  await page.getByLabel("Layout", { exact: true }).selectOption("page");
  await page
    .getByRole("button", { name: "Practice mode", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/text-tab-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const rs = await navigator.serviceWorker.getRegistrations();
        return rs.some((r) => r.active?.state === "activated");
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", {
      name: "Evening exercise Unknown artist",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
});
test("settings persist and readable HTML pages become playable text tabs", async ({
  page,
}) => {
  await page.route("https://example.com/text-tab", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "access-control-allow-origin": "*" },
      body: "<title>Public exercise</title><pre>e|--0---2---3--|\nB|------------|\nG|------------|\nD|------------|\nA|------------|\nE|------------|</pre>",
    }),
  );
  await page.goto("./");
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Notation display", { exact: true })
    .selectOption("notation");
  await page.getByLabel("Reduce motion", { exact: true }).check();
  await page.reload();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Notation display", { exact: true }),
  ).toHaveValue("notation");
  await expect(page.getByLabel("Reduce motion", { exact: true })).toBeChecked();
  await page
    .getByRole("button", { name: "Back to library", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Import from URL", exact: true })
    .click();
  await page
    .getByLabel("Paste a tab link")
    .fill("https://example.com/text-tab");
  await page.getByRole("button", { name: "Import URL", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Public exercise");
  await page
    .getByRole("button", {
      name: "Public exercise Unknown artist",
      exact: true,
    })
    .click();
  await expect(page.locator(".at-surface")).toBeVisible();
});
