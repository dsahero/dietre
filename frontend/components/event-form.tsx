"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/frontend/components/ui/alert";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { LocationAutocomplete } from "@/frontend/components/location-autocomplete";
import type { BudgetRange } from "@/shared/lib/types";

export function EventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("2026-10-04T18:00");
  const [location, setLocation] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [radius, setRadius] = useState("2");
  const [budget, setBudget] = useState<BudgetRange>("$$");
  const [headcount, setHeadcount] = useState("120");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date,
          location,
          place_id: placeId,
          radius: Number(radius),
          budget_range: budget,
          expected_headcount: Number(headcount),
        }),
      });
      const data = (await res.json()) as { event?: { id: string }; error?: string };
      if (!res.ok || !data.event) throw new Error(data.error || "Could not create the event.");
      router.push(`/events/${data.event.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the event.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Event name</Label>
        <Input id="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="VT Hacks closing dinner" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date and time</Label>
          <Input id="date" type="datetime-local" required value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="headcount">Expected headcount</Label>
          <Input
            id="headcount"
            type="number"
            min={1}
            required
            value={headcount}
            onChange={(event) => setHeadcount(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <LocationAutocomplete
          id="location"
          required
          value={location}
          placeId={placeId}
          onChange={(value, nextPlaceId) => {
            setLocation(value);
            setPlaceId(nextPlaceId);
          }}
          onSearchEnabledChange={setSearchEnabled}
          placeholder="Start typing an address…"
          inputClassName="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
        {location.trim() && !placeId && searchEnabled && (
          <p className="text-xs text-muted-foreground">Pick a suggestion from the dropdown to confirm this location.</p>
        )}
        {location.trim() && !placeId && !searchEnabled && (
          <p className="text-xs text-muted-foreground">Type the full address. We'll geocode it when you create the event.</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="radius">Search radius (miles)</Label>
          <Input
            id="radius"
            type="number"
            min={0.25}
            max={30}
            step={0.25}
            required
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Budget range</Label>
          <Select value={budget} onValueChange={(value) => setBudget(value as BudgetRange)}>
            <SelectTrigger>
              <SelectValue placeholder="Budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="$">$ · campus cheap eats</SelectItem>
              <SelectItem value="$$">$$ · most downtown spots</SelectItem>
              <SelectItem value="$$$">$$$ · include Palisades-level</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Event not created</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={busy || !location.trim()}>
        {busy ? "Creating…" : "Create event and get a share link"}
      </Button>
    </form>
  );
}
