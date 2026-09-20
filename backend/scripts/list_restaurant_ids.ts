import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), "backend/.env") });

import { COLLECTIONS, listDocuments } from "@/backend/lib/firestore";
import type { Restaurant } from "@/shared/lib/types";

async function main() {
  const all = await listDocuments<Restaurant>(COLLECTIONS.restaurants);
  const prefixes = new Map<string, number>();
  for (const r of all) {
    const prefix = r.id.split("-")[0] + "-";
    prefixes.set(prefix, (prefixes.get(prefix) ?? 0) + 1);
  }
  console.log("ID prefixes found:");
  for (const [prefix, count] of [...prefixes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${prefix.padEnd(30)} ${count}`);
  }
  console.log("\nFirst 20 IDs:");
  all.slice(0, 20).forEach((r) => console.log(" ", r.id));
}

main().catch(console.error);
