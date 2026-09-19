"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLACKSBURG_PLACES } from "@/shared/lib/places";
import { Alert, AlertDescription, AlertTitle } from "@/frontend/components/ui/alert";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import type { BudgetRange } from "@/shared/lib/types";

export function EventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("2026-10-04T18:00");
  const [location, setLocation] = useState("Squires Student Center");
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
        <Label htmlFor="location">Location in Blacksburg</Label>
        <Input
          id="location"
          required
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Squires Student Center"
          list="blacksburg-places"
        />
        <datalist id="blacksburg-places">
          {BLACKSBURG_PLACES.map((place) => (
            <option key={place.label} value={place.label} />
          ))}
        </datalist>
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
      <Button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create event and get a share link"}
      </Button>
    </form>
  );
}
