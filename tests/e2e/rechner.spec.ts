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

test("unbekannter Rechner zeigt „Rechner nicht gefunden“", async ({ page, problems }) => {
  await page.goto("/rechner/gibt-es-nicht");
  await expect(page.getByRole("heading", { name: "Rechner nicht gefunden" })).toBeVisible();
  problems.http.length = 0; // gewollter 404
  problems.console.length = 0;
});
