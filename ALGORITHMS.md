# Algorithm Mathematics

## 1. Haversine Distance

Used in `haversineMiles` to compute straight-line distance between the event location and each restaurant.

$$
h = \sin^2\!\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\,\sin^2\!\left(\frac{\Delta\lambda}{2}\right)
$$

$$
d = 2R\arcsin\!\left(\min\!\left(1,\,\sqrt{h}\right)\right)
$$

Where $\phi$ is latitude, $\lambda$ is longitude (both in radians), and $R = 3958.8$ miles.

---

## 2. Severity Weights

Each guest response is assigned a weight based on constraint severity:

$$
w(s) = \begin{cases} 3 & s = \text{high} \\ 2 & s = \text{medium} \\ 1 & s = \text{low} \end{cases}
$$

---

## 3. Coverage Scores

**Raw coverage** (headcount fraction):

$$
\text{coverage\_pct} = \left\lfloor \frac{|\{g : g \text{ is covered}\}|}{|G|} \times 100 \right\rceil
$$

**Severity-weighted coverage** (the primary ranking signal):

$$
\text{weighted\_coverage\_pct} = \left\lfloor \frac{\displaystyle\sum_{g \in G_\text{covered}} w(s_g)}{\displaystyle\sum_{g \in G} w(s_g)} \times 100 \right\rceil
$$

---

## 4. Bayesian Preference Utility (Beta-Bernoulli Conjugate)

**Prior:** $\alpha_0 = \beta_0 = 1$ (uniform — "guest can eat here, we know nothing about satisfaction").

Each LLM-extracted preference signal is a pseudo-Bernoulli observation:

$$
\alpha = 1 + \begin{cases} \text{strength} & \text{direction} = \text{positive} \\ 0 & \text{otherwise} \end{cases}
$$

$$
\beta = 1 + \begin{cases} \text{strength} & \text{direction} = \text{negative} \\ 0 & \text{otherwise} \end{cases}
$$

The complex-restriction verdict (from Gemini's menu audit) then modifies the posterior further:

$$
(\alpha',\, \beta') = \begin{cases} (\alpha + 2,\; \beta) & \text{verdict} = \texttt{good} \\ (\alpha,\; \beta + 3) & \text{verdict} = \texttt{bad} \\ (\alpha,\; \beta + 1) & \text{verdict} = \texttt{neutral} \\ (\alpha,\; \beta) & \text{no verdict} \end{cases}
$$

**Posterior mean** = expected probability of guest satisfaction:

$$
U(g, r) = \begin{cases} 0 & \text{guest is infeasible at } r \\ \dfrac{\alpha'}{\alpha' + \beta'} & \text{otherwise} \end{cases}
$$

---

## 5. Bayesian Score (per restaurant)

Severity-weighted average of per-guest utilities:

$$
\text{bayesian\_score}(r) = \frac{\displaystyle\sum_{g \in G} w(s_g)\cdot U(g, r)}{\displaystyle\sum_{g \in G} w(s_g)}
$$

> When no preferences exist, every guest has $\alpha' = \beta' = 1$, so $U = 0.5$ for all — no effect on ranking.

---

## 6. Guest Fit Score (display)

The raw `bayesian_score` (0–1, centered at 0.5) is rescaled to a 0–100 integer for the host UI:

$$
\text{guest\_fit} = \text{clamp}\!\left(\left\lfloor 50 + \left(\text{bayesian\_score} - 0.5\right) \times 100 \right\rceil,\; 0,\; 100\right)
$$

A score of 50 means the prior is unchanged — no preference data shifts the estimate. Labels:

| Range | Label |
|-------|-------|
| 85–100 | Very High |
| 70–84 | High |
| 55–69 | Medium |
| 40–54 | Neutral |
| 25–39 | Low |
| 0–24 | Very Low |

---

## 7. Overall Score (internal ranking tiebreaker)

Coverage anchors the score; the Bayesian signal nudges it by up to ±20 points:

$$
\text{bayesian\_adj} = \left(\text{bayesian\_score} - 0.5\right) \times 40
$$

$$
\text{overall\_score} = \text{clamp}\!\left(\text{weighted\_coverage\_pct} + \text{bayesian\_adj},\; 0,\; 100\right)
$$

---

## 8. Cosine Similarity (Food Embedding Matcher)

Used in `food_matcher.ts` to rank Spoonacular menu candidates against a local item's embedding:

$$
\cos(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\|\,\|\mathbf{b}\|} = \frac{\displaystyle\sum_i a_i b_i}{\sqrt{\displaystyle\sum_i a_i^2}\;\sqrt{\displaystyle\sum_i b_i^2}}
$$

---

## 9. Rawlsian vs. Utilitarian Group Fairness

Two competing social-welfare criteria are computed and stored:

$$
\text{Utilitarian}(r) = \frac{\displaystyle\sum_{g \in G} w(s_g) \cdot \mathbf{1}[g \text{ is covered at } r]}{\displaystyle\sum_{g \in G} w(s_g)}
$$

$$
\text{Rawlsian}(r) = \min_{g \in G}\; \mathbf{1}[g \text{ is covered at } r]
$$

The Rawlsian criterion (max-min justice) prioritises restaurants that leave *nobody* behind, whereas the utilitarian criterion maximises aggregate weighted coverage. Restaurants are ranked primarily by utilitarian score but both ranks are persisted so the host can compare them.
