/*
 * SPA detection + Puppeteer rendering.
 *
 * Shared by places.ts (link extraction) and menuParser.ts (text extraction).
 *
 * Flow:
 *   1. Caller already has raw HTML from a plain fetch.
 *   2. looksLikeSpa(rawHtml) checks heuristic signals.
 *   3. If SPA → renderWithBrowser(url) launches headless Chrome,
 *      waits for JS to settle, returns the fully-rendered HTML.
 *   4. Caller continues with the rendered HTML.
 */

import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// SPA heuristic — cheap, runs on the raw HTML you already fetched
// ---------------------------------------------------------------------------

export interface SpaSignals {
  fewLinks: boolean;
  thinBody: boolean;
  spaMount: boolean;
  noscriptWarning: boolean;
  scriptHeavy: boolean;
  score: number;
  isSpa: boolean;
}

/**
 * Heuristic SPA check on raw (non-rendered) HTML.
 * Returns signal details + a boolean verdict.
 * Threshold: score >= 2 signals → treat as SPA.
 */
export function detectSpaSignals(rawHtml: string): SpaSignals {
  const $ = cheerio.load(rawHtml);

  // 1. Very few real <a> links
  const linkCount = $("a[href]").filter((_, el) => {
    const href = $(el).attr("href") ?? "";
    return !!href && !href.startsWith("#") && !href.toLowerCase().startsWith("javascript:");
  }).length;
  const fewLinks = linkCount < 5;

  // 2. Body text is thin (strip scripts/styles first)
  const $body = $("body").clone();
  $body.find("script, style, noscript, svg").remove();
  const bodyText = $body.text().replace(/\s+/g, " ").trim();
  const thinBody = bodyText.length < 100;

  // 3. SPA mount-point divs
  const spaMount = !!(
    $("#root").length ||
    $("#app").length ||
    $("#__next").length ||
    $("#__nuxt").length ||
    $("[data-reactroot]").length ||
    $("[ng-app]").length ||
    $("[ng-version]").length
  );

  // 4. <noscript> warning about JS
  const noscriptText = $("noscript").text().toLowerCase();
  const noscriptWarning =
    noscriptText.includes("javascript") ||
    noscriptText.includes("enable") ||
    noscriptText.includes("browser");

  // 5. Script-heavy: script bytes > 60% of total HTML
  let scriptBytes = 0;
  $("script").each((_, el) => {
    scriptBytes += ($(el).html() ?? "").length;
  });
  const scriptHeavy = rawHtml.length > 500 && scriptBytes / rawHtml.length > 0.6;

  const score =
    Number(fewLinks) +
    Number(thinBody) +
    Number(spaMount) +
    Number(noscriptWarning) +
    Number(scriptHeavy);

  return {
    fewLinks,
    thinBody,
    spaMount,
    noscriptWarning,
    scriptHeavy,
    score,
    isSpa: score >= 2,
  };
}

// ---------------------------------------------------------------------------
// Puppeteer rendering — only called when SPA is detected
// ---------------------------------------------------------------------------

let browserPromise: ReturnType<typeof launchBrowser> | null = null;

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");

  // Find Chrome: puppeteer cache, common install paths, or CHROME_PATH env
  const executablePath =
    process.env.CHROME_PATH ?? findChrome();

  return puppeteer.default.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

function findChrome(): string {
  const { execSync } = require("child_process");

  // Check puppeteer's cache first (from `npx puppeteer browsers install chrome`)
  try {
    const out = execSync("npx puppeteer browsers list", {
      encoding: "utf8",
      timeout: 10_000,
    });
    const chromeLine = out
      .split("\n")
      .find((l: string) => l.includes("chrome") && !l.includes("headless"));
    if (chromeLine) {
      const path = chromeLine.split(" ").pop()?.trim();
      if (path) return path;
    }
  } catch {
    /* fallthrough */
  }

  // Common Windows paths
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ];
  const fs = require("fs");
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    "Chrome not found. Set CHROME_PATH or run: npx puppeteer browsers install chrome",
  );
}

async function getBrowser() {
  if (!browserPromise) browserPromise = launchBrowser();
  return browserPromise;
}

export interface RenderResult {
  html: string;
  /** True if network monitoring confirmed SPA behavior (no document navigations after initial load). */
  confirmedSpa: boolean;
  /** Number of XHR/fetch requests observed (data-loading signal). */
  apiRequestCount: number;
  /**
   * Raw JSON bodies captured from XHR/fetch calls whose URL and payload look
   * menu-related. These are the original source data before React/Vue rendered
   * them into DOM — far cleaner for item extraction than parsing the final HTML.
   */
  capturedMenuJson: string[];
}

// ---------------------------------------------------------------------------
// Menu endpoint / payload heuristics for XHR interception
// ---------------------------------------------------------------------------

/** URL patterns that suggest this XHR call carries menu data. */
function looksLikeMenuEndpoint(resUrl: string): boolean {
  return /menu|item|product|catalog|offering|entree|dish|food/i.test(resUrl);
}

/**
 * Confirm the response body actually looks like menu data, not a tiny
 * config blob or an unrelated JSON call.
 * Checks size + presence of typical menu field names.
 */
function looksLikeMenuPayload(json: string): boolean {
  if (json.length < 500) return false;
  return /"(?:name|title|price|description|items|categories|sections|products|menuGroups|modifiers)"/i.test(
    json,
  );
}

/**
 * Render a URL with headless Chrome + network monitoring + XHR interception.
 *
 * - Watches the network tab: document navigations → MPA signal; XHR → SPA signal.
 * - Intercepts JSON responses from menu-looking endpoints and captures their bodies.
 * - Waits for JS to settle, then returns the fully-rendered DOM HTML alongside
 *   any captured menu JSON payloads.
 */
export async function renderWithBrowser(
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<RenderResult> {
  const timeout = opts.timeoutMs ?? 15_000;
  const browser = await getBrowser();
  const page = await browser.newPage();

  let documentResponses = 0;
  let apiRequestCount = 0;
  let initialNavDone = false;
  const capturedMenuJson: string[] = [];

  // Must be enabled before goto() so interception is active from the first request
  await page.setRequestInterception(true);

  // Pass every request through unchanged — we only want to read responses
  page.on("request", (req) => req.continue());

  page.on("response", async (res) => {
    const resType = res.request().resourceType();

    // Track document navigations (MPA vs SPA signal)
    if (resType === "document" && initialNavDone) {
      documentResponses++;
    }

    // Count all XHR/fetch calls
    if (resType === "xhr" || resType === "fetch") {
      apiRequestCount++;

      // Intercept JSON responses from menu-looking endpoints
      const ct = res.headers()["content-type"] ?? "";
      if (ct.includes("application/json") && looksLikeMenuEndpoint(res.url())) {
        try {
          const body = await res.text();
          if (looksLikeMenuPayload(body)) {
            capturedMenuJson.push(body);
            console.log(`  [render] captured menu JSON from ${res.url()} (${body.length} bytes)`);
          }
        } catch {
          // Response body already consumed or network error — skip
        }
      }
    }
  });

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    initialNavDone = true;

    // Wait for JS rendering to settle — networkidle catches API data loads
    await page.waitForNetworkIdle({ idleTime: 1500, timeout }).catch(() => {
      /* timeout is ok — some sites never go fully idle */
    });

    const html = await page.content();
    const confirmedSpa = documentResponses === 0;

    return { html, confirmedSpa, apiRequestCount, capturedMenuJson };
  } finally {
    await page.close();
  }
}

/** Shut down the shared browser instance (call on process exit). */
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    browserPromise = null;
    await browser.close();
  }
}
