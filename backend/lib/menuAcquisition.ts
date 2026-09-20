import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { rawItemsToMenuItems, type RawMenuItem } from "@/backend/lib/ingredient_modeling";
import { upsertMenuItems } from "@/backend/lib/db";
import { withTimeout } from "@/backend/lib/with-timeout";
import type { Restaurant } from "@/shared/lib/types";

const MAX_PER_RUN = 12;
const RUN_TIMEOUT_MS = 8 * 60 * 1000;
const RETRY_FAILED_MS = 24 * 60 * 60 * 1000;
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

// Restaurants currently being scraped, and a chain so only one scrape run
// (one headless browser) is active at a time in this process.
const inFlight = new Set<string>();
let queue: Promise<void> = Promise.resolve();

function needsMenu(restaurant: Restaurant): boolean {
  if (!restaurant.website) return false;
  if (inFlight.has(restaurant.id)) return false;
  if (!restaurant.menu_status) return true;
  const checkedAt = restaurant.menu_checked_at ? Date.parse(restaurant.menu_checked_at) : 0;
  const age = Date.now() - checkedAt;
  if (restaurant.menu_status === "failed") return age > RETRY_FAILED_MS;
  if (restaurant.menu_status === "pending") return age > RETRY_FAILED_MS;
  return age > REFRESH_MS;
}

/**
 * Finds and parses menus for restaurants that don't have one yet (or whose
 * last check is stale), saving items linked by our restaurant doc id. Runs in
 * the background: never throws, never blocks the caller, and skips anything
 * already scraped recently. `restaurants` should be ordered nearest-first —
 * only the first few candidates are processed per call.
 */
export function acquireMenusInBackground(restaurants: Restaurant[]): void {
  const batch = restaurants.filter(needsMenu).slice(0, MAX_PER_RUN);
  if (batch.length === 0) return;
  for (const restaurant of batch) inFlight.add(restaurant.id);

  queue = queue
    .then(() => withTimeout(scrapeBatch(batch), RUN_TIMEOUT_MS, "menu acquisition"))
    .catch((err) => {
      console.error("[menus] acquisition run failed:", err instanceof Error ? err.message : err);
    })
    .finally(() => {
      for (const restaurant of batch) inFlight.delete(restaurant.id);
    });
}

async function scrapeBatch(batch: Restaurant[]): Promise<void> {
  console.log(`[menus] looking for menus for ${batch.length} restaurant(s)`);
  let scraped: ScrapedRestaurant[] = [];
  try {
    scraped = await runScraper(batch);
  } catch (err) {
    if (err instanceof ScraperUnavailable) {
      // Leave the restaurants unmarked so they're picked up once it's installed.
      if (!warnedUnavailable) {
        warnedUnavailable = true;
        console.warn(`[menus] skipped: ${err.message}`);
      }
      return;
    }
    console.error("[menus] scrape failed:", err instanceof Error ? err.message : err);
    await Promise.all(batch.map((r) => upsertMenuItems(r.id, [], "failed").catch(() => {})));
    return;
  }

  const found = new Set<string>();
  for (const result of scraped) {
    found.add(result.key);
    const items = rawItemsToMenuItems(result.items);
    try {
      await upsertMenuItems(result.key, items, items.length > 0 ? "ready" : "none");
      console.log(`[menus] ${result.key}: saved ${items.length} menu item(s)`);
    } catch (err) {
      console.error(`[menus] saving ${result.key} failed:`, err instanceof Error ? err.message : err);
    }
  }
  // No menu found: record it so this restaurant isn't re-scraped on every save.
  await Promise.all(
    batch.filter((r) => !found.has(r.id)).map((r) => upsertMenuItems(r.id, [], "none").catch(() => {}))
  );
}

class ScraperUnavailable extends Error {}
let warnedUnavailable = false;

type ScrapedRestaurant = {
  key: string;
  name: string;
  website: string;
  menuUrls: { kind: string; label: string; url: string }[];
  items: RawMenuItem[];
};

// The scraping stack (cheerio / puppeteer / pdf-parse) runs in a child process
// through tsx, so the Next server never bundles or loads it.
async function runScraper(batch: Restaurant[]): Promise<ScrapedRestaurant[]> {
  const cwd = process.cwd();
  const tsxCli = path.join(cwd, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(cwd, "backend", "scripts", "scrape_menus.ts");
  const cheerio = path.join(cwd, "node_modules", "cheerio");
  try {
    await Promise.all([fs.access(tsxCli), fs.access(script), fs.access(cheerio)]);
  } catch {
    throw new ScraperUnavailable("menu scraping dependencies aren't installed (run `npm install`)");
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dietre-menus-"));
  const inputPath = path.join(dir, "input.json");
  const outputPath = path.join(dir, "output.json");
  try {
    await fs.writeFile(
      inputPath,
      JSON.stringify(
        batch.map((restaurant) => ({
          key: restaurant.id,
          name: restaurant.name,
          address: restaurant.location,
          websiteUri: restaurant.website,
        }))
      ),
      "utf8"
    );

    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [tsxCli, script, inputPath, outputPath], {
        cwd,
        env: process.env,
        stdio: ["ignore", "inherit", "inherit"],
      });
      const killTimer = setTimeout(() => child.kill(), RUN_TIMEOUT_MS - 10_000);
      child.on("error", reject);
      child.on("exit", (code) => {
        clearTimeout(killTimer);
        if (code === 0) resolve();
        else reject(new Error(`scraper exited with code ${code}`));
      });
    });

    return JSON.parse(await fs.readFile(outputPath, "utf8")) as ScrapedRestaurant[];
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
