/*
 * Downstream from places.ts.
 * Normalize found menu sources (HTML pages and PDFs) into plain text JSON.
 * HTML path: JSON-LD Menu → @firecrawl/html-extractor (high recall) → cheerio selectors.
 * Item extraction → MenuItem[] is a later step.
 * Scanned/image PDFs (no extractable text) are marked empty; OCR skipped for now.
 */

import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { detectSpaSignals, renderWithBrowser } from "@/backend/lib/renderPage";

const geminiKey = process.env.GEMINI_API_KEY;
const geminiModel = geminiKey
  ? new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: "gemini-3.5-flash-lite" })
  : null;

export type MenuSource = {
  kind: "pdf" | "html";
  label: string;
  url: string;
};

export type ExtractMethod = "jsonld" | "extractor" | "selector" | "pdf" | "api-json";

export type MenuTextSource = {
  kind: "pdf" | "html";
  label: string;
  url: string;
  /** Full plain text (or JSON-LD rendered as text). */
  text: string;
  /** True when fetch/extract failed or text is too thin (e.g. image-only PDF). */
  empty: boolean;
  method?: ExtractMethod;
  error?: string;
};

export type MenuTextResult = {
  restaurant: string;
  sources: MenuTextSource[];
  /** Joined labeled blobs for a later LLM pass. */
  combined: string;
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Below this many non-whitespace chars we treat the extract as empty. */
const MIN_USEFUL_CHARS = 80;

const MENU_SELECTORS = [
  "main",
  "[role='main']",
  "#menu",
  ".menu",
  "[id*='menu']",
  "[id*='Menu']",
  "[class*='menu']",
  "[class*='Menu']",
  "[data-menu]",
  "article",
  "#content",
  ".content",
];

export async function extractMenuTexts(sources: MenuSource[]): Promise<MenuTextSource[]> {
  return Promise.all(sources.map(extractOne));
}

export async function extractMenuTextsForRestaurant(
  restaurant: string,
  sources: MenuSource[],
): Promise<MenuTextResult> {
  const extracted = await extractMenuTexts(sources);
  return {
    restaurant,
    sources: extracted,
    combined: joinMenuTexts(extracted),
  };
}

/** Full plain-text payload as JSON (includes complete `text` fields). */
export function menuTextResultToJson(result: MenuTextResult): string {
  return JSON.stringify(
    {
      restaurant: result.restaurant,
      sources: result.sources.map((s) => ({
        kind: s.kind,
        label: s.label,
        url: s.url,
        empty: s.empty,
        method: s.method ?? null,
        error: s.error ?? null,
        text: s.text,
      })),
      combined: result.combined,
    },
    null,
    2,
  );
}

/** Join multiple menu blobs with labeled separators for a later LLM pass. */
export function joinMenuTexts(sources: MenuTextSource[]): string {
  const parts: string[] = [];
  for (const s of sources) {
    if (s.empty || !s.text.trim()) continue;
    parts.push(`=== MENU: ${s.label} (${s.kind}) ===\nurl: ${s.url}\n\n${s.text.trim()}`);
  }
  return parts.join("\n\n");
}

async function extractOne(source: MenuSource): Promise<MenuTextSource> {
  try {
    if (source.kind === "pdf") {
      const text = await pdfUrlToText(source.url);
      return finalize(source, text, "pdf");
    }
    const { text, method } = await htmlUrlToText(source.url);
    return finalize(source, text, method);
  } catch (err) {
    return {
      ...source,
      text: "",
      empty: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function finalize(source: MenuSource, text: string, method: ExtractMethod): MenuTextSource {
  const cleaned = normalizeWhitespace(text);
  const useful = cleaned.replace(/\s+/g, "").length;
  return {
    ...source,
    text: cleaned,
    method,
    empty: useful < MIN_USEFUL_CHARS,
    error: useful < MIN_USEFUL_CHARS ? "extracted text too short (possible image-only or JS menu)" : undefined,
  };
}

async function htmlUrlToText(url: string): Promise<{ text: string; method: ExtractMethod }> {
  const res = await fetch(url, { redirect: "follow", headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  let html = await res.text();

  // SPA fallback: if raw HTML is a JS shell, render with browser + intercept XHR
  const spa = detectSpaSignals(html);
  if (spa.isSpa) {
    try {
      const rendered = await renderWithBrowser(url);

      // Best path: captured JSON from the menu API endpoint — use it directly
      if (rendered.capturedMenuJson.length > 0) {
        return extractMenuFromApiJson(rendered.capturedMenuJson, url);
      }

      html = rendered.html;
    } catch {
      // Continue with raw HTML
    }
  }

  return htmlToPlainText(html, url);
}

/**
 * Extract menu text from raw XHR JSON payloads captured during Puppeteer rendering.
 *
 * Tries Gemini first (understands arbitrary API schemas). Falls back to a
 * structural scan of the JSON when Gemini is unavailable.
 */
async function extractMenuFromApiJson(
  jsonBlobs: string[],
  sourceUrl: string,
): Promise<{ text: string; method: ExtractMethod }> {
  // Use the largest blob (most likely to be the full catalog) capped at 80 KB,
  // then append smaller blobs up to a 100 KB total budget.
  const sorted = [...jsonBlobs].sort((a, b) => b.length - a.length);
  const MAX_TOTAL = 100_000;
  let budget = MAX_TOTAL;
  const parts: string[] = [];
  for (const blob of sorted) {
    if (budget <= 0) break;
    parts.push(blob.slice(0, budget));
    budget -= blob.length;
  }
  const truncated = parts.join("\n\n---\n\n");

  if (geminiModel) {
    const prompt = `The following JSON was captured from a restaurant's menu API endpoint (${sourceUrl}).
Extract every food menu item as plain text. For each item output one line:
  Item Name — $price
  Description (if present, on the next indented line)

Group items under their section/category heading if the data has categories.
Skip: drink-only sections if food sections exist, modifier lists, allergen tables, metadata fields.

JSON:
${truncated}

Output plain text only — no JSON, no markdown, no commentary.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      if (text.length > 0) return { text, method: "api-json" };
    } catch {
      // Fall through to structural scan
    }
  }

  // Structural fallback: walk the JSON looking for name+price pairs
  const text = structuralJsonScan(jsonBlobs);
  return { text, method: "api-json" };
}

/**
 * Best-effort plain-text extraction from arbitrary menu JSON without Gemini.
 * Walks every object in the JSON tree and emits any that have a "name" string
 * and a numeric or string price.
 */
function structuralJsonScan(blobs: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  function walk(value: unknown, depth = 0) {
    if (depth > 12 || value == null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const v of value) walk(v, depth + 1);
      return;
    }
    const obj = value as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name.trim() : null;
    const price = obj.price ?? obj.cost ?? obj.basePrice ?? obj.minPrice ?? null;
    const desc = typeof obj.description === "string" ? obj.description.trim() : null;

    if (name && price != null) {
      const key = `${name}|${price}`;
      if (!seen.has(key)) {
        seen.add(key);
        lines.push(`${name} — $${price}`);
        if (desc) lines.push(`  ${desc}`);
      }
    }
    for (const v of Object.values(obj)) walk(v, depth + 1);
  }

  // Walk the largest blob first (most complete catalog)
  const sorted = [...blobs].sort((a, b) => b.length - a.length);
  for (const blob of sorted) {
    try {
      walk(JSON.parse(blob));
    } catch {
      // Malformed JSON — skip
    }
  }

  return lines.join("\n");
}

/**
 * HTML → plain text with high-recall pipeline.
 * Prefer structured Menu JSON-LD; else Firecrawl extractor; else cheerio selectors.
 */
export async function htmlToPlainText(
  html: string,
  url?: string,
): Promise<{ text: string; method: ExtractMethod }> {
  const $ = cheerio.load(html);

  const fromLd = extractJsonLdMenuText($);
  if (fromLd && isUsefulJsonLd(fromLd)) {
    return { text: fromLd, method: "jsonld" };
  }

  const fromExtractor = await extractWithFirecrawl(html, url);
  if (isUseful(fromExtractor)) {
    return { text: fromExtractor!, method: "extractor" };
  }

  const fromSelectors = extractWithCheerioSelectors($);
  return { text: fromSelectors, method: "selector" };
}

async function extractWithFirecrawl(html: string, url?: string): Promise<string | null> {
  try {
    const { extract } = await import("@firecrawl/html-extractor");
    const result = await extract(html, {
      url,
      favorRecall: true,
      outputText: true,
      pageTypeOverride: "listing",
      includeTables: true,
      includeLinks: false,
      includeImages: false,
      includeMetadata: false,
    });
    const text = (result.text ?? result.markdown ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

function extractWithCheerioSelectors($: cheerio.CheerioAPI): string {
  $("script, style, noscript, svg, iframe").remove();
  $("nav, footer, header, aside").remove();

  for (const sel of MENU_SELECTORS) {
    const nodes = $(sel);
    if (!nodes.length) continue;
    const chunks: string[] = [];
    nodes.each((_, el) => {
      const t = elementToText($, el);
      if (t.trim()) chunks.push(t);
    });
    const joined = chunks.join("\n\n");
    if (isUseful(joined)) return joined;
  }

  return elementToText($, $("body").get(0) ?? $.root().get(0));
}

function elementToText($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0] | null | undefined): string {
  if (el == null) return "";
  const $el = $(el).clone();
  $el.find("br").replaceWith("\n");
  $el.find("p, div, section, article, li, tr, h1, h2, h3, h4, h5, h6, hr").each((_, node) => {
    $(node).append("\n");
  });
  $el.find("td, th").each((_, node) => {
    $(node).append("\t");
  });
  return $el.text();
}

export function extractJsonLdMenuText($: cheerio.CheerioAPI): string | null {
  const nodes: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw?.trim()) return;
    try {
      collectLdNodes(JSON.parse(raw), nodes);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  });

  const menus = nodes.filter((n) => ldTypeIncludes(n, "Menu"));
  const sections = nodes.filter((n) => ldTypeIncludes(n, "MenuSection"));
  const items = nodes.filter((n) => ldTypeIncludes(n, "MenuItem"));

  const out: string[] = [];
  if (menus.length) {
    for (const menu of menus) formatLdMenuNode(menu, out, 0);
  } else if (sections.length) {
    for (const section of sections) formatLdMenuNode(section, out, 0);
  } else if (items.length) {
    for (const item of items) formatLdMenuItem(item, out, 0);
  }

  return out.length ? out.join("\n") : null;
}

function collectLdNodes(value: unknown, out: Record<string, unknown>[]): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const v of value) collectLdNodes(v, out);
    return;
  }
  if (typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  out.push(obj);
  if (obj["@graph"]) collectLdNodes(obj["@graph"], out);
  if (obj.hasMenuSection) collectLdNodes(obj.hasMenuSection, out);
  if (obj.hasMenuItem) collectLdNodes(obj.hasMenuItem, out);
  if (obj.hasMenu) collectLdNodes(obj.hasMenu, out);
  if (obj.menu) collectLdNodes(obj.menu, out);
  if (obj.itemListElement) collectLdNodes(obj.itemListElement, out);
}

function ldTypeIncludes(node: Record<string, unknown>, typeName: string): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t === typeName || t.endsWith("/" + typeName);
  if (Array.isArray(t)) {
    return t.some((x) => typeof x === "string" && (x === typeName || x.endsWith("/" + typeName)));
  }
  return false;
}

function formatLdMenuNode(node: Record<string, unknown>, lines: string[], depth: number): void {
  const name = ldName(node);
  if (name) lines.push(`${"  ".repeat(depth)}${name}`);

  const sections = asArray(node.hasMenuSection);
  for (const section of sections) {
    if (section && typeof section === "object") {
      formatLdMenuNode(section as Record<string, unknown>, lines, depth + (name ? 1 : 0));
    }
  }

  const items = [...asArray(node.hasMenuItem), ...asArray(node.itemListElement)];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    // ListItem wrapper
    const inner = (obj.item as Record<string, unknown> | undefined) ?? obj;
    formatLdMenuItem(inner, lines, depth + (name ? 1 : 0));
  }
}

function formatLdMenuItem(node: Record<string, unknown>, lines: string[], depth: number): void {
  const name = ldName(node);
  if (!name) return;
  const indent = "  ".repeat(depth);
  const desc = typeof node.description === "string" ? node.description.trim() : "";
  const price = ldPrice(node);
  let line = `${indent}${name}`;
  if (price) line += ` — ${price}`;
  lines.push(line);
  if (desc) lines.push(`${indent}  ${desc}`);
}

function ldName(node: Record<string, unknown>): string {
  const n = node.name;
  if (typeof n === "string") return n.trim();
  if (n && typeof n === "object" && typeof (n as { value?: string }).value === "string") {
    return (n as { value: string }).value.trim();
  }
  return "";
}

function ldPrice(node: Record<string, unknown>): string {
  const offers = node.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer || typeof offer !== "object") {
    if (typeof node.price === "string" || typeof node.price === "number") return String(node.price);
    return "";
  }
  const o = offer as Record<string, unknown>;
  const price = o.price ?? o.lowPrice;
  const currency = typeof o.priceCurrency === "string" ? o.priceCurrency : "";
  if (price == null) return "";
  return currency ? `${currency} ${price}` : String(price);
}

function asArray(value: unknown): unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function isUseful(text: string | null | undefined): boolean {
  if (!text) return false;
  return text.replace(/\s+/g, "").length >= MIN_USEFUL_CHARS;
}

/** Structured Menu JSON-LD can be short but still complete — lower bar. */
export function isUsefulJsonLd(text: string): boolean {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  if (lines.length >= 2) return true;
  return text.replace(/\s+/g, "").length >= 20;
}

async function pdfUrlToText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow", headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5 || buf.subarray(0, 4).toString("utf8") !== "%PDF") {
    const asText = buf.toString("utf8", 0, Math.min(buf.length, 200));
    if (/<html/i.test(asText)) {
      throw new Error("expected PDF but got HTML");
    }
  }
  return pdfBufferToText(buf);
}

/** Extract plain text from an uploaded/fetched PDF buffer. */
export async function pdfBufferToText(buf: Buffer): Promise<string> {
  // Next.js bundles break pdf.js worker resolution ("Setting up fake worker failed").
  // Prefer the embedded worker data URL from pdf-parse/worker; keep packages
  // external via next.config serverExternalPackages.
  const { getData } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(getData());

  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
