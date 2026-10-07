import { test, expect, expectNotErrorPage } from "./fixtures";

test("Ratgeber-Übersicht listet Artikel", async ({ page }) => {
  await page.goto("/ratgeber");
  await expectNotErrorPage(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const links = page.locator('main a[href^="/ratgeber/"]');
  expect(await links.count()).toBeGreaterThan(5);
});

test("einzelner Artikel: Überschrift, Inhaltsverzeichnis, Text, CTA", async ({ page }) => {
  await page.goto("/ratgeber");
  const first = page.locator('main a[href^="/ratgeber/"]').first();
  const href = await first.getAttribute("href");
  await first.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expectNotErrorPage(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Inhaltsverzeichnis").or(page.locator("article h2")).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Immobilie gefunden?" })).toBeVisible();
});

test("alle Ratgeber-Artikel laden ohne Fehler", async ({ page, request }) => {
  test.setTimeout(180_000);
  await page.goto("/ratgeber");
  const hrefs = [...new Set(await page.locator('main a[href^="/ratgeber/"]').evaluateAll((els) => els.map((a) => a.getAttribute("href")!)))];
  expect(hrefs.length).toBeGreaterThan(5);

  for (const href of hrefs) {
    await test.step(href, async () => {
      // Erst per HTTP (schnell, prüft 404), dann im Browser (prüft Rendering + Konsole).
      const res = await request.get(href);
      expect.soft(res.status(), `${href} HTTP-Status`).toBe(200);
      await page.goto(href);
      await expect.soft(page.getByRole("heading", { level: 1 }), `${href} H1`).toBeVisible();
      await expect.soft(page.getByRole("heading", { name: "Nicht gefunden" }), `${href} 404-Ansicht`).toHaveCount(0);
    });
  }
});
