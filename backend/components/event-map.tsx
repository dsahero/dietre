"use client";

import { Badge } from "@/components/ui/badge";
import type { DietreEvent, RestaurantMatch } from "@/lib/types";

const BOUNDS = {
  minLat: 37.211,
  maxLat: 37.241,
  minLng: -80.429,
  maxLng: -80.396,
};

function pinStyle(lat: number, lng: number) {
  const left = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const top = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return {
    left: `${Math.min(96, Math.max(4, left))}%`,
    top: `${Math.min(96, Math.max(4, top))}%`,
  };
}

function pinColor(match: RestaurantMatch): string {
  if (!match.within_radius || !match.within_budget) return "bg-zinc-400";
  if (match.weighted_coverage_pct >= 80) return "bg-emerald-600";
  if (match.weighted_coverage_pct >= 50) return "bg-amber-500";
  return "bg-rose-600";
}

export function EventMap({
  event,
  restaurants,
}: {
  event: Pick<DietreEvent, "name" | "location" | "lat" | "lng">;
  restaurants: RestaurantMatch[];
}) {
  const visible = restaurants.filter((item) => item.within_radius).slice(0, 12);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-heading text-base">Blacksburg map</p>
          <p className="text-xs text-muted-foreground">
            Downtown, campus, and University City. Pins scale to match coverage. No Google key required.
          </p>
        </div>
        <Badge variant="outline">OSM-free pin plot</Badge>
      </div>
      <div className="relative aspect-[4/3] bg-[linear-gradient(180deg,#efe4d3_0%,#e4d4c0_100%)] sm:aspect-[16/9]">
        <div className="absolute inset-3 rounded-lg border border-primary/10 bg-[radial-gradient(circle_at_30%_40%,rgba(134,31,65,0.08),transparent_45%),linear-gradient(90deg,transparent_24px,rgba(92,31,26,0.05)_25px),linear-gradient(0deg,transparent_24px,rgba(92,31,26,0.05)_25px)] bg-size-[100%_100%,25px_25px,25px_25px]" />
        <p className="absolute top-5 left-5 text-[10px] tracking-[0.2em] text-primary/50 uppercase">
          Virginia Tech / Blacksburg
        </p>
        <p className="absolute right-5 bottom-8 text-[10px] text-primary/40">S. Main</p>
        <p className="absolute top-1/3 left-1/4 text-[10px] text-primary/40">College Ave</p>
        <div className="absolute size-4 -translate-x-1/2 -translate-y-1/2" style={pinStyle(event.lat, event.lng)}>
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
          <span className="relative grid size-4 place-items-center rounded-full bg-primary text-[8px] text-primary-foreground">
            ★
          </span>
        </div>
        {visible.map((match) => (
          <div
            key={match.restaurant.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={pinStyle(match.restaurant.lat, match.restaurant.lng)}
            title={`${match.restaurant.name} · ${match.weighted_coverage_pct}% weighted`}
          >
            <span className={`block size-2.5 rounded-full ring-2 ring-white ${pinColor(match)}`} />
          </div>
        ))}
      </div>
      <ul className="grid gap-2 border-t p-4 text-sm sm:grid-cols-2">
        {visible.map((match) => (
          <li key={match.restaurant.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 truncate">
              <span className={`size-2 rounded-full ${pinColor(match)}`} />
              {match.restaurant.name}
            </span>
            <span className="text-muted-foreground">{match.distance_miles} mi</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
