import { test, expect, hasCredentials, login, NO_CREDENTIALS_REASON } from "./fixtures";

test.describe("Onboarding", () => {
  test.skip(!hasCredentials, NO_CREDENTIALS_REASON);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "Willkommen bei kaufma." })).toBeVisible({ timeout: 15_000 });
  });

  test("Schritte vor und zurück (ohne abzuschließen)", async ({ page }) => {
    await page.getByRole("button", { name: /Jetzt einrichten/ }).click();
    await expect(page.getByText("Schritt 1 von 3")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wie heißt du?" })).toBeVisible();
    await expect(page.getByLabel("Vorname")).toBeVisible();
    await expect(page.getByLabel("Nachname")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Vermieten/ })).toHaveAttribute("aria-checked", "true");

    // Enter schickt den Schritt ab
    await page.getByLabel("Vorname").press("Enter");
    await expect(page.getByText("Schritt 2 von 3")).toBeVisible();
    await expect(page.getByLabel(/Stadt \/ Region/)).toBeVisible();

    await page.getByRole("button", { name: "Zurück" }).click();
    await expect(page.getByText("Schritt 1 von 3")).toBeVisible();

    await page.getByRole("button", { name: "Zurück" }).click();
    await expect(page.getByRole("heading", { name: "Willkommen bei kaufma." })).toBeVisible();
  });

  // Achtung: setzt onboarding_completed beim Testkonto auf true.
  test("Überspringen führt zum Dashboard", async ({ page }) => {
    await page.getByRole("button", { name: /Überspringen/ }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
