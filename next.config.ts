import type { NextConfig } from "next";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/** Next only auto-loads root `.env*`; this project keeps secrets in `backend/.env`. */
function loadBackendEnv() {
  const envPath = resolve(process.cwd(), "backend/.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Don't override vars already set by the shell / root .env
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

loadBackendEnv();

const nextConfig: NextConfig = {
  // Silences the Next.js dev-server cross-origin warning when the app is
  // reached via 127.0.0.1 instead of localhost.
  allowedDevOrigins: ["127.0.0.1"],
  // Keep pdf.js off the Turbopack/webpack graph so its worker file resolves
  // from node_modules instead of `.next/dev/server/chunks/`.
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "@firecrawl/html-extractor",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  // Keep Chromium brotli binaries in the serverless function bundle.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
