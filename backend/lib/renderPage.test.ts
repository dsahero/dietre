import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  DEFAULT_CHROMIUM_REMOTE_URL,
  detectSpaSignals,
  isServerlessRuntime,
  resolveChromePath,
} from "./renderPage";

assert.equal(isServerlessRuntime(), false, "local test should not look like Vercel");
assert.match(DEFAULT_CHROMIUM_REMOTE_URL, /chromium-v153\.0\.0-pack\.x64\.tar$/);

const chromePath = resolveChromePath();
assert.ok(chromePath.length > 0, "expected a Chrome/Edge path");
assert.equal(existsSync(chromePath), true, `chrome binary missing at ${chromePath}`);
assert.match(chromePath, /chrome|msedge/i);

const spa = detectSpaSignals(
  `<html><body><div id="root"></div><noscript>Please enable JavaScript</noscript><script>${"x".repeat(200)}</script></body></html>`,
);
assert.equal(spa.isSpa, true);
assert.ok(spa.score >= 2);

const staticPage = detectSpaSignals(
  `<html><body><h1>Menu</h1><a href="/pizza">Pizza</a><a href="/pasta">Pasta</a><a href="/drinks">Drinks</a><a href="/about">About</a><a href="/hours">Hours</a><p>${"words ".repeat(40)}</p></body></html>`,
);
assert.equal(staticPage.isSpa, false);

console.log(`renderPage tests passed (chrome: ${chromePath})`);
