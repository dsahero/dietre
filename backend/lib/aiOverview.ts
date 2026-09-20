import type {
  DietreEvent,
  DietResponse,
  EventAiOverview,
  MatchResult,
  RestaurantMatch,
} from "@/shared/lib/types";
import { withTimeout } from "@/backend/lib/with-timeout";

// AI-authored, host-facing narration layered on top of the deterministic
// match output. Everything here is Gemini-only for the *phrasing*; with no
// API key we still return a useful deterministic summary built straight from
// the match numbers, so the panel is never empty (mirrors the rest of the
// app's "mock mode" fallbacks rather than hiding the feature entirely).

export type EventOverview = {
  // One punchy sentence for the panel header.
  headline: string;
  // A short paragraph explaining why the top venues ranked where they did.
  whyChosen: string;
  // Concrete next steps for the host: who to reach out to, what to fix.
  recommendations: string[];
  source: "ai" | "fallback";
};

export type OverviewPayload = {
  event: EventOverview;
  // restaurantId -> 2-3 sentence plain-English "why this venue" summary.
  restaurants: Record<string, string>;
  generated_at: string;
};

const TOP_RESTAURANTS = 6;

// Best venues first: eligible (in radius & budget) ahead of the rest, then
// by the host-facing overall score. Mirrors the dashboard's default sort so
// the AI narration talks about the same venues the host sees at the top.
function rankRestaurants(restaurants: RestaurantMatch[]): RestaurantMatch[] {
  return [...restaurants].sort((a, b) => {
    const aEligible = a.within_radius && a.within_budget ? 1 : 0;
    const bEligible = b.within_radius && b.within_budget ? 1 : 0;
    if (aEligible !== bEligible) return bEligible - aEligible;
    if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
    return a.distance_miles - b.distance_miles;
  });
}

function confidenceLabel(r: RestaurantMatch): string {
  const tier = r.confidence?.tier ?? "unknown";
  return tier === "unknown" ? "unknown menu confidence" : `${tier} menu confidence`;
}

function responseLabel(res: DietResponse | undefined, fallback: string): string {
  if (!res) return fallback;
  return res.guest_name?.trim() || fallback;
}

// ---------------------------------------------------------------------------
// Deterministic fallback (no API key, timeout, or parse failure)
// ---------------------------------------------------------------------------

function fallbackRestaurantSummary(r: RestaurantMatch): string {
  const parts: string[] = [];
  const eligibility =
    r.within_radius && r.within_budget
      ? "inside your radius and budget"
      : !r.within_radius
      ? "outside your search radius"
      : "over your per-person budget";
  const coverageWord =
    r.covered_count === r.total_responses
      ? `feeds all ${r.total_responses} guests`
      : `covers ${r.covered_count} of ${r.total_responses} guests (${r.weighted_coverage_pct}% weighted)`;
  parts.push(
    `${r.restaurant.name} (${r.restaurant.cuisine}) ${coverageWord}, ${eligibility}, ~$${r.predicted_cost_per_person}/person and ${r.distance_miles} mi away.`
  );

  const safeNames = (r.safe_items ?? [])
    .map((s) => s.item?.name)
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    .slice(0, 3);
  if (safeNames.length > 0) {
    parts.push(`Safe picks include ${safeNames.join(", ")}.`);
  }

  const trailer: string[] = [];
  if (r.confidence?.rank_utilitarian) trailer.push(`ranks #${r.confidence.rank_utilitarian} for your group`);
  trailer.push(confidenceLabel(r));
  parts.push(`${trailer.join(", ")}.`.replace(/^./, (c) => c.toUpperCase()));
  if (r.restaurant.phone) {
    parts.push(`Call ahead at ${r.restaurant.phone}.`);
  }
  return parts.join(" ");
}

// Tally free-text tags (hard excludes, preferences) into a ranked top-N.
function topCounts(items: string[], n: number): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const raw of items) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

type TableAnalysis = {
  total: number;
  severity: { high: number; medium: number; low: number };
  topExcludes: { label: string; count: number }[];
  topPrefs: { label: string; count: number }[];
  complexCount: number;
  eligible: RestaurantMatch[];
  fullCoverage: RestaurantMatch[];
  cheapestFull?: RestaurantMatch;
  closestFull?: RestaurantMatch;
  cuisines: string[];
  priceLow?: number;
  priceHigh?: number;
};

// Turn the raw match + responses into the handful of concrete facts an
// organizer actually wants: who's hardest to feed, what's driving the
// ranking, and which venues win on value / distance / variety.
function analyzeTable(responses: DietResponse[], ranked: RestaurantMatch[]): TableAnalysis {
  const severity = { high: 0, medium: 0, low: 0 };
  const excludes: string[] = [];
  const prefs: string[] = [];
  let complexCount = 0;
  for (const r of responses) {
    const rules = r.parsed_rules;
    severity[rules.severity] = (severity[rules.severity] ?? 0) + 1;
    excludes.push(...(rules.hard_excludes ?? []));
    prefs.push(...(rules.soft_preferences ?? []));
    if (rules.complex_restrictions?.length) complexCount += 1;
  }

  const eligible = ranked.filter((r) => r.within_radius && r.within_budget);
  const fullCoverage = eligible.filter((r) => r.covered_count === r.total_responses);
  const cheapestFull = [...fullCoverage].sort(
    (a, b) => a.predicted_cost_per_person - b.predicted_cost_per_person
  )[0];
  const closestFull = [...fullCoverage].sort((a, b) => a.distance_miles - b.distance_miles)[0];
  const cuisines = [...new Set(fullCoverage.map((r) => r.restaurant.cuisine).filter(Boolean))].slice(0, 6);
  const costs = eligible.map((r) => r.predicted_cost_per_person).filter((c) => c > 0);

  return {
    total: responses.length,
    severity,
    topExcludes: topCounts(excludes, 4),
    topPrefs: topCounts(prefs, 3),
    complexCount,
    eligible,
    fullCoverage,
    cheapestFull,
    closestFull,
    cuisines,
    priceLow: costs.length ? Math.min(...costs) : undefined,
    priceHigh: costs.length ? Math.max(...costs) : undefined,
  };
}

function fallbackEventOverview(
  event: DietreEvent,
  match: MatchResult,
  responses: DietResponse[],
  ranked: RestaurantMatch[]
): EventOverview {
  const eligible = ranked.filter((r) => r.within_radius && r.within_budget);
  const top = eligible[0] ?? ranked[0];

  if (!top) {
    return {
      headline: `No candidate venues fit ${event.name} yet.`,
      whyChosen:
        responses.length === 0
          ? `No guest responses yet, and no restaurants matched this location, radius, and budget. Share the guest form and confirm the address to get started.`
          : `No restaurants matched this event's location, radius, and budget. Try widening the radius or raising the per-person budget.`,
      recommendations: [
        responses.length === 0
          ? `Share the guest form link so dietary needs start coming in.`
          : `Widen the radius or raise the per-person budget in Edit Event, then re-run matching.`,
      ],
      source: "fallback",
    };
  }

  const a = analyzeTable(responses, ranked);
  const topCoversAll = top.covered_count === top.total_responses;

  // Headline — lead with the winner, its coverage, cost, and distance.
  const headline =
    `${top.restaurant.name} leads: ${
      topCoversAll ? `feeds all ${top.total_responses}` : `${top.covered_count}/${top.total_responses}`
    } guests at ~$${top.predicted_cost_per_person}/person, ${top.distance_miles} mi away` +
    (a.fullCoverage.length > 0
      ? ` — ${a.fullCoverage.length} venue${a.fullCoverage.length === 1 ? "" : "s"} can feed everyone.`
      : `.`);

  // Why — the constraint landscape + what's steering the ranking.
  const sevBits: string[] = [];
  if (a.severity.high) sevBits.push(`${a.severity.high} high-severity (allergy/medical)`);
  if (a.severity.medium) sevBits.push(`${a.severity.medium} medium (religious/ethical)`);
  if (a.severity.low) sevBits.push(`${a.severity.low} preference-only`);
  const excludeBit = a.topExcludes.length
    ? ` The most common hard restriction is “${a.topExcludes[0].label}” (${a.topExcludes[0].count} guest${
        a.topExcludes[0].count === 1 ? "" : "s"
      })${a.topExcludes[1] ? `, then “${a.topExcludes[1].label}”` : ""}, which is steering the cuisine mix.`
    : "";
  const complexBit = a.complexCount
    ? ` ${a.complexCount} guest${a.complexCount === 1 ? " has a" : "s have"} compound rule${
        a.complexCount === 1 ? "" : "s"
      } (e.g. no mixing meat & dairy) that Gemini checks per menu.`
    : "";

  const whyChosen =
    `Your table of ${a.total} breaks down as ${sevBits.join(", ") || "no stated constraints"}.` +
    excludeBit +
    complexBit +
    `\n\nVenues are ranked by how much of that weighted table can safely eat first, then preferences and distance. ` +
    `${top.restaurant.name} tops it at ${top.weighted_coverage_pct}% weighted coverage (${confidenceLabel(top)}), ` +
    (a.fullCoverage.length > 0
      ? `and ${a.fullCoverage.length} eligible venue${a.fullCoverage.length === 1 ? "" : "s"} cover the whole group` +
        (a.cuisines.length > 1 ? ` across ${a.cuisines.slice(0, 4).join(", ")}` : "") +
        `.`
      : `but no single eligible venue covers everyone — the top pick still leaves ${
          top.total_responses - top.covered_count
        } without a safe dish.`);

  // Recommendations — concrete, ranked, and specific.
  const recommendations: string[] = [];

  for (const zm of match.zero_matches.slice(0, 4)) {
    const excludes = zm.hard_excludes.length ? zm.hard_excludes.join(", ") : "their dietary needs";
    recommendations.push(
      `Reach out to ${zm.anonymous_label}${
        zm.contact_email ? ` (${zm.contact_email})` : ""
      } — no in-range, in-budget venue covers ${excludes}. Ask about substitutions or widen the search.`
    );
  }

  if (a.cheapestFull) {
    recommendations.push(
      `For the best value that still feeds everyone, ${a.cheapestFull.restaurant.name} (${a.cheapestFull.restaurant.cuisine}) comes in around $${a.cheapestFull.predicted_cost_per_person}/person just ${a.cheapestFull.distance_miles} mi away.`
    );
  }
  if (a.closestFull && a.cheapestFull && a.closestFull.restaurant.id !== a.cheapestFull.restaurant.id) {
    recommendations.push(
      `If you'd rather keep it close, ${a.closestFull.restaurant.name} is the nearest option that still covers the whole table at ${a.closestFull.distance_miles} mi (about $${a.closestFull.predicted_cost_per_person}/person).`
    );
  }
  if (a.fullCoverage.length > 1 && a.cuisines.length > 1) {
    recommendations.push(
      `For a bit of variety, your all-covered picks span ${a.cuisines.slice(0, 4).join(", ")}, so it's worth shortlisting two or three to compare menus.`
    );
  }

  const callTarget = a.cheapestFull ?? top;
  if (callTarget.restaurant.phone) {
    recommendations.push(
      `When you're ready to lock it in, give ${callTarget.restaurant.name} a call at ${callTarget.restaurant.phone} to confirm they can handle the group size and the dietary needs.`
    );
  }

  if (top.covered_count < top.total_responses && recommendations.length === 0) {
    const gap = top.total_responses - top.covered_count;
    recommendations.push(
      `Even the front-runner, ${top.restaurant.name}, leaves ${gap} guest${
        gap === 1 ? "" : "s"
      } uncovered, so open its card to see who and why before you book.`
    );
  }
  if (top.confidence?.tier === "unknown" || top.confidence?.tier === "low") {
    recommendations.push(
      `Menu data is still thin for your top venues, so run “Fetch menus” to firm up confidence before you decide.`
    );
  }
  if (eligible.length === 0) {
    recommendations.push(
      `Nothing currently fits both your radius and budget — widening the radius or raising the per-person budget in Edit Event should open up options.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      `From here, shortlist ${top.restaurant.name}${
        a.closestFull && a.closestFull.restaurant.id !== top.restaurant.id
          ? ` and ${a.closestFull.restaurant.name}`
          : ""
      } and confirm the menu directly with the venue before booking.`
    );
  }

  return { headline, whyChosen, recommendations: recommendations.slice(0, 6), source: "fallback" };
}

function fallbackPayload(
  event: DietreEvent,
  match: MatchResult,
  responses: DietResponse[],
  ranked: RestaurantMatch[]
): OverviewPayload {
  const restaurants: Record<string, string> = {};
  for (const r of ranked.slice(0, TOP_RESTAURANTS)) {
    restaurants[r.restaurant.id] = fallbackRestaurantSummary(r);
  }
  return {
    event: fallbackEventOverview(event, match, responses, ranked),
    restaurants,
    generated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Gemini path (single batched call for the whole payload)
// ---------------------------------------------------------------------------

function buildPromptContext(
  event: DietreEvent,
  match: MatchResult,
  responses: DietResponse[],
  ranked: RestaurantMatch[]
): string {
  const responseById = new Map(responses.map((r) => [r.id, r]));

  const guestLines = responses
    .slice(0, 25)
    .map((res, i) => {
      const rules = res.parsed_rules;
      const name = res.guest_name?.trim() || `Guest ${String(i + 1).padStart(2, "0")}`;
      const excl = rules.hard_excludes.length ? rules.hard_excludes.join(", ") : "none";
      const prefs = rules.soft_preferences.length ? rules.soft_preferences.join(", ") : "none";
      const complex = rules.complex_restrictions?.length ? ` | complex: ${rules.complex_restrictions.join("; ")}` : "";
      return `- ${name} [${rules.severity} severity] excludes: ${excl} | prefers: ${prefs}${complex}`;
    })
    .join("\n");

  const restaurantLines = ranked
    .slice(0, TOP_RESTAURANTS)
    .map((r) => {
      const eligibility = r.within_radius && r.within_budget ? "eligible" : !r.within_radius ? "outside-radius" : "over-budget";
      const safe = (r.safe_items ?? [])
        .map((s) => s.item?.name)
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        .slice(0, 4);
      return (
        `- id: ${r.restaurant.id} | ${r.restaurant.name} | ${r.restaurant.cuisine} | ` +
        `overall ${r.overall_score} | weighted_coverage ${r.weighted_coverage_pct}% | ` +
        `covers ${r.covered_count}/${r.total_responses} | ${r.distance_miles}mi | ~$${r.predicted_cost_per_person}/pp | ` +
        `${eligibility} | ${confidenceLabel(r)}` +
        (r.confidence?.rank_utilitarian ? ` | group_rank ${r.confidence.rank_utilitarian}` : "") +
        (r.restaurant.phone ? ` | phone: ${r.restaurant.phone}` : "") +
        (safe.length ? ` | safe_dishes: ${safe.join(", ")}` : " | safe_dishes: none listed")
      );
    })
    .join("\n");

  const zeroLines = match.zero_matches
    .slice(0, 10)
    .map((zm) => {
      const res = responseById.get(zm.response_id);
      const name = responseLabel(res, zm.anonymous_label);
      return `- ${name} [${zm.severity}] excludes: ${zm.hard_excludes.join(", ") || "n/a"}${
        zm.contact_email ? ` | contact: ${zm.contact_email}` : ""
      }`;
    })
    .join("\n");

  // Pre-computed aggregates so the model reasons over the table, not guesses.
  const a = analyzeTable(responses, ranked);
  const sevBits = `${a.severity.high} high / ${a.severity.medium} medium / ${a.severity.low} low severity`;
  const excludeBits = a.topExcludes.length
    ? a.topExcludes.map((e) => `${e.label} (${e.count})`).join(", ")
    : "none";
  const prefBits = a.topPrefs.length ? a.topPrefs.map((p) => `${p.label} (${p.count})`).join(", ") : "none";
  const fullCoverBits = a.fullCoverage.length
    ? a.fullCoverage
        .slice(0, 8)
        .map((r) => `${r.restaurant.name} (${r.restaurant.cuisine}, $${r.predicted_cost_per_person}, ${r.distance_miles}mi)`)
        .join("; ")
    : "none";

  return `EVENT: ${event.name} | ${event.location} | radius ${event.radius}mi | budget $${
    event.budget_per_person ?? event.budget_range
  }/person | ${event.expected_headcount} expected guests
${event.limitations ? `HOST LIMITATIONS: ${event.limitations}\n` : ""}
TABLE SUMMARY: ${a.total} responses | severity ${sevBits} | ${a.complexCount} with compound rules
MOST COMMON HARD RESTRICTIONS: ${excludeBits}
MOST COMMON PREFERENCES: ${prefBits}
VENUES THAT FEED EVERYONE (${a.fullCoverage.length}): ${fullCoverBits}
${a.cheapestFull ? `CHEAPEST ALL-COVERED: ${a.cheapestFull.restaurant.name} ($${a.cheapestFull.predicted_cost_per_person})\n` : ""}${a.closestFull ? `CLOSEST ALL-COVERED: ${a.closestFull.restaurant.name} (${a.closestFull.distance_miles}mi)\n` : ""}
GUESTS (${responses.length} responses):
${guestLines || "(none yet)"}

TOP CANDIDATE RESTAURANTS (already ranked, best first):
${restaurantLines || "(none)"}

GUESTS NO IN-RANGE VENUE CAN FEED (zero-match alerts):
${zeroLines || "(none)"}`;
}

async function geminiPayload(
  event: DietreEvent,
  match: MatchResult,
  responses: DietResponse[],
  ranked: RestaurantMatch[]
): Promise<OverviewPayload | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const context = buildPromptContext(event, match, responses, ranked);
    const ids = ranked.slice(0, TOP_RESTAURANTS).map((r) => r.restaurant.id);

    const prompt = `You are the analyst for Dietre, a group-dietary catering matcher. An event host is looking at a ranked list of restaurants scored on how much of their guest table can SAFELY eat (allergies/religious rules are hard gates), nudged by soft preferences. Write a sharp, specific, host-facing briefing. Safety always outranks taste — never imply an unsafe venue is fine. Ground EVERY claim in the numbers below; never invent facts.

${context}

Be genuinely useful and concrete — a host should be able to act on this without opening anything else. Cite real numbers, dollar amounts, distances, cuisines, and specific guest/venue names. Avoid empty filler like "your top venues cover the table well." Write in smooth, natural, flowing prose — full sentences that read like a knowledgeable friend briefing the host, not terse bullet fragments or labels.

Return ONLY JSON shaped exactly like:
{
  "headline": "one vivid opening line naming the top venue with its coverage, $/person, and distance",
  "whyChosen": "TWO short paragraphs separated by a blank line (\\n\\n). Paragraph 1: the table's constraint landscape — severity mix, the most common restrictions and who drives them, any compound rules. Paragraph 2: why the top venue ranked #1, how many venues feed everyone and across which cuisines, and one honest caveat (menu confidence or uncovered guests). Keep each paragraph to 2-3 flowing sentences.",
  "recommendations": ["3-4 complete, flowing sentences concatenated into ONE paragraph, so each must read naturally and connect smoothly. Name any zero-match guests to contact and what they exclude; name the best-value all-covered venue with its price; name the closest one; and when a venue has a phone number, tell the host to call it, e.g. 'give Hunan King a call at (540) 555-0134 to lock it in.' Every sentence must name a specific venue, guest, price, distance, or phone number — no generic advice."],
  "restaurants": { ${ids.map((id) => `"${id}": "2-3 flowing sentences: coverage vs the table, standout safe dishes, price/distance trade-off, confidence, and — if a phone number is given — a 'call ahead at <number>' nudge; say who it fails if it doesn't cover everyone"`).join(", ")} }
}
Every restaurant id above MUST appear as a key in "restaurants". Keep it grounded in the numbers.`;

    const result = await withTimeout(model.generateContent(prompt), 15000, "AI event overview");
    const raw = result.response.text().trim();
    const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").replace(/^```\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as {
      headline?: string;
      whyChosen?: string;
      recommendations?: unknown;
      restaurants?: Record<string, unknown>;
    };

    const fallback = fallbackPayload(event, match, responses, ranked);

    const headline =
      typeof parsed.headline === "string" && parsed.headline.trim()
        ? parsed.headline.trim()
        : fallback.event.headline;
    const whyChosen =
      typeof parsed.whyChosen === "string" && parsed.whyChosen.trim()
        ? parsed.whyChosen.trim()
        : fallback.event.whyChosen;
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim())
          .slice(0, 6)
      : fallback.event.recommendations;

    const restaurants: Record<string, string> = {};
    for (const r of ranked.slice(0, TOP_RESTAURANTS)) {
      const val = parsed.restaurants?.[r.restaurant.id];
      restaurants[r.restaurant.id] =
        typeof val === "string" && val.trim().length > 0
          ? val.trim()
          : fallbackRestaurantSummary(r);
    }

    return {
      event: {
        headline,
        whyChosen,
        recommendations: recommendations.length ? recommendations : fallback.event.recommendations,
        source: "ai",
      },
      restaurants,
      generated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Orchestrator: try Gemini, fall back to a deterministic summary. Always
// returns a usable payload so the dashboard panel is never blank.
export async function generateEventAiOverview(
  event: DietreEvent,
  match: MatchResult,
  responses: DietResponse[]
): Promise<OverviewPayload> {
  const ranked = rankRestaurants(match.restaurants);
  const ai = await geminiPayload(event, match, responses, ranked);
  return ai ?? fallbackPayload(event, match, responses, ranked);
}

// ---------------------------------------------------------------------------
// Caching helpers — keep a plain dashboard reload from spending a Gemini call.
// ---------------------------------------------------------------------------

// Cheap, order-stable hash of the inputs that actually change the narration:
// the guest responses (their words + parsed rules) and the candidate
// restaurant set + budget/radius. Menu-content changes aren't captured here,
// so the manual "Regenerate" button is the escape hatch for those.
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function overviewSignature(event: DietreEvent, responses: DietResponse[]): string {
  const guests = [...responses]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => {
      const rules = r.parsed_rules;
      return [
        r.id,
        r.raw_text,
        rules.severity,
        (rules.hard_excludes ?? []).join("|"),
        (rules.soft_preferences ?? []).join("|"),
        (rules.complex_restrictions ?? []).join("|"),
      ].join("~");
    })
    .join("§");
  const candidates = [...(event.candidate_restaurant_ids ?? [])].sort().join(",");
  const knobs = `${event.radius}|${event.budget_per_person ?? event.budget_range}|${event.limitations ?? ""}`;
  return djb2(`${guests}∥${candidates}∥${knobs}`);
}

// Convert the live payload into the snake_cased shape stored on the event doc.
export function toEventAiOverview(payload: OverviewPayload): EventAiOverview {
  return {
    headline: payload.event.headline,
    why_chosen: payload.event.whyChosen,
    recommendations: payload.event.recommendations,
    restaurants: payload.restaurants,
    source: payload.event.source,
    generated_at: payload.generated_at,
  };
}

// Rehydrate a cached overview into the API response shape.
export function fromEventAiOverview(cached: EventAiOverview): OverviewPayload {
  return {
    event: {
      headline: cached.headline,
      whyChosen: cached.why_chosen,
      recommendations: cached.recommendations ?? [],
      source: cached.source,
    },
    restaurants: cached.restaurants ?? {},
    generated_at: cached.generated_at,
  };
}
