# How Dietre finds menus and matches a group

Dietre is **When2meet for catering**: anonymous, ingredient-level matching for a whole table, not a five-star restaurant picker for one person.

## High-level overview

**Finding the menu.** Restaurants don’t give us a list of ingredients. So Dietre goes and finds the actual food menu — a page, a PDF, whatever the venue published. Gemini reads that menu and writes down the dishes. It only keeps ingredients that were actually on the page. If a dish is just a name, we know it exists, not what’s in it. We still match. We just don’t pretend we’re sure.

**Matching the group.** Matching is not “this restaurant is Thai.” It is: can this table eat here, and if so, how likely are they to want it?

Guests describe their diet in their own words. Gemini turns that into hard nos, combo rules (“meat and dairy are each fine, not on the same plate”), and likes. Then Dietre checks the dishes, not the cuisine tag. An allergy is a locked door — if nothing is safe, that guest is not covered, full stop. Preferences (spicy, not pasta) can tilt the score among kitchens that already work. They cannot unlock an unsafe one.

For trickier rules, Gemini can also audit the menu. Then Dietre ranks places for the whole group: how much of the table can eat (stricter needs count more), whether anyone is left with an empty plate, and how sure we are given how much of the menu we actually read.

The rest of this document is the detailed version. Formulas are collected at the bottom with explanations.

---

## Finding the menu

Think of each restaurant website as a building with no front desk. The menu might be in the lobby, down a hallway marked “Order online”, or in a PDF taped to a back wall. Dietre sends a researcher through that building, then types up what it finds.

When someone opens an event, Dietre looks up restaurants inside the search radius. Google Nearby Search returns at most twenty places per query, nearest first. To cover the whole circle, Dietre uses **adaptive spatial tiling**: it repeats the search on smaller map patches until the radius is filled, or time and quota run out.

Places with a website and no recent menu go on a background queue, nearest first. That work runs in a **child process** so a slow restaurant site cannot freeze the app. A host can also start the same hunt from the dashboard and watch it happen.

**How the researcher walks the site**

1. Start at the homepage.
2. If the page already has a structured menu (**JSON-LD** / schema.org), stop. That *is* the menu.
3. If the page only fills in after JavaScript runs, open it in a **headless browser**. Sometimes the live menu is sitting in a hidden data request; grab that too.
4. Otherwise collect every same-site link, including PDFs. Do not guess from the word “menu” yet.
5. Ask **Gemini** which doors are the food menu, which are worth walking through, and which are gift cards, careers, or Instagram. If Gemini is unavailable: prefer a PDF, then anything whose name looks like “menu”.
6. Walk at most a couple of hallways deeper. Do not wander the whole internet.

**Turning pages into dishes**

A PDF is read as text (a scanned photo of a menu has nothing to extract — there is no OCR yet). An HTML page is tried in order: structured markup, a high-recall extractor, then ordinary scraping.

Gemini reads that text and writes down dishes the way they appear on the page: name, price, description, and **only ingredients that are actually written there**. “Bacon” becomes a pork flag. A dish with listed ingredients is **high confidence**. A dish that is only a name is **low confidence** — we know it exists, not what is in it. That uncertainty feeds the match: thin menus make us less willing to claim a “high” match.

That list of dishes is what matching uses.

---

## Matching the group

Matching is not “this restaurant is Thai, someone said they like Thai.” It is closer to packing a picnic for a mixed group, then asking how well that picnic will go.

First: **can each person eat at least one thing?** That is **feasibility**. An allergy is a locked door, not a taste. If the door is locked, that guest is not covered. No preference score overrules that.

Second: **if they can eat, how likely are they to actually want this?** That is **guest-fit**. Preferences can break a tie. They should not unlock a door.

A restaurant **covers** a guest if any dish is safe for them. If nobody at the table can eat, the restaurant is out.

### Is this dish safe?

Each guest arrives with hard nos (allergies, religious rules), **complex restrictions** (“meat and dairy are each fine, not on the same plate”), soft preferences (“I like spicy food”), and a **severity**.

Severity is the difference between a fire alarm and a suggestion box:

- **high** (weight 3) — typically medical (peanuts, celiac)
- **medium** (weight 2) — typically religious or ethical
- **low** (weight 1) — taste

When the group’s needs compete, the fire alarm gets more say than the suggestion box. That is **severity-weighted** scoring: not all guests are equal votes.

A dish fails a guest if their hard nos show up in the dish’s flags (pork, gluten, dairy, …) or in the ingredient list. Matching uses **word-boundary matching**, so “egg” does not condemn “eggplant”.

Two special locks:

- Vegan / vegetarian mean whole categories of animal ingredients, not a single word on the ticket.
- “Do not mix meat and dairy” is a **combination lock**. Meat alone is fine. Dairy alone is fine. Both in one dish is not.

If the guest’s constraint is an allergy (high severity) and we barely know what is in the dish (low confidence), treat it as unsafe. Better an empty plate in the model than a guess that could send someone to the ER.

Compound rules are hard to catch with keywords. Gemini can **audit** the menu in the background — like a referee who understands “keep them separate,” not a bouncer who only checks IDs. If that audit is slow or missing, the simple locks still run (**fire-and-forget** upgrades later). The page never waits on a network call.

### How far, how expensive?

Distance and budget are filters on the candidate set, not the core of the match. Budget uses dish prices when the menu has them, otherwise the venue’s price level. A place outside the radius or over budget can still be shown; it is ranked behind places that fit both.

---

## The scores

Coverage answers “can they eat?” Guest-fit answers “will they like it?” as a probability. The ranker combines them so taste never outruns safety.

### Coverage: “how much of the table can eat here?”

**Raw coverage** is a headcount fraction. If eight of ten guests can eat, that is 80%.

**Severity-weighted coverage** is the same idea with fire-alarm weights: feeding the peanut-allergy guest counts more than feeding the person who “isn’t in the mood for pasta.” This is the **primary** ranking signal.

### Guest fit: “if they can eat, how likely are they to like it?”

Safety is a gate. Preference is a belief we update as evidence arrives.

Start at a **uniform prior**: the guest can eat here, we know nothing about whether they’ll enjoy it — a **50/50** guess. Each preference signal moves that probability up or down (spicy kitchen for someone who wants heat; pasta house for someone tired of pasta). Gemini’s complex-restriction audit can nudge it further — a bad kitchen is penalised harder than a good one is rewarded.

If the guest cannot eat anything, fit is **zero**. No preferences and no audit means everyone stays at 0.5, and ranking falls back to coverage alone — which is the honest thing when there is no evidence.

On the dashboard this is stretched around 50 so “we have no opinion” looks like a middle score, not a failure:

| Range | Label |
|-------|--------|
| 85–100 | Very High |
| 70–84 | High |
| 55–69 | Medium |
| 40–54 | Neutral |
| 25–39 | Low |
| 0–24 | Very Low |

### Overall score: coverage first, probability as a nudge

Coverage is the foundation. Guest-fit is a nudge on top — at most about **±20** points. Paint can make two equally safe kitchens look different. It cannot make an unsafe kitchen win. When nobody stated a preference, the nudge is zero and overall score equals weighted coverage.

**Sort order:** in-radius and in-budget first → weighted coverage → guest-fit → raw headcount → closest.

---

## Two ideas of fairness

Matching a group is a **social choice** problem, not a single diner’s Yelp sort. Dietre computes both classic answers.

**Utilitarian** (default list): maximise welfare for the weighted table — greatest good for the greatest number, with stricter needs counting more. Same idea as severity-weighted coverage.

**Rawlsian** (fairness / maximin): is *anyone* left standing outside? A venue can look strong on the vote and still fail one guest.

School-trip analogy: utilitarian is the class vote (especially kids with the strictest needs). Rawlsian is the chaperone’s rule that nobody gets an empty tray. Both ranks are stored; the host’s list follows utilitarian order first.

If a guest cannot eat at any in-range, in-budget place, they become a **zero-match** alert.

---

## Confidence: how much of the menu did we actually read?

A high coverage number on a thin menu is like recommending a restaurant after seeing only the chalkboard by the door. The chip on each card blends the group score with **menu-data quality**:

- No menu, or no guests yet → **unknown**
- Fewer than half the dishes have explicit ingredients → cannot be “high”, even if coverage looks perfect

If the evidence is thin, Dietre will not shout. The chip is a label for whether we read a full menu or are squinting at names.

---

## How the two jobs fit together

Scraping finds the plates. Matching asks whether this table can eat them.

Without a menu, Dietre shrugs (unknown confidence, no safe dishes). With a menu, for every guest and every restaurant: is the door unlocked? If yes, start at 50/50 and update how likely they are to want it. Then count how many doors opened, weight fire alarms above suggestion boxes, check whether anyone was left on the sidewalk, and only then let taste tilt among kitchens that can actually feed the table.

---

# Methods and buzzwords

## Finding restaurants

- Google Places API (New): Nearby Search, ranked by distance
- Adaptive spatial tiling with recursive subdivision (past Google’s 20-results-per-search limit)
- Radius and budget filters on the candidate set

## Reading menus

- Layered web crawl (homepage → follow a few doors, not the whole internet)
- JSON-LD / schema.org menu detection
- Cheerio HTML parsing; SPA detection and headless Chrome (puppeteer-core)
- XHR / menu-API capture from rendered pages
- PDF text extraction (pdf-parse); no OCR on photo menus
- Firecrawl HTML extractor (high-recall text)
- LLM link picking: Gemini chooses `menu_found` / `navigate` / `none`
- Heuristic fallback if Gemini is down (PDF, then anything named “menu”)
- Child-process scraper so the web server stays light
- Ingredient flags from listed text only; high vs low confidence by how much was written

## Matching the group

- Anonymous, ingredient-level dietary matching (“When2meet for catering”)
- Feasibility gate: covered iff at least one dish is safe
- Word-boundary ingredient matching (`egg` ≠ `eggplant`)
- Combination rules (meat and dairy each fine, not in the same dish)
- Allergy conservatism: high-severity guest + low-confidence dish → unsafe
- Severity-weighted coverage (high 3×, medium 2×, low 1×)
- Probabilistic guest-fit: safety is a hard gate; liking it starts at 50/50 and updates with evidence
- Gemini menu audit for complex restrictions, fire-and-forget into cache
- Overall score: coverage anchored, preference nudge of at most ±20
- Utilitarian vs Rawlsian group fairness (greatest good vs nobody left behind)
- Confidence tiers that blend group score with menu-data quality
- Zero-match alerts for guests no in-range, in-budget kitchen can feed
- Signature-based cache keys; deterministic fallbacks; graceful degradation

---

# Math (with explanations)

## Severity weights

Each guest gets a weight from how serious their constraint is:

$$
w(s) = \begin{cases} 3 & s = \text{high} \\ 2 & s = \text{medium} \\ 1 & s = \text{low} \end{cases}
$$

High is usually medical. Medium is usually religious or ethical. Low is taste. When the table’s needs compete, covering a high-severity guest moves the score more than covering a preference-only guest.

## Coverage

**Raw coverage** — fraction of guests who have at least one safe dish:

$$
\text{coverage\_pct} = \left\lfloor \frac{|\{g : g \text{ is covered}\}|}{|G|} \times 100 \right\rceil
$$

**Severity-weighted coverage** — same count, but fire alarms count more. This is the primary ranking signal:

$$
\text{weighted\_coverage\_pct} = \left\lfloor \frac{\displaystyle\sum_{g \in G_\text{covered}} w(s_g)}{\displaystyle\sum_{g \in G} w(s_g)} \times 100 \right\rceil
$$

Example: eight of ten guests can eat → raw coverage 80%. If the two who cannot include someone with a peanut allergy, weighted coverage drops harder than if both were “not in the mood for pasta.”

## Guest-fit (Bayesian preference utility)

Safety is a hard gate. Preference is a probability we update as evidence arrives.

Model a yes/no satisfaction question with a **Beta–Bernoulli** prior. Start with one “yes” and one “no” pseudo-count (\(\alpha_0 = \beta_0 = 1\)) — a uniform **50/50** prior: they can eat here, we know nothing about whether they’ll like it.

Each preference signal of strength 1, 2, or 3 adds that many counts to the matching side:

$$
\alpha = 1 + \begin{cases} \text{strength} & \text{direction} = \text{positive} \\ 0 & \text{otherwise} \end{cases}
$$

$$
\beta = 1 + \begin{cases} \text{strength} & \text{direction} = \text{negative} \\ 0 & \text{otherwise} \end{cases}
$$

Gemini’s complex-restriction audit then nudges the posterior (a bad kitchen is penalised harder than a good one is rewarded):

$$
(\alpha',\, \beta') = \begin{cases} (\alpha + 2,\; \beta) & \text{verdict} = \texttt{good} \\ (\alpha,\; \beta + 3) & \text{verdict} = \texttt{bad} \\ (\alpha,\; \beta + 1) & \text{verdict} = \texttt{neutral} \\ (\alpha,\; \beta) & \text{no verdict} \end{cases}
$$

**Posterior mean** — expected probability the guest is satisfied:

$$
U(g, r) = \begin{cases} 0 & \text{guest is infeasible at } r \\ \dfrac{\alpha'}{\alpha' + \beta'} & \text{otherwise} \end{cases}
$$

If they cannot eat, preference does not matter. Probability is zero.

## Bayesian score (per restaurant)

Average those per-guest probabilities with the same severity weights as coverage:

$$
\text{bayesian\_score}(r) = \frac{\displaystyle\sum_{g \in G} w(s_g)\cdot U(g, r)}{\displaystyle\sum_{g \in G} w(s_g)}
$$

No preferences and no audit → every \(U = 0.5\) → bayesian score stays 0.5 → ranking is decided by coverage alone.

## Guest-fit (dashboard display)

Rescale the 0–1 bayesian score around 50 so “no opinion” looks neutral, not like a failure:

$$
\text{guest\_fit} = \text{clamp}\!\left(\left\lfloor 50 + \left(\text{bayesian\_score} - 0.5\right) \times 100 \right\rceil,\; 0,\; 100\right)
$$

| Range | Label |
|-------|--------|
| 85–100 | Very High |
| 70–84 | High |
| 55–69 | Medium |
| 40–54 | Neutral |
| 25–39 | Low |
| 0–24 | Very Low |

## Overall score

Coverage is the foundation. Preference may nudge by at most about ±20 points:

$$
\text{bayesian\_adj} = \left(\text{bayesian\_score} - 0.5\right) \times 40
$$

$$
\text{overall\_score} = \text{clamp}\!\left(\text{weighted\_coverage\_pct} + \text{bayesian\_adj},\; 0,\; 100\right)
$$

When \(\text{bayesian\_score} = 0.5\), the nudge is zero and overall equals weighted coverage. Taste can break ties among safe kitchens. It cannot promote an unsafe one.

## Utilitarian vs Rawlsian fairness

**Utilitarian** — greatest good for the weighted table (same quantity as weighted coverage, as a fraction):

$$
\text{Utilitarian}(r) = \frac{\displaystyle\sum_{g \in G} w(s_g) \cdot \mathbf{1}[g \text{ is covered at } r]}{\displaystyle\sum_{g \in G} w(s_g)}
$$

**Rawlsian** (maximin) — is anyone left outside?

$$
\text{Rawlsian}(r) = \min_{g \in G}\; \mathbf{1}[g \text{ is covered at } r]
$$

The host’s default list follows utilitarian order. Both ranks are stored so a host can see when a popular kitchen still leaves someone with an empty plate.
