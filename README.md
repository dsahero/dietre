# DietRe

**Live at [dietre.us](https://dietre.us)**

DietRe is a catering-decision tool for events large enough that surveying
guests by hand stops working. Instead of collecting free-text allergy notes
and eyeballing menus, hosts get a ranked list of nearby restaurants whose
actual menus can safely feed every guest at the event.

## Features

### Conversational AI intake
Guests can talk to a Gemini-powered concierge that walks through
allergies, religious restrictions, and preferences in plain language,
one topic at a time. The intake handles the messy parts most forms
punt on: detecting contradictions between turns ("no pork" then "I ate
bacon yesterday"), automatically promoting anything phrased as an
allergy from a preference to a hard constraint, stripping preferences
that conflict with hard restrictions, and reading a plain-English
summary back to the guest for confirmation before it lets them submit.
A traditional free-text form intake is also available for guests who'd
rather type once and be done.

### Ingredient-level dietary parsing
Free-text responses from either intake are parsed into structured
`hard_excludes`, preferences, and complex restrictions, resolved down to
the ingredient level. "No dairy," "no whey," and "lactose intolerant"
collapse to the same underlying signal, and umbrella terms like
"vegetarian," "vegan," and "halal" expand into the specific ingredients
they imply, so matching isn't fooled by wording differences between
guests.

### Automatic menu ingestion
Finding reliable menus isn't always consistent. Some older local
restaurants ship static HTML pages, some hide their menu inside a PDF
linked off the footer, and newer sites built on frameworks like Next.js,
Nuxt, or Squarespace render everything client-side, which trips up
conventional scrapers and even search-engine indexers. DietRe walks
through progressively heavier strategies until one works: a static HTML
fetch parsed with Cheerio for the simple case, a Puppeteer-driven
headless browser for JS-rendered pages, Firecrawl as a fallback for
pages that fight back, and a PDF extraction path for menus that only
exist as attachments. Extracted text, whether from raw HTML, JSON-LD
structured data, or PDF, is then parsed into structured menu items
with estimated ingredients and dietary flags. The whole pipeline runs
in a background queue that only touches restaurants near the current
event, caches results, refreshes them on a schedule, and retries after
failures, so the host UI never waits on a scrape. If scraping fails
outright for a specific venue (the site is dead, gated, or too unusual
to parse), hosts can upload a PDF or paste raw menu text on that
restaurant's card, and it flows through the same ingredient parser as
scraped menus.

### Restaurant matching engine
For each event, every restaurant is scored against every guest at the
menu-item level. A restaurant "covers" a guest if at least one dish on
its menu is safe for them; safety checks the guest's hard constraints
against each item's ingredient flags and estimated ingredients, with
special handling for vegan and vegetarian requirements, kosher
meat-and-dairy combinations, and low-confidence items where allergy
guests are blocked from anything the parser isn't certain about. On top
of raw coverage, a Bayesian preference model (Beta-Bernoulli, uniform
prior) nudges the ranking by how well each menu satisfies softer
preferences, and an explicit uncertainty score tracks how much of a
restaurant's menu was extracted with high confidence versus estimated,
so a venue with a thin or partially-scraped menu is flagged rather
than silently over-ranked. Results are ranked by weighted coverage
first, then preferences, distance, and cost against the event budget.

### AI-generated dashboard overview
On top of the ranked list, Gemini writes a short natural-language
briefing for the host: a summary paragraph on the group's constraint
landscape (severity mix, most common restrictions, who drives them,
compound rules) and per-restaurant blurbs explaining coverage against
the table, standout safe dishes, the price/distance trade-off, menu
confidence, and, when relevant, which specific guests a venue can't
feed. It turns the underlying numeric scores into something a host can
actually read and act on without staring at a table.

### Event sharing with co-organizers
Hosts can invite other organizers to an event by email. Invitees get the
event in their "shared with me" list and can co-manage responses,
shortlists, and matches with the same permissions as the owner (except
deleting the event or removing the owner). Pending invites are tracked
separately from accepted collaborators so hosts can see who's been asked
but hasn't joined yet.

### Host dashboard
Ranked restaurant cards with per-guest match reasons, a Leaflet map with
distance and cuisine filters, a shortlist tab for candidate venues, a
responses table for individual submissions, and a shareable QR / link
panel for distributing the guest intake URL.

## How it works

At a high level, an event flows through four stages:

```
Host creates event
        │
        ▼
Google Places discovery ─── adaptive spatial tiling gets up to 250
                            nearby restaurants past the 20-result cap
        │
        ▼
Menu ingestion ──────────── Cheerio → Puppeteer → Firecrawl → PDF
                            (plus manual upload fallback)
                            Gemini extracts dishes + ingredients
        │
        ▼
Guest intake ────────────── Gemini concierge chat  ── or ──  free-text form
                                    │
                                    ▼
                            Parser resolves to hard_excludes,
                            preferences, and complex rules
        │
        ▼
Matching engine ─────────── per-guest × per-dish safety check
                            severity-weighted coverage
                            Beta preference nudge
                            menu-confidence tier
        │
        ▼
Host dashboard ──────────── ranked cards, map, shortlist, responses,
                            Gemini-written overview
```

Everything after "Host creates event" runs incrementally: guests can
join at any time, menus are refreshed in the background, and matches
re-score whenever new data arrives.

## Tech stack

| Area | Technologies |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Route Handlers), React 19, TypeScript |
| Styling & UI | Tailwind CSS v4, shadcn/ui, Radix primitives, Motion, Lucide icons |
| AI | Google Gemini for dietary-text parsing and the guest concierge chatbot |
| Menu ingestion | Puppeteer, Cheerio, Firecrawl HTML extractor |
| Matching | In-house ingredient-level matching engine |
| Data & auth | Firebase (Firestore + Authentication) |
| Map | Leaflet |
| Sharing | QR-code intake links, email-based event co-organizer invites |
| Hosting | Vercel, [dietre.us](https://dietre.us) |

## Repository layout

```
app/         Next.js App Router: pages and API route handlers
frontend/    React components, dashboard views, hooks, global styles
backend/     Server-side libs: matching engine, menu scraping,
             Gemini parser/concierge, DB access, mailer, seed scripts
shared/      Domain types, runtime config, geocoding utilities
```

## Development

The product itself lives at [dietre.us](https://dietre.us); no local
setup is required to use it.

For contributors (Node 22+):

```bash
npm install
npm run dev     # local dev server
npm run build
npm run lint
```

## License

Private. All rights reserved.
