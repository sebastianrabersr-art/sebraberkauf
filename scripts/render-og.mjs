// Rendert public/og-image.html → public/og-image.jpg (1200 × 630) mit Playwright.
// Aufruf:  node scripts/render-og.mjs
// Optional ein Artikelbild:  node scripts/render-og.mjs --article "Titel" "Kategorie" 6 out.jpg
import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

let url = pathToFileURL(join(root, "public/og-image.html")).href;
let out = join(root, "public/og-image.jpg");
if (args[0] === "--article") {
  const [, title = "", category = "", minutes = "", file = "og-article.jpg"] = args;
  const q = new URLSearchParams({ title, category, minutes });
  url = `${pathToFileURL(join(root, "public/og-article.html")).href}?${q}`;
  out = join(root, "public", file);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, type: "jpeg", quality: 90 });
await browser.close();
console.log(`geschrieben: ${out}`);
