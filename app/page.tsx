import Link from "next/link";
import { ModeBanner } from "@/components/mode-banner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-10 md:py-16">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">Blacksburg / Virginia Tech demo</p>
            <h1 className="font-heading max-w-xl text-4xl leading-tight text-balance md:text-6xl">
              When2meet for catering.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              Ask 30–300+ people what they eat. DietRe turns that into restaurant rankings and safe menu items — no
              names, no spreadsheet archaeology, no “who can’t eat the pork?” thread.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/login">Host an event</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/events/demo-vt-hacks">Open the VT Hacks demo</Link>
              </Button>
            </div>
          </div>
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-primary-foreground">The loop, once</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Built for closing dinners, club banquets, and hackathon catering.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6">
              <p>1. Host signs in and drops a location, radius, budget, and headcount.</p>
              <p>2. Guests get a link. One box: “what do you eat?” No name field exists.</p>
              <p>3. Chips for hard excludes, soft preferences, and severity. Edit, then submit.</p>
              <p>4. The dashboard ranks Blacksburg restaurants by who they actually cover — constrained guests count more.</p>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Anonymous by design</CardTitle>
              <CardDescription>
                Responses store rules, not identities. Email is optional and only used if nothing on the menu works.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ingredient-level matching</CardTitle>
              <CardDescription>
                Hard excludes collide with estimated ingredients and flags like pork, gluten, shellfish, and meat-dairy combo.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Zero-match alerts</CardTitle>
              <CardDescription>
                If a guest has no safe item anywhere in range, the host sees an anonymous flag — plus email only if they left one.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
        <section className="rounded-2xl border bg-card p-6 md:p-10">
          <h2 className="font-heading text-2xl md:text-3xl">Seeded on 20 real Blacksburg kitchens</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Gillie’s, Cabo Fish Taco, The Cellar, Nawab, Moe’s Original BBQ, Tokyo, Viet House, and the rest of the downtown
            and University City circuit. Menus are plausible estimates with confidence tags — not a live Yelp scrape.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/r/demo-vt-hacks">Fill out the demo guest form</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/events/new">Create your own event</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
