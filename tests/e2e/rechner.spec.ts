import { test, expect, expectNotErrorPage, gotoHydrated } from "./fixtures";

const CALCULATORS = [
  { slug: "kaufnebenkosten", h1: "Kaufnebenkosten-Rechner für Immobilien" },
  { slug: "rendite", h1: "Renditerechner für Immobilien" },
  { slug: "cashflow", h1: "Cashflow-Rechner für Immobilien" },
  { slug: "finanzierung", h1: "Finanzierungsrechner für Immobilien" },
  { slug: "breakeven", h1: "Break-even-Miete-Rechner" },
  { slug: "leistbarkeit", h1: "Leistbarkeitsrechner für Immobilien" },
  { slug: "fixflip", h1: "Fix & Flip Rechner" },
];

test("Rechner-Übersicht verlinkt alle Rechner", async ({ page }) => {
  await page.goto("/rechner");
  await expectNotErrorPage(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const c of CALCULATORS) {
    await expect.soft(page.locator(`a[href="/rechner/${c.slug}"]`).first(), c.slug).toBeVisible();
  }
});

for (const c of CALCULATORS) {
  test(`Rechner ${c.slug}: lädt und rechnet bei Eingabe neu`, async ({ page }) => {
    const res = await gotoHydrated(page, `/rechner/${c.slug}`);
    expect(res?.status()).toBe(200);
    await expectNotErrorPage(page);
    await expect(page.getByRole("heading", { level: 1, name: c.h1 })).toBeVisible();

    // Hauptergebnis (BigResult) muss einen Wert zeigen.
    const result = page.locator("div.font-display.tabular-nums").first();
    await expect(result).toBeVisible();
    await expect(result).not.toHaveText("");
    const before = (await result.innerText()).trim();

    // Erstes Zahlenfeld deutlich verändern → Ergebnis muss sich ändern.
    const input = page.locator('input[type="number"]').first();
    const current = Number(await input.inputValue()) || 0;
    const next = current > 0 ? Math.round(current * 1.5) : 100_000;
    await input.fill(String(next));
    await input.blur();
    await expect(result).not.toHaveText(before);
    await expect(result).not.toHaveText(/NaN|Infinity|undefined/);
  });
}

test("Rendite-Rechner ordnet das Ergebnis in Worten ein", async ({ page }) => {
  await gotoHydrated(page, "/rechner/rendite");
  const kaufpreis = page.getByRole("spinbutton", { name: /Kaufpreis/ });
  const jahresmiete = page.getByRole("spinbutton", { name: /Jahresmiete/ });

  // 2,0 % brutto → „Niedrig“
  await kaufpreis.fill("500000");
  await jahresmiete.fill("10000");
  await expect(page.getByText(/^Niedrig/)).toBeVisible();

  // 5,0 % brutto → „Attraktiv“
  await jahresmiete.fill("25000");
  await expect(page.getByText(/^Attraktiv/)).toBeVisible();
});

test("Cashflow-Rechner: negativer Cashflow wird als Zuzahlung benannt", async ({ page }) => {
  await gotoHydrated(page, "/rechner/cashflow");
  await page.getByRole("spinbutton", { name: /Erwartete Monatsmiete/ }).fill("100");
  await expect(page.getByText(/Du zahlst jeden Monat .* dazu/)).toBeVisible();
});

test.describe("Rechner auf dem Handy", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("Ergebnisleiste zeigt das Ergebnis live und weicht dem ausführlichen Ergebnis", async ({ page }) => {
    await gotoHydrated(page, "/rechner/rendite");
    const bar = page.getByRole("button", { name: /Details/ }).locator("xpath=ancestor::div[contains(@class,'fixed')]");
    await expect(bar).toBeInViewport();
    const value = bar.locator("div.font-display");

    await page.getByRole("spinbutton", { name: /Kaufpreis/ }).fill("500000");
    await page.getByRole("spinbutton", { name: /Jahresmiete/ }).fill("25000");
    await expect(value).toHaveText(/^5(,0+)?\s?%$/);

    await page.getByRole("button", { name: /Details/ }).tap();
    await expect(page.getByRole("heading", { name: "Ergebnis" })).toBeInViewport();
    await expect(bar).not.toBeInViewport();
  });
});

test("unbekannter Rechner zeigt „Rechner nicht gefunden“", async ({ page, problems }) => {
  await page.goto("/rechner/gibt-es-nicht");
  await expect(page.getByRole("heading", { name: "Rechner nicht gefunden" })).toBeVisible();
  problems.http.length = 0; // gewollter 404
  problems.console.length = 0;
});
