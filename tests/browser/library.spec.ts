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
  await expect.poll(() => page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.some(r => r.active?.state === "activated" && !r.installing);
  }), { timeout: 30000 }).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
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
  await page
    .getByLabel("Import Guitar Pro files")
    .setInputFiles({
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
