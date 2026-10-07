import { test as base, expect, type Page } from "@playwright/test";

/**
 * Gemeinsame Fixture für alle E2E-Tests:
 * - sammelt Konsolenfehler, unbehandelte JS-Fehler und 4xx/5xx-Antworten der eigenen Domain
 * - schlägt am Testende fehl, wenn etwas davon aufgetreten ist
 * - setzt die Cookie-Entscheidung auf "declined": kein Banner im Weg, kein GA-Tracking aus Tests
 *
 * Bekannte, bewusst tolerierte Meldungen gehören in IGNORED_CONSOLE (mit Begründung).
 */
const IGNORED_CONSOLE: RegExp[] = [];

type Problems = { console: string[]; http: string[] };

export const test = base.extend<{ problems: Problems }>({
  problems: [
    async ({ page, baseURL }, use, testInfo) => {
      const origin = new URL(baseURL!).origin;
      const problems: Problems = { console: [], http: [] };

      await page.addInitScript(() => {
        try {
          localStorage.setItem("cookie_consent", "declined");
        } catch {
          /* ignore */
        }
      });

      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = `${msg.text()}${msg.location().url ? ` @ ${msg.location().url}` : ""}`;
        if (!IGNORED_CONSOLE.some((re) => re.test(text))) problems.console.push(text);
      });
      page.on("pageerror", (err) => problems.console.push(`pageerror: ${err.message}`));
      page.on("response", (res) => {
        const url = res.url();
        if (res.status() >= 400 && url.startsWith(origin)) {
          problems.http.push(`${res.status()} ${res.request().method()} ${url}`);
        }
      });

      await use(problems);

      if (testInfo.status === "skipped") return;
      expect.soft(problems.http, "HTTP-Fehler (4xx/5xx) der eigenen Domain").toEqual([]);
      expect.soft(problems.console, "Konsolenfehler").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Zugangsdaten des Testkontos kommen ausschließlich aus Umgebungsvariablen. */
export const credentials = {
  email: process.env.E2E_EMAIL ?? "",
  password: process.env.E2E_PASSWORD ?? "",
};
export const hasCredentials = Boolean(credentials.email && credentials.password);
export const NO_CREDENTIALS_REASON =
  "E2E_EMAIL / E2E_PASSWORD nicht gesetzt – Tests mit Login werden übersprungen.";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(credentials.email);
  await page.getByLabel("Passwort").fill(credentials.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
}

/**
 * Wartet, bis React die server-gerenderte Seite hydriert hat. Vorher gehen Klicks und
 * Eingaben verloren – auf einem kalten Dev-Server kann das mehrere Sekunden dauern.
 */
export async function gotoHydrated(page: Page, path: string) {
  const res = await page.goto(path);
  await page.waitForLoadState("networkidle");
  return res;
}

/** Wartet, bis die App ihre "Lade…"-Zwischenansicht verlassen hat. */
export async function waitForApp(page: Page) {
  await expect(page.getByText("Lade…", { exact: true })).toHaveCount(0, { timeout: 15_000 });
}

/** Die Seite darf weder die 404-Ansicht noch die Fehleransicht zeigen. */
export async function expectNotErrorPage(page: Page) {
  await expect(page.getByRole("heading", { name: /^(Nicht gefunden|Ein Fehler ist aufgetreten|Rechner nicht gefunden)$/ })).toHaveCount(0);
}
