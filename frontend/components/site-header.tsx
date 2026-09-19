import Link from "next/link";
import { LogoutButton } from "@/frontend/components/logout-button";
import { Button } from "@/frontend/components/ui/button";
import { HostThemeToggle } from "@/frontend/components/host-theme-toggle";
import { getSession } from "@/backend/lib/auth";
import { DietreLogo } from "@/frontend/components/dietre-logo";

export async function SiteHeader({ quiet = false }: { quiet?: boolean }) {
  const host = quiet ? null : await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center" aria-label="dietre home">
          <DietreLogo className="h-6 w-auto text-foreground hover:opacity-85 transition-opacity" />
        </Link>
        {!quiet && (
          <nav className="flex items-center gap-1.5 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events/demo-vt-hacks">Demo</Link>
            </Button>
            {host ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/events">My events</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/events/new">New event</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/profile">Profile</Link>
                </Button>
                <LogoutButton />
                <HostThemeToggle />
              </>
            ) : (
              <Button size="sm" asChild>
                <Link href="/login">Host login</Link>
              </Button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
