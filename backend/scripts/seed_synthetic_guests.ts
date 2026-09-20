/**
 * Push 15 synthetic guests into Firestore for the demo-vt-hacks event.
 * Run: npx tsx backend/scripts/seed_synthetic_guests.ts
 */
import { config } from "dotenv";
config({ path: "backend/.env" });

import { createResponse } from "@/backend/lib/db";
import type { DietResponse } from "@/shared/lib/types";

const EVENT_ID = "demo-vt-hacks";

const guests: DietResponse[] = [
  {
    id: "synth-01",
    event_id: EVENT_ID,
    guest_name: "Alex T.",
    raw_text: "No allergies. I love spicy food and Asian cuisines — Indian, Vietnamese are my favorites.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: ["spicy", "Indian", "Vietnamese"],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:00:00.000Z",
  },
  {
    id: "synth-02",
    event_id: EVENT_ID,
    guest_name: "Jordan P.",
    raw_text: "I'm fine with anything but I really prefer Italian food. Love pasta, pizza, good bread.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: ["Italian", "pasta", "pizza"],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:01:00.000Z",
  },
  {
    id: "synth-03",
    event_id: EVENT_ID,
    guest_name: "Sam W.",
    raw_text: "No restrictions at all. I eat everything.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: [],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:02:00.000Z",
  },
  {
    id: "synth-04",
    event_id: EVENT_ID,
    guest_name: "Mia C.",
    raw_text: "Lactose intolerant. I love Mexican food and anything with bold flavors.",
    parsed_rules: {
      hard_excludes: ["dairy"],
      soft_preferences: ["Mexican", "bold flavors"],
      severity: "medium",
    },
    submitted_at: "2026-09-19T22:03:00.000Z",
  },
  {
    id: "synth-05",
    event_id: EVENT_ID,
    guest_name: "Riley K.",
    raw_text: "No allergies at all. Big fan of Greek and Mediterranean food. Love fresh salads and hummus.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: ["Greek", "Mediterranean"],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:04:00.000Z",
  },
  {
    id: "synth-06",
    event_id: EVENT_ID,
    guest_name: "Casey B.",
    raw_text: "No dietary restrictions. Happy with whatever the group picks.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: [],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:05:00.000Z",
  },
  {
    id: "synth-07",
    event_id: EVENT_ID,
    guest_name: "Devon R.",
    raw_text: "Allergic to shellfish. Would love sushi or Japanese food if possible!",
    parsed_rules: {
      hard_excludes: ["shellfish"],
      soft_preferences: ["sushi", "Japanese"],
      severity: "high",
    },
    submitted_at: "2026-09-19T22:06:00.000Z",
  },
  {
    id: "synth-08",
    event_id: EVENT_ID,
    guest_name: "Quinn F.",
    raw_text: "I'll eat anything, no worries.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: [],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:07:00.000Z",
  },
  {
    id: "synth-09",
    event_id: EVENT_ID,
    guest_name: "Avery M.",
    raw_text: "Vegetarian, no meat or fish. I really enjoy Indian food and anything with lots of spice.",
    parsed_rules: {
      hard_excludes: ["meat", "fish", "shellfish"],
      soft_preferences: ["Indian", "spicy"],
      severity: "medium",
    },
    submitted_at: "2026-09-19T22:08:00.000Z",
  },
  {
    id: "synth-10",
    event_id: EVENT_ID,
    guest_name: "Blake D.",
    raw_text: "No food allergies. I love a good burger joint or sports bar type place. Wings and fries are my thing.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: ["burgers", "sports bar", "wings"],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:09:00.000Z",
  },
  {
    id: "synth-11",
    event_id: EVENT_ID,
    guest_name: "Taylor H.",
    raw_text: "Gluten intolerant. Love Vietnamese pho and anything with rice noodles.",
    parsed_rules: {
      hard_excludes: ["gluten"],
      soft_preferences: ["Vietnamese", "pho"],
      severity: "medium",
    },
    submitted_at: "2026-09-19T22:10:00.000Z",
  },
  {
    id: "synth-12",
    event_id: EVENT_ID,
    guest_name: "Morgan J.",
    raw_text: "No restrictions at all. Surprise me.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: [],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:11:00.000Z",
  },
  {
    id: "synth-13",
    event_id: EVENT_ID,
    guest_name: "Drew L.",
    raw_text: "No pork for religious reasons. Love Cajun food and anything Southern-style.",
    parsed_rules: {
      hard_excludes: ["pork"],
      soft_preferences: ["Cajun", "Southern"],
      severity: "medium",
    },
    submitted_at: "2026-09-19T22:12:00.000Z",
  },
  {
    id: "synth-14",
    event_id: EVENT_ID,
    guest_name: "Skyler N.",
    raw_text: "I eat anything. Big foodie. Love trying unique/ethnic restaurants.",
    parsed_rules: {
      hard_excludes: [],
      soft_preferences: ["unique cuisines", "ethnic restaurants"],
      severity: "low",
    },
    submitted_at: "2026-09-19T22:13:00.000Z",
  },
  {
    id: "synth-15",
    event_id: EVENT_ID,
    guest_name: "Charlie V.",
    raw_text: "Egg allergy. I like Chinese dumplings and dim sum style food a lot.",
    parsed_rules: {
      hard_excludes: ["egg"],
      soft_preferences: ["Chinese", "dumplings"],
      severity: "high",
    },
    submitted_at: "2026-09-19T22:14:00.000Z",
  },
];

async function main() {
  console.log(`Seeding ${guests.length} synthetic guests into event ${EVENT_ID}...`);
  for (const guest of guests) {
    try {
      await createResponse(guest);
      const prefs = guest.parsed_rules.soft_preferences;
      const label = prefs.length > 0 ? `prefs: ${prefs.join(", ")}` : "no preferences";
      console.log(`  ✓ ${guest.guest_name} (${label})`);
    } catch (err) {
      console.error(`  ✗ ${guest.guest_name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log("Done.");
}

main();
