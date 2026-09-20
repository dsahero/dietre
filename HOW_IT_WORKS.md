# How Dietre finds menus and matches a group

Dietre is **When2meet for catering**: anonymous, ingredient-level matching for a whole table, not a five-star restaurant picker for one person.

## High-level overview

**Finding the menu.** Restaurants don’t give us a list of ingredients. So Dietre goes and finds the actual food menu — a page, a PDF, whatever the venue published. Gemini reads that menu and writes down the dishes. It only keeps ingredients that were actually on the page. If a dish is just a name, we know it exists, not what’s in it. We still match. We just don’t pretend we’re sure.

**Matching the group.** Matching is not “this restaurant is Thai.” It is: can this table eat here, and if so, how likely are they to want it?

Guests describe their diet in their own words. Gemini turns that into hard nos, combo rules (“meat and dairy are each fine, not on the same plate”), and likes. Then Dietre checks the dishes, not the cuisine tag. An allergy is a locked door — if nothing is safe, that guest is not covered, full stop. Preferences (spicy, not pasta) can tilt the score among kitchens that already work. They cannot unlock an unsafe one.

For trickier rules, Gemini can also audit the menu. Then Dietre ranks places for the whole group: how much of the table can eat (stricter needs count more), whether anyone is left with an empty plate, and how sure we are given how much of the menu we actually read.

The rest of this document is the detailed version: how the site walk works, how scores are computed, and the vocabulary behind them.

---

## Finding the menu

Think of each restaurant website as a building with no front desk. The menu might be in the lobby, down a hallway marked “Order online”, or in a PDF taped to a back wall. Dietre sends a researcher through that building, then types up what it finds.

When someone opens an event, Dietre looks up restaurants inside the search radius. Google will only return twenty places per search, nearest first — like asking “who is nearby?” and only hearing the people standing in the doorway. To cover the whole circle, Dietre uses **adaptive spatial tiling**: it repeats the search on smaller patches of the map until the radius is filled, or time and quota run out.

Places with a website and no recent menu go on a background queue, nearest first. That work runs in a **child process** so a slow restaurant site cannot freeze the app. A host can also start the same hunt from the dashboard and watch it happen.

**How the researcher walks the site**

1. Start at the homepage.
2. If the page already files a structured menu (**JSON-LD** — the digital equivalent of a labeled binder on the counter), stop. That *is* the menu.
3. If the page is an empty glass case that only fills in after JavaScript runs, open it in a **headless browser**, the way you would walk into the room instead of reading the window poster. Sometimes the live menu is sitting in a hidden data request; grab that too.
4. Otherwise collect every door on the same property — every same-site link, including PDFs. Do not guess from the word “menu” yet.
5. Ask **Gemini** which doors are the food menu, which are worth walking through, and which are gift cards, careers, or Instagram. If Gemini is unavailable, **graceful degradation**: prefer a PDF, then anything whose name looks like “menu”.
6. Walk at most a couple of hallways deeper. Do not wander the whole internet.

**Turning pages into dishes**

A PDF is read as text (a scanned photo of a menu has nothing to extract — there is no OCR yet). An HTML page is tried in order: the labeled binder, a high-recall extractor, then ordinary page scraping.

Gemini then reads that text and writes down dishes the way they appear on the page: name, price, description, and **only ingredients that are actually written there**. “Bacon” becomes a pork flag. A dish with listed ingredients is **high confidence**. A dish that is only a name is **low confidence** — we know it exists, not what is in it. That uncertainty is not swept under the rug. It goes into the probabilistic model: thin menus make us less willing to claim a “high” match.

That list of dishes is what matching uses.

---

## Matching the group

Matching is not “this restaurant is Thai, someone said they like Thai.” It is closer to packing a picnic for a mixed group, then asking, *in probability*, how well that picnic will go.

First: **can each person eat at least one thing?** That is **feasibility**. An allergy is a locked door, not a taste. If the door is locked, the probability of a good meal is zero. No vibe score overrules that.

Second: **if they can eat, how likely are they to actually want this?** That is **Bayesian guest-fit**. It can break a tie. It should not unlock a door.

A restaurant **covers** a guest if any dish is safe for them. If nobody at the table can eat, the restaurant is out.

### Is this dish safe?

Each guest arrives with hard nos (allergies, religious rules), **complex restrictions** (“meat and dairy are each fine, not on the same plate”), soft preferences (“I like spicy food”), and a **severity**.

Severity is the difference between a fire alarm and a suggestion box:

$$
w(s) = \begin{cases} 3 & s = \text{high} \\ 2 & s = \text{medium} \\ 1 & s = \text{low} \end{cases}
$$

High is typically medical (peanuts, celiac). Medium is typically religious or ethical. Low is taste. When the group’s needs compete, the fire alarm gets more say than the suggestion box. That is **severity-weighted** scoring: not all guests are equal votes.

A dish fails a guest if their hard nos show up in the dish’s flags (pork, gluten, dairy, …) or in the ingredient list. Matching uses **word-boundary matching**, so “egg” does not condemn “eggplant” — that would be like banning a house because it contains the letters in “hat”.

Two special locks:

- Vegan / vegetarian mean whole categories of animal ingredients, not a single word on the ticket.
- “Do not mix meat and dairy” is a **combination lock**. Meat alone is fine. Dairy alone is fine. Both in one dish is not.

If the guest’s constraint is an allergy (high severity) and we barely know what is in the dish (low confidence), treat it as unsafe. Better an empty plate in the model than a guess that could send someone to the ER.

Compound rules are hard to catch with keywords. Gemini can **audit** the menu in the background — like a referee who understands “keep them separate,” not a bouncer who only checks IDs. If that audit is slow or missing, the simple locks still run (**fire-and-forget** upgrades later). The page never waits on a network call.

### How far, how expensive?

Distance is as the crow flies, not driving time. Latitude and longitude go into the **Haversine** formula, with Earth radius \(R = 3958.8\) miles:

$$
h = \sin^2\!\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\,\sin^2\!\left(\frac{\Delta\lambda}{2}\right)
$$

$$
d = 2R\arcsin\!\left(\min\!\left(1,\,\sqrt{h}\right)\right)
$$

Budget uses dish prices when the menu has them, otherwise the venue’s price level. A place outside the radius or over budget can still be shown; it is ranked behind places that fit both.

---

## The scores, in plain language

This is the probabilistic core. Coverage answers “can they eat?” as a fraction of the table. Guest-fit answers “will they like it?” as a **probability**. The ranker combines them so taste never outruns safety.

### Coverage: “how much of the table can eat here?”

Raw coverage is a headcount. If eight of ten guests can eat, that is 80%:

$$
\text{coverage\_pct} = \left\lfloor \frac{|\{g : g \text{ is covered}\}|}{|G|} \times 100 \right\rceil
$$

**Severity-weighted coverage** is the same idea with the fire-alarm weights. Feeding the person with the peanut allergy counts more than feeding the person who “isn’t in the mood for pasta”:

$$
\text{weighted\_coverage\_pct} = \left\lfloor \frac{\displaystyle\sum_{g \in G_\text{covered}} w(s_g)}{\displaystyle\sum_{g \in G} w(s_g)} \times 100 \right\rceil
$$

This is the **primary** ranking signal: seats that actually have a meal, with extra weight on the seats that cannot improvise.

### Guest fit: “if they can eat, how likely are they to like it?”

Safety is a gate. Preference is a **belief**, updated the Bayesian way.

Imagine a jar that starts with one white marble and one black marble. That is the **uniform prior**: “they can eat here, we have no idea if they will enjoy it” — a **50/50** guess. Each clue drops in more marbles. “They asked for spicy food and this kitchen is built around heat” adds white. “They said they are tired of pasta and this is a pasta house” adds black. The fraction of white is our current probability they will be satisfied. That fraction is the **posterior mean**.

The jar is not a metaphor we made up after the fact. It is a **Beta–Bernoulli conjugate prior** — the standard Bayesian model for a yes/no that you keep learning about. Starting counts \(\alpha_0 = \beta_0 = 1\). A preference signal of strength 1, 2, or 3 adds that many marbles to the matching color:

$$
\alpha = 1 + \begin{cases} \text{strength} & \text{direction} = \text{positive} \\ 0 & \text{otherwise} \end{cases}
$$

$$
\beta = 1 + \begin{cases} \text{strength} & \text{direction} = \text{negative} \\ 0 & \text{otherwise} \end{cases}
$$

The referee’s verdict on complex rules adds a few more (a bad kitchen is penalised harder than a good one is rewarded):

$$
(\alpha',\, \beta') = \begin{cases} (\alpha + 2,\; \beta) & \text{verdict} = \texttt{good} \\ (\alpha,\; \beta + 3) & \text{verdict} = \texttt{bad} \\ (\alpha,\; \beta + 1) & \text{verdict} = \texttt{neutral} \\ (\alpha,\; \beta) & \text{no verdict} \end{cases}
$$

If the guest cannot eat anything, the jar does not matter. Probability of a good meal is **zero**. Otherwise it is the share of white marbles:

$$
U(g, r) = \begin{cases} 0 & \text{guest is infeasible at } r \\ \dfrac{\alpha'}{\alpha' + \beta'} & \text{otherwise} \end{cases}
$$

The restaurant’s **Bayesian score** is those probabilities averaged with the same severity weights as coverage — an expected group utility, not a vibe:

$$
\text{bayesian\_score}(r) = \frac{\displaystyle\sum_{g \in G} w(s_g)\cdot U(g, r)}{\displaystyle\sum_{g \in G} w(s_g)}
$$

No preferences and no audit means every guest stays at \(U = 0.5\). The prior never moved. Ranking is decided by coverage alone — which is the honest thing to do when you have no evidence.

On the dashboard this is stretched around 50 so “we have no opinion” looks like a middle score, not a failure:

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

### Overall score: coverage first, probability as a nudge

Think of coverage as the foundation of the building, and guest-fit as a probability painted on top. Paint can make two equally safe buildings look different. It cannot make an unsafe building win.

The Bayesian signal may move the number by at most about twenty points:

$$
\text{bayesian\_adj} = \left(\text{bayesian\_score} - 0.5\right) \times 40
$$

$$
\text{overall\_score} = \text{clamp}\!\left(\text{weighted\_coverage\_pct} + \text{bayesian\_adj},\; 0,\; 100\right)
$$

When nobody stated a preference, \(\text{bayesian\_score} = 0.5\), the nudge is zero, and overall score equals weighted coverage.

**Sort order in practice:** in-radius and in-budget first, then weighted coverage, then this Bayesian probability, then raw headcount, then closest.

---

## Two ideas of fairness

Matching a group is a **social choice** problem, not a single diner’s Yelp sort. Dietre computes both of the classic answers.

The default ranking is **utilitarian**: maximise expected welfare for the weighted table (greatest good for the greatest number, with fire alarms counting more). That is the same quantity as weighted coverage, written as a fraction:

$$
\text{Utilitarian}(r) = \frac{\displaystyle\sum_{g \in G} w(s_g) \cdot \mathbf{1}[g \text{ is covered at } r]}{\displaystyle\sum_{g \in G} w(s_g)}
$$

**Rawlsian** fairness (maximin justice) asks a different question: is *anyone* left standing outside?

$$
\text{Rawlsian}(r) = \min_{g \in G}\; \mathbf{1}[g \text{ is covered at } r]
$$

Analogy: a school trip. Utilitarian is the vote that picks the place most of the class (especially the kids with the strictest needs) can eat. Rawlsian is the chaperone’s rule that you do not choose a kitchen where even one child has an empty tray. A venue can look strong on the vote and still fail the chaperone.

Both ranks are stored so a host can see the difference. The list the host sees first follows the utilitarian order.

If a guest cannot eat at any place that is in range and in budget, they become a **zero-match** alert: someone the current shortlist cannot serve.

---

## Confidence: how much of the menu did we actually read?

A high coverage number on a thin menu is like recommending a restaurant after seeing only the chalkboard by the door. The chip on each card blends the group score with **menu-data quality**:

- No menu, or no guests yet → **unknown**. There is nothing to score.
- Fewer than half the dishes have explicit ingredients → cannot be “high”, even if coverage looks perfect.

That is the same probabilistic honesty as the Bayesian jar. If the evidence is thin, Dietre will not shout. The chip is not a second brain. It is a label that says whether we are reading a full menu or squinting at names.

---

## How the two jobs fit together

Scraping is the researcher in the building. Matching is a **probabilistic picnic list**.

Without a menu, Dietre shrugs (unknown confidence, no safe dishes). With a menu, it asks, for every guest and every restaurant: is the door unlocked? If yes, start at 50/50 and **update the probability** they will actually want to eat there. Then it counts how many doors opened, counts the fire alarms louder than the suggestion boxes, checks whether anyone was left on the sidewalk, and only then lets taste tilt the choice among kitchens that can actually feed the table.

---

# Methods and buzzwords

## Finding restaurants

- Google Places API (New): Nearby Search, ranked by distance
- Adaptive spatial tiling with recursive subdivision, to get past Google’s 20-results-per-search limit
- Haversine distance (great-circle maths) for “as the crow flies”
- Radius and budget filters on the candidate set

## Reading menus

- Layered web crawl (homepage → follow a few doors, not the whole internet)
- JSON-LD / schema.org menu detection (the labeled binder)
- Cheerio HTML parsing
- SPA detection and headless Chrome (puppeteer-core)
- XHR / menu-API capture from rendered pages
- PDF text extraction (pdf-parse); no OCR on photo menus
- Firecrawl HTML extractor (high-recall text)
- LLM link picking: Gemini chooses `menu_found` / `navigate` / `none`
- Heuristic fallback if Gemini is down (PDF, then anything named “menu”)
- Child-process scraper so the web server stays light
- Ingredient flags from listed text only; high vs low confidence by how much was actually written

## Matching the group

- Anonymous, ingredient-level dietary matching (“When2meet for catering”)
- Feasibility gate: a guest is covered iff at least one dish is safe
- Word-boundary ingredient matching (`egg` ≠ `eggplant`)
- Combination rules (meat and dairy each fine, not in the same dish)
- Allergy conservatism: high-severity guest + low-confidence dish → unsafe
- Severity-weighted coverage (fire alarm 3×, suggestion box 1×)
- Probabilistic fit: safety is a hard gate; liking it is a probability
- Bayesian modeling with a Beta–Bernoulli conjugate prior
- Uniform prior (50/50), then update, then posterior mean
- Severity-weighted expected utility across the table
- Gemini menu audit for complex restrictions, fire-and-forget into cache
- Overall score: coverage anchored, Bayesian nudge of at most ±20
- Utilitarian vs Rawlsian group fairness (greatest good vs nobody left behind)
- Confidence tiers that blend group score with menu-data quality
- Zero-match alerts for guests no in-range, in-budget kitchen can feed
- Signature-based cache keys; deterministic fallbacks; graceful degradation
