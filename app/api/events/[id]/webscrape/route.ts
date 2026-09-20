import { isEventMember } from "@/backend/lib/access";
import { getSession } from "@/backend/lib/auth";
import { getEvent, upsertMenuItems } from "@/backend/lib/db";
import { ensureEventRestaurants } from "@/backend/lib/restaurantDiscovery";
import { scrapeRestaurantMenus } from "@/backend/lib/menuScraper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Pro/Enterprise: up to 300s. Hobby plans cap lower — still set high for when available. */
export const maxDuration = 300;

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
        log("Ensuring restaurants are discovered…");
        const restaurants = await ensureEventRestaurants(event);

        if (restaurants.length === 0) {
          log("No restaurants found for this event. Try adjusting the location or radius.");
          send("done", { success: false, reason: "no_restaurants" });
          controller.close();
          return;
        }

        log(`Found ${restaurants.length} candidate restaurant(s)`);

        const results = await scrapeRestaurantMenus(restaurants, log);

        // Save results to database
        let savedCount = 0;
        for (const result of results) {
          if (result.menuItems.length > 0) {
            log(`💾 Saving ${result.menuItems.length} menu items for ${result.restaurantName}…`);
            await upsertMenuItems(result.restaurantId, result.menuItems, "ready", result.menuUrls);
            savedCount++;
          } else if (result.menuUrls.length > 0) {
            await upsertMenuItems(result.restaurantId, [], "none", result.menuUrls);
          } else {
            await upsertMenuItems(result.restaurantId, [], "failed");
          }
        }

        log(`\n✅ Webscraping complete! Saved menu data for ${savedCount} restaurant(s).`);

        send("done", {
          success: true,
          results: results.map((r) => ({
            restaurantId: r.restaurantId,
            restaurantName: r.restaurantName,
            menuUrlCount: r.menuUrls.length,
            menuUrls: r.menuUrls,
            menuItemCount: r.menuItems.length,
          })),
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
