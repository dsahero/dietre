import { isEventMember } from "@/backend/lib/access";
import { getSession } from "@/backend/lib/auth";
import { getEvent, listMenuItems, listRestaurantsForEvent, upsertMenuItems } from "@/backend/lib/db";
import { modelMenuItems, rawItemsToMenuItems } from "@/backend/lib/ingredient_modeling";
import { pdfBufferToText } from "@/backend/lib/menuParser";
import type { MenuItem } from "@/shared/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const MIN_TEXT_CHARS = 80;

function restaurantMatches(id: string, restaurantId: string, aliasIds?: string[]): boolean {
  return id === restaurantId || (aliasIds ?? []).includes(restaurantId);
}

function mergeMenuItems(existing: MenuItem[], incoming: MenuItem[]): MenuItem[] {
  const byName = new Map<string, MenuItem>();
  for (const item of existing) {
    byName.set(item.name.trim().toLowerCase(), item);
  }
  let seq = existing.length + 1;
  for (const item of incoming) {
    const key = item.name.trim().toLowerCase();
    if (byName.has(key)) continue;
    let id = `${item.restaurant_id}-upload-${seq++}`;
    while ([...byName.values()].some((x) => x.id === id)) {
      id = `${item.restaurant_id}-upload-${seq++}`;
    }
    byName.set(key, { ...item, id });
  }
  return [...byName.values()];
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; restaurantId: string }> }
) {
  const { id, restaurantId } = await context.params;
  const event = await getEvent(id);
  if (!event) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  const session = await getSession();
  if (!isEventMember(session, event)) {
    return Response.json({ error: "Unauthorized." }, { status: 403 });
  }

  const restaurants = await listRestaurantsForEvent(event);
  const restaurant = restaurants.find((r) => restaurantMatches(r.id, restaurantId, r.alias_ids));
  if (!restaurant) {
    return Response.json({ error: "Restaurant not found for this event." }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing PDF file." }, { status: 400 });
  }

  const label = file.name?.trim() || "Uploaded menu.pdf";
  if (!/\.pdf$/i.test(label) && file.type !== "application/pdf") {
    return Response.json({ error: "Only PDF uploads are supported." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return Response.json({ error: "PDF must be between 1 byte and 10 MB." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 5 || buf.subarray(0, 4).toString("utf8") !== "%PDF") {
    return Response.json({ error: "File does not look like a PDF." }, { status: 400 });
  }

  let text: string;
  try {
    text = (await pdfBufferToText(buf)).trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not read PDF: ${message}` }, { status: 422 });
  }

  if (text.replace(/\s+/g, "").length < MIN_TEXT_CHARS) {
    return Response.json(
      {
        error:
          "No usable text in this PDF (it may be image-only). OCR is not enabled yet — try a text-based menu PDF.",
      },
      { status: 422 }
    );
  }

  const labeled = `=== MENU: ${label} (pdf upload) ===\n\n${text}`;
  const { items: rawItems, stats } = await modelMenuItems(restaurant.id, labeled);
  const parsed = rawItemsToMenuItems(rawItems);
  if (parsed.length === 0) {
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 180);
    return Response.json(
      {
        error:
          "PDF text was readable, but no menu items could be parsed from it. Try a clearer text menu PDF, or a different file.",
        textPreview: preview,
        textLength: text.length,
      },
      { status: 422 }
    );
  }

  const existing = (await listMenuItems()).filter((item) => item.restaurant_id === restaurant.id);
  const merged = mergeMenuItems(existing, parsed);
  const added = merged.length - existing.length;

  const menuUrls = [
    ...(restaurant.menu_urls ?? []).filter(
      (u) => !(u.kind === "pdf" && u.url === `upload://${label}`)
    ),
    { kind: "pdf" as const, label, url: `upload://${label}` },
  ];

  await upsertMenuItems(restaurant.id, merged, "ready", menuUrls);

  return Response.json({
    success: true,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    added,
    total: merged.length,
    stats,
    menuUrl: { kind: "pdf", label, url: `upload://${label}` },
  });
}
