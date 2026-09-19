import type { Express, NextFunction, Request, Response } from "express";
import { bearerToken, guestToken, hashPassword, readSessionToken, signSession, verifyPassword } from "./auth.js";
import { backendLabel } from "./db.js";
import * as db from "./db.js";
import { newId, newToken } from "./ids.js";
import { computeRestaurantScores } from "./matching.js";
import { parseDietaryWithGemini } from "./parser.js";
import { DOWNTOWN_BLACKSBURG, geocodeBlacksburg } from "./places.js";
import { runtimeMode } from "./config.js";
import type {
  BudgetMode,
  DietreEvent,
  EventMode,
  FairnessMode,
  Guest,
  OrganizerSession,
  PublicEvent,
} from "./types.js";

type AuthedRequest = Request & { organizer?: OrganizerSession };

function publicEvent(event: DietreEvent): PublicEvent {
  return {
    _id: event._id,
    name: event.name,
    mode: event.mode,
    status: event.status,
    event_date: event.event_date,
    location_label: event.location_label,
    radius_miles: event.radius_miles,
    fairness_mode: event.fairness_mode,
    guest_count_invited: event.guest_count_invited,
  };
}

function publicGuest(guest: Guest) {
  return {
    _id: guest._id,
    event_id: guest.event_id,
    anon_token: guest.anon_token,
    name: guest.name,
    email: guest.email,
    transcript: guest.transcript,
    preference_vector: guest.preference_vector,
    confidence: guest.confidence,
    conflict_followups: guest.conflict_followups,
    created_at: guest.created_at,
    updated_at: guest.updated_at,
  };
}

function organizerGuestView(guest: Guest, index: number) {
  const severity = guest.preference_vector.severity;
  const band = severity === "high" ? "High-constraint" : severity === "medium" ? "Constrained" : "Flexible";
  return {
    _id: guest._id,
    anonymous_label: `${band} guest ${index + 1}`,
    preference_vector: guest.preference_vector,
    confidence: guest.confidence,
    has_email: Boolean(guest.email),
    email: guest.email,
    conflict_followups: guest.conflict_followups,
    created_at: guest.created_at,
    updated_at: guest.updated_at,
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function requireOrganizer(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = readSessionToken(bearerToken(req.header("authorization")));
  if (!session) {
    res.status(401).json({ error: "Organizer login required." });
    return;
  }
  req.organizer = session;
  next();
}

async function requireEventOwner(req: AuthedRequest, res: Response): Promise<DietreEvent | null> {
  const event = await db.getEvent(String(req.params.id));
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return null;
  }
  if (event.organizer_id !== req.organizer?.organizer_id) {
    res.status(403).json({ error: "Not your event." });
    return null;
  }
  return event;
}

async function loadEventScores(event: DietreEvent) {
  const [guests, restaurants, menuItems, cached] = await Promise.all([
    db.listGuests(event._id),
    db.listRestaurants(),
    db.listMenuItems(),
    db.listScores(event._id),
  ]);
  const latestGuest = guests.reduce((max, guest) => (guest.updated_at > max ? guest.updated_at : max), "");
  const cacheFresh =
    cached.length > 0 && (!latestGuest || cached.every((row) => row.computed_at >= latestGuest));
  if (cacheFresh) {
    return { scores: cached, guests, restaurants, menuItems, zero_matches: null as ReturnType<typeof computeRestaurantScores>["zero_matches"] | null };
  }
  const computed = computeRestaurantScores({ event, guests, restaurants, menuItems });
  await db.replaceScores(event._id, computed.scores);
  return { scores: computed.scores, guests, restaurants, menuItems, zero_matches: computed.zero_matches };
}

export function registerRoutes(app: Express) {
  app.get("/health", (_req, res) => {
    res.json({ ok: true, ...runtimeMode(), store: backendLabel() });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ...runtimeMode(), store: backendLabel() });
  });

  app.post(
    "/api/auth/register",
    asyncHandler(async (req, res) => {
      const email = String(req.body?.email ?? "")
        .trim()
        .toLowerCase();
      const name = String(req.body?.name ?? "").trim();
      const password = String(req.body?.password ?? "");
      if (!email.includes("@")) {
        res.status(400).json({ error: "Enter a valid email." });
        return;
      }
      if (!name) {
        res.status(400).json({ error: "Name is required." });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters." });
        return;
      }
      const organizer = await db.createOrganizer({
        email,
        name,
        password_hash: await hashPassword(password),
      });
      const session: OrganizerSession = { organizer_id: organizer._id, email: organizer.email, name: organizer.name };
      res.status(201).json({
        organizer: { _id: organizer._id, email: organizer.email, name: organizer.name, created_at: organizer.created_at },
        token: signSession(session),
      });
    })
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const email = String(req.body?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password ?? "");
      if (!email.includes("@") || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
      }
      const organizer = await db.getOrganizerByEmail(email);
      if (!organizer || !(await verifyPassword(password, organizer.password_hash))) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }
      const session: OrganizerSession = { organizer_id: organizer._id, email: organizer.email, name: organizer.name };
      res.json({
        organizer: { _id: organizer._id, email: organizer.email, name: organizer.name, created_at: organizer.created_at },
        token: signSession(session),
      });
    })
  );

  app.get(
    "/api/auth/me",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const organizer = await db.getOrganizer(req.organizer!.organizer_id);
      if (!organizer) {
        res.status(401).json({ error: "Organizer not found." });
        return;
      }
      res.json({
        organizer: { _id: organizer._id, email: organizer.email, name: organizer.name, created_at: organizer.created_at },
        mode: runtimeMode(),
      });
    })
  );

  app.get(
    "/api/events",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const events = await db.listEventsByOrganizer(req.organizer!.organizer_id);
      res.json({ events });
    })
  );

  app.post(
    "/api/events",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = req.body ?? {};
      const name = String(body.name ?? "").trim();
      const mode = body.mode as EventMode;
      const budget_mode = body.budget_mode as BudgetMode;
      const fairness_mode = (body.fairness_mode as FairnessMode) || "utilitarian";
      const event_date = String(body.event_date ?? "").trim();
      const guest_count_invited = Number(body.guest_count_invited);
      const radius_miles = Number(body.radius_miles ?? body.radius);
      const event_budget = body.event_budget == null || body.event_budget === "" ? null : Number(body.event_budget);

      if (!name) {
        res.status(400).json({ error: "Event name is required." });
        return;
      }
      if (mode !== "delivery" && mode !== "dine_in") {
        res.status(400).json({ error: 'mode must be "delivery" or "dine_in".' });
        return;
      }
      if (budget_mode !== "event_pays" && budget_mode !== "individual_pays") {
        res.status(400).json({ error: 'budget_mode must be "event_pays" or "individual_pays".' });
        return;
      }
      if (fairness_mode !== "utilitarian" && fairness_mode !== "rawlsian") {
        res.status(400).json({ error: 'fairness_mode must be "utilitarian" or "rawlsian".' });
        return;
      }
      if (!event_date || Number.isNaN(Date.parse(event_date))) {
        res.status(400).json({ error: "event_date must be an ISO date." });
        return;
      }
      if (!Number.isFinite(guest_count_invited) || guest_count_invited < 1) {
        res.status(400).json({ error: "guest_count_invited must be at least 1." });
        return;
      }
      if (!Number.isFinite(radius_miles) || radius_miles <= 0 || radius_miles > 30) {
        res.status(400).json({ error: "radius_miles must be between 0 and 30." });
        return;
      }
      if (event_budget != null && (!Number.isFinite(event_budget) || event_budget < 0)) {
        res.status(400).json({ error: "event_budget must be a positive number or null." });
        return;
      }

      let lng: number;
      let lat: number;
      let location_label: string | undefined;
      if (body.location?.type === "Point" && Array.isArray(body.location.coordinates)) {
        lng = Number(body.location.coordinates[0]);
        lat = Number(body.location.coordinates[1]);
        location_label = body.location_label ? String(body.location_label) : undefined;
      } else if (body.location && Number.isFinite(Number(body.location.lng)) && Number.isFinite(Number(body.location.lat))) {
        lng = Number(body.location.lng);
        lat = Number(body.location.lat);
        location_label = body.location.label ? String(body.location.label) : undefined;
      } else {
        const place = geocodeBlacksburg(String(body.location_label ?? body.location ?? ""));
        lng = place.lng;
        lat = place.lat;
        location_label = place.label;
      }
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        const fallback = DOWNTOWN_BLACKSBURG;
        lng = fallback.lng;
        lat = fallback.lat;
        location_label = location_label || fallback.label;
      }

      const event: DietreEvent = {
        _id: newId(),
        organizer_id: req.organizer!.organizer_id,
        name,
        mode,
        budget_mode,
        event_budget,
        link_token: newToken(),
        status: "collecting",
        fairness_mode,
        created_at: new Date().toISOString(),
        event_date: new Date(event_date).toISOString(),
        guest_count_invited,
        candidate_restaurant_ids: Array.isArray(body.candidate_restaurant_ids)
          ? body.candidate_restaurant_ids.map(String)
          : [],
        location: { type: "Point", coordinates: [lng, lat] },
        radius_miles,
        location_label,
      };
      await db.createEvent(event);
      res.status(201).json({ event, link_token: event.link_token });
    })
  );

  app.get(
    "/api/events/:id",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const event = await requireEventOwner(req, res);
      if (!event) return;
      const packed = await loadEventScores(event);
      const zero_matches =
        packed.zero_matches ??
        computeRestaurantScores({
          event,
          guests: packed.guests,
          restaurants: packed.restaurants,
          menuItems: packed.menuItems,
        }).zero_matches;
      res.json({
        event,
        guests: packed.guests.map(organizerGuestView),
        scores: packed.scores,
        zero_matches,
      });
    })
  );

  app.get(
    "/api/events/:id/restaurants",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const event = await requireEventOwner(req, res);
      if (!event) return;
      const packed = await loadEventScores(event);
      const includeMenu = String(req.query.include_menu ?? "1") !== "0";
      const restaurants = packed.restaurants
        .map((restaurant) => {
          const score = packed.scores.find((row) => row.restaurant_id === restaurant._id);
          if (!score) return null;
          const menu_items = includeMenu
            ? packed.menuItems.filter((item) => item.restaurant_id === restaurant._id)
            : undefined;
          return { restaurant, score, menu_items };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((a, b) => {
          const key = event.fairness_mode === "rawlsian" ? "rawlsian" : "utilitarian";
          return a.score.ranks[key] - b.score.ranks[key];
        });
      res.json({ event: publicEvent(event), restaurants });
    })
  );

  app.get(
    "/api/events/:id/scores",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const event = await requireEventOwner(req, res);
      if (!event) return;
      const packed = await loadEventScores(event);
      res.json({ event_id: event._id, scores: packed.scores, fairness_mode: event.fairness_mode });
    })
  );

  app.get(
    "/api/events/:id/zero-matches",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const event = await requireEventOwner(req, res);
      if (!event) return;
      const packed = await loadEventScores(event);
      const zero_matches =
        packed.zero_matches ??
        computeRestaurantScores({
          event,
          guests: packed.guests,
          restaurants: packed.restaurants,
          menuItems: packed.menuItems,
        }).zero_matches;
      res.json({ event_id: event._id, zero_matches });
    })
  );

  app.get(
    "/api/events/:id/conflicts",
    requireOrganizer,
    asyncHandler(async (req: AuthedRequest, res) => {
      const event = await requireEventOwner(req, res);
      if (!event) return;
      const packed = await loadEventScores(event);
      res.json({
        event_id: event._id,
        conflicts: packed.scores.map((score) => ({
          restaurant_id: score.restaurant_id,
          ranks: score.ranks,
          group_scores: score.group_scores,
          conflicts: score.conflicts,
        })),
      });
    })
  );

  app.get(
    "/api/g/:link_token",
    asyncHandler(async (req, res) => {
      const event = await db.getEventByLinkToken(String(req.params.link_token));
      if (!event) {
        res.status(404).json({ error: "Event link not found." });
        return;
      }
      const token = guestToken(req);
      const guest = token ? await db.getGuestByAnonToken(token) : null;
      res.json({
        event: publicEvent(event),
        guest: guest && guest.event_id === event._id ? publicGuest(guest) : null,
      });
    })
  );

  app.post(
    "/api/g/:link_token/session",
    asyncHandler(async (req, res) => {
      const event = await db.getEventByLinkToken(String(req.params.link_token));
      if (!event) {
        res.status(404).json({ error: "Event link not found." });
        return;
      }
      const existingToken = guestToken(req) || (req.body?.anon_token ? String(req.body.anon_token) : "");
      if (existingToken) {
        const existing = await db.getGuestByAnonToken(existingToken);
        if (existing && existing.event_id === event._id) {
          res.json({ guest: publicGuest(existing), anon_token: existing.anon_token });
          return;
        }
      }
      const now = new Date().toISOString();
      const guest: Guest = {
        _id: newId(),
        event_id: event._id,
        anon_token: newToken(),
        transcript: "",
        preference_vector: { hard_excludes: [], soft_preferences: [], severity: "low" },
        confidence: 0,
        conflict_followups: [],
        created_at: now,
        updated_at: now,
      };
      await db.createGuest(guest);
      res.status(201).json({ guest: publicGuest(guest), anon_token: guest.anon_token });
    })
  );

  app.post(
    "/api/g/:link_token/parse",
    asyncHandler(async (req, res) => {
      const event = await db.getEventByLinkToken(String(req.params.link_token));
      if (!event) {
        res.status(404).json({ error: "Event link not found." });
        return;
      }
      const transcript = String(req.body?.transcript ?? req.body?.text ?? "").trim();
      if (!transcript) {
        res.status(400).json({ error: "Write a bit about what you eat." });
        return;
      }
      const parsed = await parseDietaryWithGemini(transcript);
      const emailRaw = req.body?.email != null ? String(req.body.email).trim().toLowerCase() : undefined;
      if (emailRaw && !emailRaw.includes("@")) {
        res.status(400).json({ error: "Contact email looks invalid." });
        return;
      }
      const name = req.body?.name != null ? String(req.body.name).trim() || undefined : undefined;

      let guest: Guest | null = null;
      const token = guestToken(req) || (req.body?.anon_token ? String(req.body.anon_token) : "");
      if (token) {
        const found = await db.getGuestByAnonToken(token);
        if (found && found.event_id === event._id) guest = found;
      }
      const now = new Date().toISOString();
      if (!guest) {
        guest = {
          _id: newId(),
          event_id: event._id,
          anon_token: newToken(),
          transcript,
          preference_vector: parsed.preference_vector,
          confidence: parsed.confidence,
          conflict_followups: [],
          created_at: now,
          updated_at: now,
          ...(emailRaw ? { email: emailRaw } : {}),
          ...(name ? { name } : {}),
        };
        await db.createGuest(guest);
      } else {
        guest = await db.updateGuest({
          ...guest,
          transcript,
          preference_vector: parsed.preference_vector,
          confidence: parsed.confidence,
          ...(emailRaw ? { email: emailRaw } : {}),
          ...(name ? { name } : {}),
        });
      }
      res.json({
        guest: publicGuest(guest),
        anon_token: guest.anon_token,
        preference_vector: parsed.preference_vector,
        confidence: parsed.confidence,
        source: parsed.source,
      });
    })
  );
}
