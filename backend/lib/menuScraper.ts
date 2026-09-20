/*
 * Reusable restaurant menu scraping pipeline.
 *
 * Extracted from places.ts for use as an API-driven process.
 * Given a list of restaurants (with websites), crawls for menu pages,
 * extracts menu text, and models menu items.
 *
 * Core flow per restaurant:
 *   1. Fetch website → extract all links with Cheerio
 *   2. JSON-LD shortcut: if structured menu data found, use it immediately
 *   3. Give Gemini the link list → it picks menu links or navigates deeper
 *   4. Follow found menu URLs through menuParser for text extraction
 *   5. Model menu items via ingredient_modeling
 */

import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonLdMenuText, isUsefulJsonLd } from "@/backend/lib/menuParser";
import { detectSpaSignals, renderWithBrowser, closeBrowser } from "@/backend/lib/renderPage";
import type { MenuItem, Restaurant } from "@/shared/lib/types";

const geminiKey = process.env.GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const geminiModel = genAI?.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

const MAX_LAYER = 2;
const MAX_LINKS = 80;

export type LogFn = (message: string) => void;

export type LinkCandidate = {
  id: number;
  kind: "pdf" | "html";
  label: string;
  url: string;
};

type FoundMenu = {
  restaurant: string;
  restaurantId: string;
  layer: number;
  menus: LinkCandidate[];
  reason: string;
};

type RestaurantJob = {
  id: string;
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

export type ScrapeResult = {
  restaurantId: string;
  restaurantName: string;
  menuUrls: { kind: "pdf" | "html"; label: string; url: string }[];
  menuItems: MenuItem[];
  stats: { total: number; withIngredients: number; withoutIngredients: number };
};

/**
 * Run the full menu scraping pipeline for a set of restaurants.
 * Streams progress via the `log` callback for real-time UI updates.
 */
export async function scrapeRestaurantMenus(
  restaurants: Pick<Restaurant, "id" | "name" | "location" | "website">[],
  log: LogFn
): Promise<ScrapeResult[]> {
  const withWebsites = restaurants.filter((r) => r.website);
  if (withWebsites.length === 0) {
    log("No restaurants have websites — nothing to scrape.");
    return [];
  }

  log(`Starting menu scrape for ${withWebsites.length} restaurant(s)…`);

  const jobs: RestaurantJob[] = withWebsites.map((r) => {
    const url = r.website!;
    const locationHint = r.location.split(",")[0]?.trim() ?? r.name;
    return {
      id: r.id,
      name: r.name,
      locationHint,
      startUrl: url,
      startRoot: rootDomain(new URL(url).hostname),
      visited: new Set<string>(),
      layerUrls: [url],
      done: false,
      found: null,
    };
  });

  // Layer-by-layer crawling
  for (let layer = 0; layer <= MAX_LAYER; layer++) {
    const active = jobs.filter((j) => !j.done && j.layerUrls.length > 0);
    if (active.length === 0) break;

    log(`\n━━━ Layer ${layer} — ${active.length} restaurant(s) active ━━━`);

    const jobLinks = await Promise.all(
      active.map(async (job) => {
        log(`\n🔍 [${job.name}] Fetching…`);
        const links = await collectFromLayer(job, layer, log);
        return { job, links };
      })
    );

    const needGemini: { job: RestaurantJob; links: LinkCandidate[] }[] = [];
    for (const { job, links } of jobLinks) {
      if (job.done) continue;
      if (links.length === 0) {
        log(`[${job.name}] No links found — done`);
        job.done = true;
        continue;
      }
      log(`[${job.name}] ${links.length} links extracted`);
      needGemini.push({ job, links });
    }

    if (needGemini.length === 0) continue;

    log(`\n🤖 Gemini picking menus for ${needGemini.length} restaurant(s)…`);
    const batch = await pickBatchWithGemini(
      layer,
      needGemini.map(({ job, links }) => ({
        name: job.name,
        locationHint: job.locationHint,
        links,
      })),
      log
    );

    for (const { job, links } of needGemini) {
      const pick = batch[job.name] ?? { ids: [], action: "none" as const, reason: "no pick" };
      applyPick(job, layer, links, pick, log);
    }
  }

  // Extract menu text + model items
  log("\n━━━ Menu Extraction & Item Parsing ━━━");
  const results: ScrapeResult[] = [];

  const { extractMenuTextsForRestaurant } = await import("@/backend/lib/menuParser");
  const { modelMenuItems, rawItemsToMenuItems } = await import("@/backend/lib/ingredient_modeling");

  for (const job of jobs) {
    if (!job.found?.menus.length) {
      log(`[${job.name}] No menus found`);
      results.push({
        restaurantId: job.id,
        restaurantName: job.name,
        menuUrls: [],
        menuItems: [],
        stats: { total: 0, withIngredients: 0, withoutIngredients: 0 },
      });
      continue;
    }

    log(`\n📄 [${job.name}] Extracting text from ${job.found.menus.length} menu source(s)…`);
    const menuSources = job.found.menus.map((m) => ({
      kind: m.kind as "pdf" | "html",
      label: m.label,
      url: m.url,
    }));

    const result = await extractMenuTextsForRestaurant(job.name, menuSources);
    if (!result.combined.trim()) {
      log(`[${job.name}] No menu text extracted — skipping item parse`);
      results.push({
        restaurantId: job.id,
        restaurantName: job.name,
        menuUrls: menuSources,
        menuItems: [],
        stats: { total: 0, withIngredients: 0, withoutIngredients: 0 },
      });
      continue;
    }

    log(`[${job.name}] Parsing menu items…`);
    const { items: rawItems, stats } = await modelMenuItems(job.id, result.combined);
    const menuItems = rawItemsToMenuItems(rawItems);

    log(
      `✅ [${job.name}] ${stats.total} items parsed (${stats.withIngredients} with ingredients)`
    );

    for (const m of menuSources) {
      log(`   📎 [${m.kind}] ${m.label} → ${m.url}`);
    }

    results.push({
      restaurantId: job.id,
      restaurantName: job.name,
      menuUrls: menuSources,
      menuItems,
      stats,
    });
  }

  try {
    await closeBrowser();
  } catch {
    // Browser may not have been opened
  }

  log(`\n━━━ Scrape Complete ━━━`);
  const found = results.filter((r) => r.menuUrls.length > 0);
  log(`Found menus for ${found.length}/${results.length} restaurants`);
  const totalItems = results.reduce((sum, r) => sum + r.menuItems.length, 0);
  log(`Total menu items: ${totalItems}`);

  return results;
}

// ---------------------------------------------------------------------------
// Link extraction (one Cheerio pass)
// ---------------------------------------------------------------------------

function extractAllLinks(
  html: string,
  baseUrl: string,
  startRoot: string,
  visited: Set<string>,
  limit: number
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
// Layer collection
// ---------------------------------------------------------------------------

async function collectFromLayer(
  job: RestaurantJob,
  layer: number,
  log: LogFn
): Promise<LinkCandidate[]> {
  const urls = [...job.layerUrls];
  job.layerUrls = [];

  const fetched = await Promise.allSettled(
    urls.map(async (url) => {
      log(`  → Fetching: ${url}`);
      const result = await fetchWithFallback(job.name, url, log);
      return result ? { ...result, originalUrl: url } : null;
    })
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

    const $raw = cheerio.load(html) as unknown as cheerio.CheerioAPI;
    const jsonLdText = extractJsonLdMenuText($raw);
    if (jsonLdText && isUsefulJsonLd(jsonLdText)) {
      log(`  ✓ [${job.name}] JSON-LD menu found on ${finalUrl}`);
      finishJob(job, layer, [{ id: 0, kind: "html", label: "(JSON-LD menu)", url: finalUrl }], "structured JSON-LD menu on page", log);
      return [];
    }

    const spa = detectSpaSignals(html);
    if (spa.isSpa) {
      log(`  ⚡ [${job.name}] SPA detected — rendering with browser…`);
      try {
        const rendered = await renderWithBrowser(finalUrl);
        html = rendered.html;
        log(`  ✓ Browser render complete`);
        const $rendered = cheerio.load(html) as unknown as cheerio.CheerioAPI;
        const renderedLd = extractJsonLdMenuText($rendered);
        if (renderedLd && isUsefulJsonLd(renderedLd)) {
          log(`  ✓ [${job.name}] JSON-LD menu found after browser render`);
          finishJob(job, layer, [{ id: 0, kind: "html", label: "(JSON-LD menu, SPA)", url: finalUrl }], "JSON-LD on SPA-rendered page", log);
          return [];
        }
      } catch (err) {
        log(`  ⚠ Browser render failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    const links = extractAllLinks(html, finalUrl, job.startRoot, job.visited, MAX_LINKS);
    allLinks.push(...links);

    if (layer > 0) {
      allLinks.push({ id: 0, kind: "html", label: `(current page) ${finalUrl}`, url: finalUrl });
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
  log: LogFn
) {
  const selected = links.filter((c) => pick.ids.includes(c.id));
  log(`[${job.name}] action=${pick.action} — ${pick.reason}`);

  if (selected.length === 0) {
    job.done = true;
    log(`[${job.name}] Nothing valid selected — done`);
    return;
  }

  for (const c of selected) {
    log(`  ${pick.action === "navigate" ? "→ FOLLOW" : "✓ SELECTED"} [${c.kind}] "${c.label}" → ${c.url}`);
  }

  if (pick.action === "menu_found") {
    finishJob(job, layer, selected, pick.reason, log);
    return;
  }

  if (pick.action === "navigate" && layer < MAX_LAYER) {
    job.layerUrls = selected
      .map((c) => c.url)
      .filter((u) => !job.visited.has(stripHash(u)))
      .slice(0, 3);

    if (job.layerUrls.length === 0) {
      finishJob(job, layer, selected, `${pick.reason} (targets visited, using as menu)`, log);
      return;
    }
    log(`[${job.name}] Navigating to ${job.layerUrls.length} URL(s) next layer`);
    return;
  }

  finishJob(job, layer, selected, pick.reason, log);
}

function finishJob(
  job: RestaurantJob,
  layer: number,
  menus: LinkCandidate[],
  reason: string,
  log: LogFn
) {
  job.done = true;
  job.found = { restaurant: job.name, restaurantId: job.id, layer, menus, reason };
  job.layerUrls = [];
  for (const m of menus) {
    log(`  📋 [${job.name}] FOUND [${m.kind}] "${m.label}" → ${m.url}`);
  }
}

// ---------------------------------------------------------------------------
// Gemini batch pick
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
  log: LogFn
): Promise<Record<string, GeminiPick>> {
  const out: Record<string, GeminiPick> = {};

  if (!geminiKey) {
    log("  No GEMINI_API_KEY — using heuristic fallback");
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
- "menu_found": the selected link(s) ARE the food menu. Pick 1–3 best.
- "navigate": some link(s) could LEAD to the menu. Pick 1–3 to follow.
- "none": nothing looks useful.

Guidelines:
- Prefer: PDF menus, /menu pages, online ordering with full item lists.
- Reject: careers, gift cards, social media, app stores, privacy policy.
- A link labeled "Menu" or whose URL contains /menu is very likely "menu_found".

${blocks}

Return ONLY JSON:
{
  "picks": [
    { "restaurant": string, "ids": number[], "action": "menu_found" | "navigate" | "none", "reason": string }
  ]
}`;

  try {
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
    log(`  ⚠ Gemini failed: ${err instanceof Error ? err.message : err}`);
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
  log: LogFn
): Promise<{ html: string; finalUrl: string } | null> {
  const variants: string[] = [url];
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    if (u.href !== url) variants.push(u.href);
    // Stripping a Facebook listing down to facebook.com/ just 400s.
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
      if (attempt !== url) log(`  [${name}] retry: ${attempt}`);
      const html = await fetchHtml(attempt);
      return { html, finalUrl: attempt };
    } catch (err) {
      lastErr = err;
    }
  }

  // Cloudflare/Akamai often 403 Node's fetch but will serve a real browser.
  if (isAntiBotStatus(lastErr)) {
    try {
      log(`  ⚡ [${name}] Fetch blocked (${lastErr instanceof Error ? lastErr.message : lastErr}) — rendering with browser…`);
      const rendered = await renderWithBrowser(url);
      if (rendered.html.trim()) return { html: rendered.html, finalUrl: url };
    } catch (err) {
      log(`  ⚠ Browser render failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  log(`  ⚠ [${name}] Fetch failed: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
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
