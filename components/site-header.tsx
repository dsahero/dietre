"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HostSession } from "@/lib/types";

type MeResponse = {
  host: HostSession | null;
};

export function SiteHeader({ quiet = false }: { quiet?: boolean }) {
  const router = useRouter();
  const [host, setHost] = useState<HostSession | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => setHost(data.host))
      .catch(() => setHost(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setHost(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-[11px] font-semibold tracking-wide text-primary-foreground">
            DR
          </span>
          <span className="font-heading text-lg tracking-tight">DietRe</span>
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
                <Button variant="outline" size="sm" onClick={logout}>
                  Sign out
                </Button>
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
