import { Badge } from "@/frontend/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { budgetFromPriceLevel } from "@/shared/lib/places";
import type { RestaurantMatch } from "@/shared/lib/types";

export function RestaurantRank({ matches }: { matches: RestaurantMatch[] }) {
  const eligible = matches.filter((match) => match.within_radius && match.within_budget);
  const filteredOut = matches.filter((match) => !match.within_radius || !match.within_budget);

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranked restaurants</CardTitle>
          <CardDescription>No Blacksburg restaurants are loaded yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {eligible.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No restaurants in range and budget</CardTitle>
            <CardDescription>
              Widen the radius or raise the budget. {filteredOut.length} seeded places are still listed below.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <ol className="space-y-3">
        {eligible.map((match, index) => (
          <RestaurantCard key={match.restaurant.id} match={match} rank={index + 1} />
        ))}
      </ol>
      {filteredOut.length > 0 && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer font-medium">
            {filteredOut.length} places outside radius or budget
          </summary>
          <ol className="mt-3 space-y-3">
            {filteredOut.map((match, index) => (
              <RestaurantCard key={match.restaurant.id} match={match} rank={index + 1} muted />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function RestaurantCard({
  match,
  rank,
  muted = false,
}: {
  match: RestaurantMatch;
  rank: number;
  muted?: boolean;
}) {
  const { restaurant } = match;
  return (
    <li className={muted ? "opacity-70" : undefined}>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">#{rank}</p>
              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
              <CardDescription>
                {restaurant.cuisine} · {restaurant.location}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl tabular-nums">{match.weighted_coverage_pct}%</p>
              <p className="text-xs text-muted-foreground">weighted cover</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Badge variant="secondary">{match.coverage_pct}% of responses</Badge>
            <Badge variant="outline">{budgetFromPriceLevel(restaurant.price_level)}</Badge>
            <Badge variant="outline">{match.distance_miles} miles</Badge>
            <Badge variant="outline">
              {match.covered_count}/{match.total_responses} guests
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">Safe-enough menu items</p>
          {match.safe_items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No item covers anyone in the current response set.</p>
          ) : (
            <ul className="space-y-2">
              {match.safe_items.slice(0, 5).map((entry) => (
                <li key={entry.item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.item.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.item.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="secondary">${entry.item.price}</Badge>
                      {entry.uncertain ? <Badge variant="outline">low confidence</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Works for {entry.covered_response_ids.length} guest
                    {entry.covered_response_ids.length === 1 ? "" : "s"} · flags{" "}
                    {Object.entries(entry.item.flags)
                      .filter(([, on]) => on)
                      .map(([key]) => key.replaceAll("_", " "))
                      .slice(0, 4)
                      .join(", ") || "none"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
