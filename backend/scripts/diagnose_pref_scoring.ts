/**
 * Diagnostic: run scorePreferencesWithGemini once for a single guest against
 * the event's candidate restaurants and print the raw signals.
 *
 * Usage: npx tsx backend/scripts/diagnose_pref_scoring.ts [eventId]
 */
import { config } from "dotenv";
config({ path: "backend/.env" });

import { getEvent, listResponses, listRestaurants, listMenuItems } from "@/backend/lib/db";
import { scoreAllPreferencesWithGemini } from "@/backend/lib/parser";

const DEFAULT_EVENT_ID = "7a616db9-0eef-4b9a-bc36-472b64afd824";

async function main() {
  const eventId = process.argv[2] ?? DEFAULT_EVENT_ID;
  const event = await getEvent(eventId);
  if (!event) { console.error(`Event ${eventId} not found`); process.exit(1); }

  const [responses, allRestaurants, allItems] = await Promise.all([
    listResponses(eventId),
    listRestaurants(),
    listMenuItems(),
  ]);

  const candidateIds = new Set(event.candidate_restaurant_ids ?? []);
  const candidates = allRestaurants.filter((r) => candidateIds.has(r.id));
  const itemsByRestaurant = new Map<string, number>();
  for (const item of allItems) itemsByRestaurant.set(item.restaurant_id, (itemsByRestaurant.get(item.restaurant_id) ?? 0) + 1);
  const withMenus = candidates.filter((r) => (itemsByRestaurant.get(r.id) ?? 0) > 0);

  console.log(`Event: ${event.name}`);
  console.log(`Candidates: ${candidates.length}, with menus: ${withMenus.length}`);
  console.log(`Responses: ${responses.length}`);
  console.log(`GEMINI_API_KEY set: ${Boolean(process.env.GEMINI_API_KEY)}`);

  const withPrefs = responses.filter((r) => r.parsed_rules.soft_preferences?.length);
  console.log(`Guests with soft prefs: ${withPrefs.length}`);
  for (const r of withPrefs.slice(0, 5)) {
    console.log(`  ${r.guest_name ?? r.id}: [${r.parsed_rules.soft_preferences.join(", ")}]`);
  }

  const target = withPrefs.find((r) => r.parsed_rules.soft_preferences.join(",").toLowerCase().includes("steak"))
    ?? withPrefs[0];
  if (!target) { console.log("No guests with prefs — nothing to test."); return; }

  console.log(`\nBatch call: ${withPrefs.length} guests × ${withMenus.length} restaurants`);

  const t0 = Date.now();
  const all = await scoreAllPreferencesWithGemini(withPrefs, withMenus);
  const ms = Date.now() - t0;
  console.log(`Gemini call: ${ms}ms, returned ${all ? `${Object.keys(all).length} guests` : "NULL"}`);
  if (!all) return;

  const byName = new Map(withMenus.map((r) => [r.id, `${r.name} (${r.cuisine})`]));
  const guestName = new Map(withPrefs.map((r) => [r.id, r.guest_name ?? r.id]));

  let totalNonNeutral = 0;
  for (const [gid, signals] of Object.entries(all)) {
    const nonNeutral = Object.entries(signals).filter(([, s]) => s.direction !== "neutral");
    totalNonNeutral += nonNeutral.length;
    if (nonNeutral.length === 0) continue;
    console.log(`\n  ${guestName.get(gid)}  (${withPrefs.find((r) => r.id === gid)?.parsed_rules.soft_preferences.join(", ")})`);
    for (const [rid, s] of nonNeutral.slice(0, 8)) {
      console.log(`    ${s.direction}(${s.strength})  ${byName.get(rid) ?? rid}`);
    }
  }
  console.log(`\nTotal non-neutral signals: ${totalNonNeutral} / ${withPrefs.length * withMenus.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
