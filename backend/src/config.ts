import { existsSync, readFileSync } from "fs";
import path from "path";

function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const envPath = path.resolve(process.cwd(), file);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  }
}

loadEnv();

export const PORT = Number(process.env.PORT || 4377);
export const HOST = process.env.HOST || "0.0.0.0";
export const MONGODB_URI = process.env.MONGODB_URI || "";
export const MONGODB_DB = process.env.MONGODB_DB || "dietre";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const AUTH_SECRET = process.env.AUTH_SECRET || "dietre-dev-secret-do-not-use-in-prod";

export function hasMongo(): boolean {
  return Boolean(MONGODB_URI);
}

export function hasGemini(): boolean {
  return Boolean(GEMINI_API_KEY);
}

export function runtimeMode() {
  return {
    mongo: hasMongo() ? "mongodb" : "local-json",
    parser: hasGemini() ? "gemini" : "mock",
    auth: "password",
    port: PORT,
  } as const;
}
