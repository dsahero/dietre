import { isEventMember } from "@/backend/lib/access";
import { getSession } from "@/backend/lib/auth";
import { getEvent, listMenuItems, listResponses } from "@/backend/lib/db";
import { ensureEventRestaurants } from "@/backend/lib/restaurantDiscovery";
import { matchEvent } from "@/backend/lib/matching";
import { attachStoredScores } from "@/backend/lib/scoreConfidence";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const event = await getEvent(id);
  if (!event) {
    return new Response(JSON.stringify({ error: "Event not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await getSession();
  if (!isEventMember(session, event)) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(type: string, data: unknown) {
        const payload = JSON.stringify({ type, data });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      function log(message: string) {
        send("log", { message, timestamp: Date.now() });
      }

      try {
        log("Loading event data…");

        log("Fetching responses…");
        const responses = await listResponses(event.id);
        log(`Found ${responses.length} guest response(s)`);

        if (responses.length === 0) {
          log("⚠ No guest responses yet — matching requires at least one response.");
          send("done", { success: false, reason: "no_responses" });
          controller.close();
          return;
        }

        log("Loading candidate restaurants…");
        const restaurants = await ensureEventRestaurants(event);
        log(`${restaurants.length} candidate restaurant(s) loaded`);

        if (restaurants.length === 0) {
          log("⚠ No restaurants found. Run webscraping first or adjust the event location.");
          send("done", { success: false, reason: "no_restaurants" });
          controller.close();
          return;
        }

        log("Loading menu items…");
        const menuItems = await listMenuItems();
        const withMenu = restaurants.filter((r) =>
          menuItems.some((item) => item.restaurant_id === r.id)
        );
        log(`${menuItems.length} total menu items across ${withMenu.length} restaurant(s) with menu data`);

        log("\n━━━ Running Match Algorithm ━━━");
        log("Computing dietary compatibility…");
        log("• Checking hard excludes against menu flags & ingredients");
        log("• Running AI safety judgments (cached where available)");
        log("• Evaluating complex dietary restrictions");
        log("• Computing Bayesian preference signals");

        const rawMatch = await matchEvent({ event, responses, restaurants, menuItems });

        log("\nAttaching confidence scores…");
        const match = await attachStoredScores(event, responses, rawMatch);

        log("\n━━━ Match Results ━━━");
        const eligible = match.restaurants.filter((r) => r.within_radius && r.within_budget);
        log(`${match.restaurants.length} restaurants evaluated`);
        log(`${eligible.length} within radius & budget`);

        const fullCoverage = match.restaurants.filter(
          (r) => r.covered_count === r.total_responses && r.within_radius && r.within_budget
        );
        if (fullCoverage.length > 0) {
          log(`🌟 ${fullCoverage.length} restaurant(s) cover ALL ${responses.length} guests!`);
        }

        for (const r of match.restaurants.slice(0, 10)) {
          const status = r.within_radius && r.within_budget ? "✅" : "⚠️";
          log(
            `  ${status} ${r.restaurant.name}: ${r.overall_score}% overall · ` +
            `${r.covered_count}/${r.total_responses} guests covered · ` +
            `${r.distance_miles}mi`
          );
        }

        if (match.zero_matches.length > 0) {
          log(`\n⚠ ${match.zero_matches.length} guest(s) have no restaurant match anywhere:`);
          for (const zm of match.zero_matches) {
            log(`  • ${zm.anonymous_label}: excludes [${zm.hard_excludes.join(", ")}]`);
          }
        }

        log(`\n✅ Matching complete!`);

        send("done", {
          success: true,
          summary: {
            totalRestaurants: match.restaurants.length,
            eligibleRestaurants: eligible.length,
            fullCoverageCount: fullCoverage.length,
            responseCount: match.response_count,
            zeroMatchCount: match.zero_matches.length,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`❌ Error: ${message}`);
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
