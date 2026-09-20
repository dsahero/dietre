/*
 * Restaurant menu discovery pipeline.
 *
 * 1. Google Places → website URLs
 * 2. Fetch pages, check for JSON-LD Menu (instant short-circuit)
 * 3. Extract ALL <a href> links with Cheerio (deterministic, no keyword filter)
 * 4. Give Gemini the full link list — it picks by ID (grounded, zero hallucination)
 * 5. Follow or finish based on Gemini's action
 * 6. Hand found menus to menuParser for text extraction
 */

import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonLdMenuText, isUsefulJsonLd } from "@/backend/lib/menuParser";
import { detectSpaSignals, renderWithBrowser, closeBrowser } from "@/backend/lib/renderPage";

const apiKey = process.env.PLACES_API_KEY!;
const geminiKey = process.env.GEMINI_API_KEY;

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const geminiModel = genAI?.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

const MAX_LAYER = 2;
const MAX_LINKS = 80;

export type LinkCandidate = {
  id: number;
  kind: "pdf" | "html";
  label: string;
  url: string;
};

type FoundMenu = {
  restaurant: string;
  layer: number;
  menus: LinkCandidate[];
  reason: string;
};

type RestaurantJob = {
  name: string;
  locationHint: string;
  startUrl: string;
  startRoot: string;
  visited: Set<string>;
  layerUrls: string[];
  done: boolean;
  found: FoundMenu | null;
};

type GeminiPick = {
  ids: number[];
  action: "menu_found" | "navigate" | "none";
  reason: string;
};

const address = "123 Main St, Anytown, USA";

/** One restaurant to find a menu for. `key` is the caller's own id and becomes the menu items' restaurant_id. */
export type ScrapePlace = {
  key: string;
  name: string;
  address?: string;
  websiteUri: string;
};

export type ScrapedMenu = {
  key: string;
  name: string;
  website: string;
  menuUrls: { kind: string; label: string; url: string }[];
  items: import("@/backend/lib/ingredient_modeling").RawMenuItem[];
};

/**
 * Menu discovery + parsing for a list of places (the pipeline main() used to
 * run inline for one hard-coded spot). Restaurants that have no findable menu
 * are simply absent from the result.
 */
export async function scrapeMenusForPlaces(places: ScrapePlace[]): Promise<ScrapedMenu[]> {
  const jobs: (RestaurantJob & { key: string })[] = [];
  for (const place of places) {
    if (!place.websiteUri) continue;
    let startRoot: string;
    try {
      startRoot = rootDomain(new URL(place.websiteUri).hostname);
    } catch {
      continue;
    }
    const locationHint = place.address?.split(",")[0]?.trim() || place.name;
    jobs.push({
      key: place.key,
      // Unique per place so chains with several locations don't collide in Gemini's batch answer.
      name: place.address ? `${place.name} — ${place.address}` : place.name,
      locationHint,
      startUrl: place.websiteUri,
      startRoot,
      visited: new Set(),
      layerUrls: [place.websiteUri],
      done: false,
      found: null,
    });
  }

  try {
    for (let layer = 0; layer <= MAX_LAYER; layer++) {
      const active = jobs.filter((j) => !j.done && j.layerUrls.length > 0);
      if (active.length === 0) break;

      console.log(`\n########## LAYER ${layer} — ${active.length} restaurant(s) ##########`);

      // Fetch + extract links for all active jobs in parallel
      const jobLinks = await Promise.all(
        active.map(async (job) => {
          console.log(`\n=== ${job.name} ===`);
          const links = await collectFromLayer(job, layer);
          return { job, links };
        }),
      );

      // Gather jobs that still need Gemini (not resolved by JSON-LD)
      const needGemini: { job: RestaurantJob; links: LinkCandidate[] }[] = [];
      for (const { job, links } of jobLinks) {
        if (job.done) continue; // JSON-LD resolved it
        if (links.length === 0) {
          console.log(`[${job.name}] no links found — done`);
          job.done = true;
          continue;
        }
        console.log(`[${job.name}] ${links.length} links for Gemini`);
        for (const c of links.slice(0, 15)) {
          console.log(`  #${c.id} [${c.kind}] "${c.label}" → ${c.url}`);
        }
        if (links.length > 15) console.log(`  ... +${links.length - 15} more`);
        needGemini.push({ job, links });
      }

      if (needGemini.length === 0) continue;

      // One batched Gemini call for all restaurants this layer
      console.log(`\n[layer ${layer}] Gemini pick for ${needGemini.length} restaurant(s)...`);
      const batch = await pickBatchWithGemini(
        layer,
        needGemini.map(({ job, links }) => ({
          name: job.name,
          locationHint: job.locationHint,
          links,
        })),
      );

      for (const { job, links } of needGemini) {
        const pick = batch[job.name] ?? { ids: [], action: "none" as const, reason: "no pick" };
        applyPick(job, layer, links, pick);
      }
    }

    console.log("\n========== MENUS FOUND ==========");
    for (const job of jobs) {
      if (!job.found) {
        console.log(`\n${job.name}: (none)`);
        continue;
      }
      console.log(`\n${job.found.restaurant} (layer ${job.found.layer}): ${job.found.reason}`);
      for (const m of job.found.menus) {
        console.log(`  - [${m.kind}] ${m.label} → ${m.url}`);
      }
    }

    const { extractMenuTextsForRestaurant, menuTextResultToJson } = await import(
      "@/backend/lib/menuParser"
    );
    const { modelMenuItems } = await import("@/backend/lib/ingredient_modeling");

    const scraped: ScrapedMenu[] = [];

    console.log("\n========== MENU TEXT + ITEM PARSING ==========");
    for (const job of jobs) {
      if (!job.found?.menus.length) continue;

      const menuUrls = job.found.menus.map((m) => ({ kind: m.kind, label: m.label, url: m.url }));
      const result = await extractMenuTextsForRestaurant(job.found.restaurant, menuUrls);
      console.log(menuTextResultToJson(result));

      if (!result.combined.trim()) {
        console.log(`[${job.found.restaurant}] no combined text — skipping item parse`);
        continue;
      }

      const { items, stats } = await modelMenuItems(job.key, result.combined);
      scraped.push({ key: job.key, name: job.name, website: job.startUrl, menuUrls, items });
      console.log(
        `\n[${job.found.restaurant}] ${stats.total} items: ` +
        `${stats.withIngredients} with ingredients, ${stats.withoutIngredients} without`,
      );
      for (const item of items.slice(0, 10)) {
        console.log(
          `  ${item.name} — ${item.price != null ? `$${item.price}` : "(no price)"}` +
          `\n    description: ${item.description || "(none)"}` +
          `\n    ingredients: ${item.ingredients.join(", ") || "(none)"}`,
        );
      }
      if (items.length > 10) console.log(`  ... +${items.length - 10} more items`);
    }
    return scraped;
  } finally {
    await closeBrowser();
  }
}

async function main() {
  const data = await getRestaurant(address);

  const places = data.places ?? [];
  console.log(
    "Places:",
    places.map((p: { displayName?: { text?: string }; websiteUri?: string }) => ({
      name: p.displayName?.text,
      website: p.websiteUri,
    })),
  );

  const targets: ScrapePlace[] = [];
  for (const place of places) {
    const website = place.websiteUri as string | undefined;
    const name = place.displayName?.text ?? "(unnamed)";
    if (!website) {
      console.log(`Skip ${name}: no websiteUri`);
      continue;
    }
    targets.push({
      key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      address: undefined,
      websiteUri: website,
    });
  }

  const scraped = await scrapeMenusForPlaces(targets);

  const { promises: fs } = await import("fs");
  const path = await import("path");
  const allRestaurants = scraped.map((s) => ({
    id: s.key,
    name: s.name,
    website: s.website,
    menuUrls: s.menuUrls,
  }));
  const allMenuItems = scraped.flatMap((s) => s.items);

  // Write raw page-content output to .data/menus.json
  const dataDir = path.join(process.cwd(), ".data");
  await fs.mkdir(dataDir, { recursive: true });

  const output = {
    generated_at: new Date().toISOString(),
    restaurants: allRestaurants,
    menu_items: allMenuItems,
    stats: {
      restaurants_found: allRestaurants.length,
      total_items: allMenuItems.length,
      with_ingredients: allMenuItems.filter((i) => i.ingredients.length > 0).length,
      without_ingredients: allMenuItems.filter((i) => i.ingredients.length === 0).length,
    },
  };

  const outPath = path.join(dataDir, "menus.json");
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n========== EXPORTED ==========`);
  console.log(`Wrote ${outPath}`);
  console.log(`  ${output.stats.restaurants_found} restaurants, ${output.stats.total_items} items`);
  console.log(`  ${output.stats.with_ingredients} with ingredients, ${output.stats.without_ingredients} without`);
}

// Only run the hard-coded CLI when this file is executed directly
// (`tsx backend/lib/places.ts`); importing it from the app must not start it.
if (/[\\/]places\.(ts|js|mjs|cjs)$/.test(process.argv[1] ?? "")) {
  void main();
}

// ---------------------------------------------------------------------------
// Link extraction (one Cheerio pass — deterministic, no keyword filtering)
// ---------------------------------------------------------------------------

function extractAllLinks(
  html: string,
  baseUrl: string,
  startRoot: string,
  visited: Set<string>,
  limit: number,
): LinkCandidate[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const results: LinkCandidate[] = [];
  let id = 1;

  $("a[href]").each((_, el) => {
    if (results.length >= limit) return false;

    const href = $(el).attr("href")!.trim();
    if (!href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) return;
    if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|zip)(\?|$)/i.test(href)) return;

    const label = $(el).text().replace(/\s+/g, " ").trim();
    if (!label || label.length > 100) return;

    let url: string;
    try {
      url = new URL(href, baseUrl).href;
    } catch {
      return;
    }

    if (!isRelatedHost(startRoot, url)) return;
    const normalized = stripHash(url);
    if (seen.has(normalized) || visited.has(normalized)) return;
    seen.add(normalized);

    const isPdf = /\.pdf(\?|#|$)/i.test(url);
    results.push({ id: id++, kind: isPdf ? "pdf" : "html", label, url });
  });

  return results;
}

// ---------------------------------------------------------------------------
// Layer collection: fetch pages → JSON-LD shortcut → extract links
// ---------------------------------------------------------------------------

async function collectFromLayer(
  job: RestaurantJob,
  layer: number,
): Promise<LinkCandidate[]> {
  const urls = [...job.layerUrls];
  job.layerUrls = [];

  // Fetch all URLs for this layer in parallel
  const fetched = await Promise.allSettled(
    urls.map(async (url) => {
      console.log(`[${job.name}] fetching: ${url}`);
      const result = await fetchWithFallback(job.name, url);
      return result ? { ...result, originalUrl: url } : null;
    }),
  );

  const allLinks: LinkCandidate[] = [];

  for (const entry of fetched) {
    if (entry.status !== "fulfilled" || !entry.value) continue;
    let { html, finalUrl } = entry.value;
    const { originalUrl } = entry.value;

    const normalized = stripHash(finalUrl);
    if (job.visited.has(normalized)) continue;
    job.visited.add(normalized);
    job.visited.add(stripHash(originalUrl));

    // JSON-LD shortcut — if the page has structured menu data, skip everything
    const $raw = cheerio.load(html);
    const jsonLdText = extractJsonLdMenuText($raw);
    if (jsonLdText && isUsefulJsonLd(jsonLdText)) {
      console.log(`[${job.name}] ✓ JSON-LD menu found on ${finalUrl}`);
      finishJob(
        job,
        layer,
        [{ id: 0, kind: "html", label: "(JSON-LD menu)", url: finalUrl }],
        "structured JSON-LD menu on page",
      );
      return [];
    }

    // SPA detection — if raw HTML looks JS-rendered, fall back to Puppeteer
    const spa = detectSpaSignals(html);
    if (spa.isSpa) {
      console.log(
        `[${job.name}] SPA detected (score=${spa.score}: ` +
        `fewLinks=${spa.fewLinks} thinBody=${spa.thinBody} spaMount=${spa.spaMount} ` +
        `noscript=${spa.noscriptWarning} scriptHeavy=${spa.scriptHeavy}) — rendering with browser`,
      );
      try {
        const rendered = await renderWithBrowser(finalUrl);
        html = rendered.html;
        console.log(
          `[${job.name}] browser render done ` +
          `(confirmedSpa=${rendered.confirmedSpa}, apiRequests=${rendered.apiRequestCount})`,
        );

        // Re-check JSON-LD on rendered page (some SPAs inject it at runtime)
        const $rendered = cheerio.load(html);
        const renderedLd = extractJsonLdMenuText($rendered);
        if (renderedLd && isUsefulJsonLd(renderedLd)) {
          console.log(`[${job.name}] ✓ JSON-LD menu found after browser render`);
          finishJob(
            job,
            layer,
            [{ id: 0, kind: "html", label: "(JSON-LD menu, SPA-rendered)", url: finalUrl }],
            "structured JSON-LD menu on SPA-rendered page",
          );
          return [];
        }
      } catch (err) {
        console.log(
          `[${job.name}] browser render failed:`,
          err instanceof Error ? err.message : err,
        );
        // Continue with raw HTML — better than nothing
      }
    }

    // Extract all links (one Cheerio pass, no keyword filter)
    const links = extractAllLinks(html, finalUrl, job.startRoot, job.visited, MAX_LINKS);
    allLinks.push(...links);

    // On deeper layers, include the current page itself as a candidate
    if (layer > 0) {
      allLinks.push({
        id: 0,
        kind: "html",
        label: `(current page) ${finalUrl}`,
        url: finalUrl,
      });
    }
  }

  return dedupeCandidates(allLinks);
}

function dedupeCandidates(list: LinkCandidate[]): LinkCandidate[] {
  const byUrl = new Map<string, LinkCandidate>();
  for (const c of list) {
    if (!byUrl.has(c.url)) byUrl.set(c.url, c);
  }
  return [...byUrl.values()].map((c, i) => ({ ...c, id: i + 1 }));
}

// ---------------------------------------------------------------------------
// Apply Gemini pick
// ---------------------------------------------------------------------------

function applyPick(
  job: RestaurantJob,
  layer: number,
  links: LinkCandidate[],
  pick: GeminiPick,
) {
  // Validate: only accept IDs that map to real harvested links
  const selected = links.filter((c) => pick.ids.includes(c.id));
  console.log(
    `[${job.name}] action=${pick.action} ids=[${pick.ids.join(", ")}] — ${pick.reason}`,
  );
  for (const c of selected) {
    console.log(`[${job.name}]   ✓ ${pick.action === "navigate" ? "FOLLOW" : "SELECTED"} [${c.kind}] "${c.label}" → ${c.url}`);
  }

  if (selected.length === 0) {
    job.done = true;
    console.log(`[${job.name}] nothing valid selected — done`);
    return;
  }

  if (pick.action === "menu_found") {
    finishJob(job, layer, selected, pick.reason);
    return;
  }

  if (pick.action === "navigate" && layer < MAX_LAYER) {
    job.layerUrls = selected
      .map((c) => c.url)
      .filter((u) => !job.visited.has(stripHash(u)))
      .slice(0, 3);

    if (job.layerUrls.length === 0) {
      finishJob(job, layer, selected, `${pick.reason} (targets already visited, using as menu)`);
      return;
    }
    console.log(`[${job.name}] navigating to ${job.layerUrls.length} url(s) next layer`);
    return;
  }

  // action=navigate but on last layer — use what we have
  finishJob(job, layer, selected, pick.reason);
}

function finishJob(
  job: RestaurantJob,
  layer: number,
  menus: LinkCandidate[],
  reason: string,
) {
  job.done = true;
  job.found = { restaurant: job.name, layer, menus, reason };
  job.layerUrls = [];
  for (const m of menus) {
    console.log(`[${job.name}] ✓ FOUND kind=${m.kind} label="${m.label}" href=${m.url}`);
  }
  console.log(`[${job.name}] stop — ${reason}`);
}

// ---------------------------------------------------------------------------
// Gemini: one unified batched call (pick menu OR navigate)
// ---------------------------------------------------------------------------

async function callGeminiJson(prompt: string): Promise<unknown> {
  if (!geminiModel) throw new Error("no GEMINI_API_KEY");
  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonText = text.replace(/^```json\s*|\s*```$/g, "");
  return JSON.parse(jsonText);
}

function heuristicPick(links: LinkCandidate[]): GeminiPick {
  const pdf = links.find((c) => c.kind === "pdf");
  if (pdf) return { ids: [pdf.id], action: "menu_found", reason: "heuristic: first PDF" };

  const menuish = links.find((c) => /menu/i.test(`${c.label} ${c.url}`));
  if (menuish) return { ids: [menuish.id], action: "menu_found", reason: "heuristic: label contains menu" };

  return { ids: links[0] ? [links[0].id] : [], action: "navigate", reason: "heuristic: first link" };
}

async function pickBatchWithGemini(
  layer: number,
  restaurants: { name: string; locationHint: string; links: LinkCandidate[] }[],
): Promise<Record<string, GeminiPick>> {
  const out: Record<string, GeminiPick> = {};

  if (!geminiKey) {
    for (const r of restaurants) out[r.name] = heuristicPick(r.links);
    return out;
  }

  const blocks = restaurants
    .map((r) => {
      const list = r.links
        .map((c) => `  #${c.id} [${c.kind}] "${c.label}" → ${c.url}`)
        .join("\n");
      return `Restaurant: ${r.name}\nLocation hint: ${r.locationHint}\nLinks:\n${list}`;
    })
    .join("\n\n");

  const prompt = `You are finding food menu URLs for restaurants. Crawl layer: ${layer} (0 = homepage).

For EACH restaurant below, you see every link extracted from their current page.

Decide ONE action per restaurant:
- "menu_found": the selected link(s) ARE the food menu (a page listing food items with prices, a PDF menu, an online ordering page with the full menu). Pick 1–3 best.
- "navigate": no link is obviously the menu, but some link(s) could LEAD to it (e.g. a location page matching the location hint, an "Order Online" hub). Pick 1–3 to follow.
- "none": nothing looks useful for finding a food menu.

Guidelines:
- Prefer: PDF menus, /menu pages, online ordering with full item lists, daily specials pages.
- Reject: individual dish detail pages, careers, gift cards, social media, app stores, privacy policy, unrelated cities.
- A link labeled "Menu" or whose URL contains /menu is very likely "menu_found".
- If the site is a multi-location chain and you see location pages, "navigate" to the one matching the location hint.

${blocks}

Return ONLY JSON:
{
  "picks": [
    { "restaurant": string, "ids": number[], "action": "menu_found" | "navigate" | "none", "reason": string }
  ]
}`;

  try {
    console.log(`[layer ${layer}] calling Gemini for ${restaurants.length} restaurant(s)...`);
    const parsed = (await callGeminiJson(prompt)) as {
      picks?: { restaurant?: string; ids?: unknown; action?: unknown; reason?: unknown }[];
    };
    for (const p of parsed.picks ?? []) {
      if (typeof p.restaurant !== "string") continue;
      const action =
        p.action === "menu_found" || p.action === "navigate" || p.action === "none"
          ? p.action
          : "none";
      out[p.restaurant] = {
        ids: Array.isArray(p.ids)
          ? p.ids.filter((n): n is number => typeof n === "number")
          : [],
        action,
        reason: typeof p.reason === "string" ? p.reason : "(no reason)",
      };
    }
    for (const r of restaurants) {
      if (!out[r.name]) out[r.name] = heuristicPick(r.links);
    }
    return out;
  } catch (err) {
    console.log(`[layer ${layer}] Gemini failed:`, err instanceof Error ? err.message : err);
    for (const r of restaurants) out[r.name] = heuristicPick(r.links);
    return out;
  }
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

function isSocialHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return (
    host === "facebook.com" ||
    host === "instagram.com" ||
    host === "twitter.com" ||
    host === "x.com" ||
    host === "tiktok.com"
  );
}

function isAntiBotStatus(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /HTTP (401|403|429|503)\b/.test(msg);
}

async function fetchWithFallback(
  name: string,
  url: string,
): Promise<{ html: string; finalUrl: string } | null> {
  // Try original URL, then stripped params, then origin root
  const variants: string[] = [url];
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    if (u.href !== url) variants.push(u.href);
    if (!isSocialHost(u.hostname)) {
      const origin = `${u.protocol}//${u.hostname}/`;
      if (!variants.includes(origin)) variants.push(origin);
    }
  } catch {
    /* ignore */
  }

  let lastErr: unknown;
  for (const attempt of variants) {
    try {
      if (attempt !== url) console.log(`[${name}]   retry: ${attempt}`);
      const html = await fetchHtml(attempt);
      if (attempt !== url) console.log(`[${name}]   ✓ worked`);
      return { html, finalUrl: attempt };
    } catch (err) {
      lastErr = err;
    }
  }

  if (isAntiBotStatus(lastErr)) {
    try {
      console.log(
        `[${name}] fetch blocked (${lastErr instanceof Error ? lastErr.message : lastErr}) — rendering with browser`,
      );
      const rendered = await renderWithBrowser(url);
      if (rendered.html.trim()) return { html: rendered.html, finalUrl: url };
    } catch (err) {
      console.log(`[${name}] browser render failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[${name}] fetch failed:`, lastErr instanceof Error ? lastErr.message : lastErr);
  return null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// URL / domain helpers
// ---------------------------------------------------------------------------

function rootDomain(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

function isRelatedHost(startRoot: string, url: string): boolean {
  try {
    return rootDomain(new URL(url).hostname) === startRoot;
  } catch {
    return false;
  }
}

function stripHash(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Google Places API
// ---------------------------------------------------------------------------

async function getRestaurant(_address: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.types",
        "places.nationalPhoneNumber",
        "places.websiteUri",
      ].join(","),
    },
    body: JSON.stringify({
      includedTypes: ["restaurant"],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: { latitude: 37.229, longitude: -80.4139 },
          radius: 1500.0,
        },
      },
    }),
  });
  return res.json();
}
