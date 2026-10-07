import { test, expect, credentials, hasCredentials, login, gotoHydrated, NO_CREDENTIALS_REASON } from "./fixtures";

// Hinweis: Es wird bewusst KEIN Konto registriert – sonst entstünde bei jedem Lauf
// ein echtes Konto auf der Live-Seite. Geprüft werden Formular und Validierung.

test.describe("Registrierung", () => {
  test("Formular wird angezeigt", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Kostenlos starten" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mit Google registrieren/ })).toBeVisible();
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: "Account erstellen" })).toBeVisible();
  });

  test("zu kurzes Passwort wird nicht abgeschickt", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("E-Mail").fill("e2e-validation@example.com");
    await page.getByLabel("Passwort").fill("kurz");
    await page.getByRole("button", { name: "Account erstellen" }).click();
    // Browser-Validierung (minLength=8) blockiert das Absenden – wir bleiben auf /signup.
    await expect(page).toHaveURL(/\/signup/);
    const tooShort = await page.getByLabel("Passwort").evaluate((el: HTMLInputElement) => el.validity.tooShort);
    expect(tooShort).toBe(true);
  });

  test("Link zum Login führt zu /login", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("link", { name: /anmelden|login/i }).or(page.getByRole("button", { name: /anmelden/i })).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Login – ohne Konto", () => {
  test("Formular wird angezeigt", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Willkommen zurück" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mit Google fortfahren/ })).toBeVisible();
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden", exact: true })).toBeVisible();
  });

  test("geschützte Seite leitet zum Login weiter", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/, { timeout: 15_000 });
  });

  test("Links zu Registrieren und Passwort vergessen", async ({ page }) => {
    await gotoHydrated(page, "/login");
    await page.getByRole("button", { name: "Registrieren" }).click();
    await expect(page).toHaveURL(/\/signup/);
    await gotoHydrated(page, "/login");
    await page.getByRole("button", { name: "Passwort vergessen?" }).click();
    await expect(page).toHaveURL(/\/reset-password/);
  });
});

test.describe("Login – mit Testkonto", () => {
  test.skip(!hasCredentials, NO_CREDENTIALS_REASON);

  test("falsches Passwort zeigt Fehler und bleibt auf /login", async ({ page, problems }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(credentials.email);
    await page.getByLabel("Passwort").fill(`${credentials.password}-falsch`);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    // Supabase antwortet hier erwartungsgemäß mit 400 – das ist kein Fehler der Seite.
    problems.console.length = 0;
  });

  test("Login, Weiterleitung in die App und Abmelden", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    if (page.url().includes("/onboarding")) return; // Abmelden-Button gibt es erst in der App
    await page.getByRole("button", { name: "Abmelden" }).first().click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  });
});
