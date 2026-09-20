/**
 * scrape_menus.ts — child-process entry used by backend/lib/menuAcquisition.ts.
 *
 * Usage: tsx backend/scripts/scrape_menus.ts <input.json> <output.json>
 *   input:  [{ key, name, address, websiteUri }]
 *   output: [{ key, name, website, menuUrls, items: RawMenuItem[] }]
 *
 * Runs the scraping stack (cheerio / puppeteer / pdf-parse) in its own
 * process so the Next.js server never has to bundle or load it.
 */
import { promises as fs } from "fs";
import { scrapeMenusForPlaces, type ScrapePlace } from "@/backend/lib/places";

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) throw new Error("usage: scrape_menus.ts <input.json> <output.json>");
  const places = JSON.parse(await fs.readFile(inputPath, "utf8")) as ScrapePlace[];
  const scraped = await scrapeMenusForPlaces(places);
  await fs.writeFile(outputPath, JSON.stringify(scraped), "utf8");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[scrape_menus] failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
