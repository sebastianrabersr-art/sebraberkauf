import { test, expect, hasCredentials, login, waitForApp, expectNotErrorPage, gotoHydrated, NO_CREDENTIALS_REASON } from "./fixtures";

test.describe("Öffentliche Navigation", () => {
  test("Startseite lädt mit Hero und Link-Eingabe", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kostenlos starten" }).first()).toBeVisible();
  });

  for (const [label, path] of [
    ["Demo", "/demo"],
    ["Rechner", "/rechner"],
    ["Ratgeber", "/ratgeber"],
    ["Preise", "/pricing"],
    ["FAQ", "/faq"],
  ] as const) {
    test(`Header-Link „${label}“ öffnet ${path}`, async ({ page }) => {
      await page.goto("/");
      await page.locator("header nav").getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}(/|$|\\?|#)`));
      await expectNotErrorPage(page);
      await expect(page.getByRole("heading").first()).toBeVisible();
    });
  }

  test.describe("Handy", () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

    test("Menü öffnet alle Bereiche und schließt mit Escape", async ({ page }) => {
      await gotoHydrated(page, "/");
      const toggle = page.getByRole("button", { name: "Menü öffnen" });
      await expect(toggle).toBeVisible();
      await expect(page.locator("header nav").first()).toBeHidden(); // Desktop-Navigation ausgeblendet

      await toggle.tap();
      await expect(page.getByRole("button", { name: "Menü schließen" })).toHaveAttribute("aria-expanded", "true");
      for (const label of ["Features", "Demo", "Rechner", "Ratgeber", "Preise", "FAQ", "Login"]) {
        const link = page.locator("header").getByRole("link", { name: label, exact: true }).last();
        await expect(link, label).toBeVisible();
        expect((await link.boundingBox())!.height, `${label} Touch-Höhe`).toBeGreaterThanOrEqual(44);
      }

      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Menü öffnen" })).toHaveAttribute("aria-expanded", "false");
    });

    test("Menü-Link führt zur Seite und schließt das Menü", async ({ page }) => {
      await gotoHydrated(page, "/");
      await page.getByRole("button", { name: "Menü öffnen" }).tap();
      await page.locator("header").getByRole("link", { name: "Ratgeber", exact: true }).last().tap();
      await expect(page).toHaveURL(/\/ratgeber$/);
      await expect(page.getByRole("button", { name: "Menü öffnen" })).toHaveAttribute("aria-expanded", "false");
    });
  });

  test("unbekannte Seite zeigt die 404-Ansicht", async ({ page, problems }) => {
    const res = await page.goto("/diese-seite-gibt-es-nicht");
    await expect(page.getByRole("heading", { name: "Diese Seite gibt es nicht." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Rechner öffnen" })).toHaveAttribute("href", "/rechner");
    expect(res?.status()).toBe(404);
    problems.http.length = 0; // hier ist der 404 gewollt
    problems.console.length = 0;
  });
});

test.describe("Sidebar (eingeloggt)", () => {
  test.skip(!hasCredentials, NO_CREDENTIALS_REASON);

  test("alle Sidebar-Links öffnen eine funktionierende Seite", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto("/dashboard");
    await waitForApp(page);

    const sidebar = page.locator("aside nav");
    await expect(sidebar).toBeVisible();
    const links = await sidebar.getByRole("link").evaluateAll((els) =>
      els.map((a) => ({ label: (a.textContent ?? "").trim(), href: a.getAttribute("href") ?? "" })),
    );
    expect(links.length, "Sidebar sollte Links enthalten").toBeGreaterThan(5);

    for (const { label, href } of links) {
      await test.step(`${label} → ${href}`, async () => {
        await sidebar.getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(href.replace(/[?]/g, "\\?")));
        await waitForApp(page);
        await expectNotErrorPage(page);
        await expect.soft(page.getByRole("heading").first()).toBeVisible();
      });
    }
  });

  test("Einstellungen und Abmelden stehen fest unten in der Sidebar", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await waitForApp(page);
    const aside = page.locator("aside");
    await expect(aside.getByRole("button", { name: "Abmelden" })).toBeInViewport();
    await aside.getByRole("link", { name: "Einstellungen", exact: true }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expectNotErrorPage(page);
  });
});
