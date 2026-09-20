/**
 * Push 5 synthetic guests into the Miami demo event.
 * Run: npx tsx --env-file=backend/.env backend/scripts/seed_synthetic_guests.ts
 * Optional: npx tsx --env-file=backend/.env backend/scripts/seed_synthetic_guests.ts <eventId>
 */
import { createResponse } from "@/backend/lib/db";
import type { DietResponse } from "@/shared/lib/types";

const EVENT_ID = process.argv[2]?.trim() || "e91a7405-0e90-4b69-8401-da3280544192";

const guests: DietResponse[] = [
  {
    id: `miami-synth-01-${EVENT_ID.slice(0, 8)}`,
    event_id: EVENT_ID,
    guest_name: "Maya R.",
    raw_text:
      "Severe peanut allergy — anaphylaxis risk. Also avoid tree nuts. Happy with seafood, Cuban, or Latin food otherwise.",
    parsed_rules: {
      hard_excludes: ["peanuts", "tree nuts"],
      soft_preferences: ["Cuban", "Latin", "seafood"],
      severity: "high",
    },
    submitted_at: "2026-09-20T05:00:00.000Z",
  },
  {
    id: `miami-synth-02-${EVENT_ID.slice(0, 8)}`,
    event_id: EVENT_ID,
    guest_name: "Jonah K.",
    raw_text: "Vegetarian — no meat, poultry, or fish. Love Italian and Mediterranean spots with pasta and salads.",
    parsed_rules: {
      hard_excludes: ["meat", "poultry", "fish", "shellfish"],
      soft_preferences: ["Italian", "Mediterranean", "vegetarian"],
      severity: "medium",
    },
    submitted_at: "2026-09-20T05:01:00.000Z",
  },
  {
    id: `miami-synth-03-${EVENT_ID.slice(0, 8)}`,
    event_id: EVENT_ID,
    guest_name: "Priya S.",
    raw_text: "Lactose intolerant, no dairy. Big fan of spicy Asian food — Thai, Indian, Vietnamese.",
    parsed_rules: {
      hard_excludes: ["dairy"],
      soft_preferences: ["Thai", "Indian", "Vietnamese", "spicy"],
      severity: "medium",
    },
    submitted_at: "2026-09-20T05:02:00.000Z",
  },
  {
    id: `miami-synth-04-${EVENT_ID.slice(0, 8)}`,
    event_id: EVENT_ID,
    guest_name: "Carlos M.",
    raw_text: "No pork for religious reasons. Everything else is fine — burgers, tacos, sushi all good.",
    parsed_rules: {
      hard_excludes: ["pork"],
      soft_preferences: ["burgers", "tacos", "sushi"],
      severity: "medium",
    },
    submitted_at: "2026-09-20T05:03:00.000Z",
  },
  {
    id: `miami-synth-05-${EVENT_ID.slice(0, 8)}`,
    event_id: EVENT_ID,
    guest_name: "Elena V.",
    raw_text: "Celiac / gluten-free only. Prefer lighter seafood or salad-forward places in Brickell.",
    parsed_rules: {
      hard_excludes: ["gluten", "wheat"],
      soft_preferences: ["seafood", "salads", "gluten-free"],
      severity: "high",
    },
    submitted_at: "2026-09-20T05:04:00.000Z",
  },
];

async function main() {
  console.log(`Seeding ${guests.length} synthetic guests into event ${EVENT_ID}...`);
  for (const guest of guests) {
    try {
      await createResponse(guest);
      const excludes = guest.parsed_rules.hard_excludes;
      const label = excludes.length > 0 ? `excludes: ${excludes.join(", ")}` : "no hard excludes";
      console.log(`  ✓ ${guest.guest_name} (${guest.parsed_rules.severity}) — ${label}`);
    } catch (err) {
      console.error(`  ✗ ${guest.guest_name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log("Done. Refresh the event dashboard and run matching.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
