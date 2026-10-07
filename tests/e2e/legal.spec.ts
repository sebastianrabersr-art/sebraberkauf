import { test, expect, expectNotErrorPage } from "./fixtures";

const PAGES = [
  { path: "/impressum", heading: /Impressum/, footer: "Impressum" },
  { path: "/datenschutz", heading: /Datenschutzerklärung/, footer: "Datenschutz" },
  { path: "/agb", heading: /Allgemeine Geschäftsbedingungen/, footer: "AGB" },
  { path: "/widerruf", heading: /Widerruf/, footer: "Widerruf" },
];

for (const p of PAGES) {
  test(`${p.path} lädt mit Überschrift und Inhalt`, async ({ page }) => {
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await expectNotErrorPage(page);
    await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
    // Mindestens ein Abschnitt mit Text – die Seite ist nicht leer.
    await expect(page.locator("article h2").first()).toBeVisible();
    expect((await page.locator("article").innerText()).length).toBeGreaterThan(300);
    // Kontakt-E-Mail muss auf jeder Rechtsseite stehen.
    await expect(page.locator("article").getByText("hallo@kaufma.eu").first()).toBeVisible();
  });

  test(`Footer-Link „${p.footer}“ öffnet ${p.path}`, async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: p.footer, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${p.path}$`));
    await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
  });
}

test("Rechtsseiten enthalten keine offenen Platzhalter", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p.path);
    const text = await page.locator("article").innerText();
    expect.soft(text, `${p.path} enthält Platzhalter`).not.toMatch(/\[[^\]]*(EINTRAGEN|ERGÄNZEN|PRÜFEN)[^\]]*\]/);
  }
});
