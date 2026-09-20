import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/frontend/components/event-form";
import { ModeBanner } from "@/frontend/components/mode-banner";
import { SiteHeader } from "@/frontend/components/site-header";
import { getSession } from "@/backend/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Link
          href="/events"
          className="group inline-flex items-center gap-1.5 mb-4 py-1.5 px-3 rounded-xs border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] text-xs font-heading font-semibold text-[var(--dash-text-soft)] transition-all hover:border-[var(--dash-accent)] hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)] cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[var(--dash-accent)] stroke-[1.75] transition-transform group-hover:-translate-x-0.5" />
          <span>Back to My Events</span>
        </Link>
        <h1 className="font-heading text-3xl">Create an event</h1>
        <p className="mt-2 mb-8 text-muted-foreground">
          Search any address worldwide. Restaurant matching uses your chosen coordinates and search radius.
          Places outside the radius still appear, just demoted.
        </p>
        <EventForm />
      </main>
    </div>
  );
}
