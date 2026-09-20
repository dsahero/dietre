"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Users, X } from "lucide-react";

type Invite = {
  id: string;
  event_id: string;
  event_name: string;
  invited_by_name: string;
};

// Only host-facing pages look for invites; guest/participant pages never do.
const HOST_PATHS = ["/events", "/profile"];
const MIN_REFETCH_MS = 30_000;

/**
 * Bottom-right notification cards for pending collaboration invites. They
 * never time out: the × hides a card until the next page load, and Accept /
 * Decline resolve it. One query per check, and signed-out visitors get a 401
 * without touching the database.
 */
export function InviteNotifications() {
  const pathname = usePathname();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const lastFetch = useRef(0);
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    const fromAuthPage = previousPath.current === "/login" || previousPath.current === "/signup";
    previousPath.current = pathname;
    const relevant = HOST_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname === "/";
    if (!relevant) return;
    if (!fromAuthPage && Date.now() - lastFetch.current < MIN_REFETCH_MS) return;
    lastFetch.current = Date.now();

    let cancelled = false;
    fetch("/api/invites")
      .then((res) => (res.ok ? res.json() : { invites: [] }))
      .then((data: { invites?: Invite[] }) => {
        if (!cancelled) setInvites(data.invites ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const respond = async (invite: Invite, action: "accept" | "decline") => {
    setBusy(invite.id);
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(invite.id)}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setInvites((prev) => prev.filter((item) => item.id !== invite.id));
        if (action === "accept") {
          router.push(`/events/${invite.event_id}`);
          router.refresh();
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const visible = invites.filter((invite) => !hidden.has(invite.id));
  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[3000] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3">
      {visible.map((invite) => (
        <div
          key={invite.id}
          role="alert"
          className="pointer-events-auto rounded-sm border border-[var(--dash-border-strong,#cbb89a)] bg-[var(--dash-surface-raised,#fbf6ea)] p-4 text-[var(--dash-text,#2b1d12)] shadow-[0_10px_30px_rgba(20,12,6,0.35)]"
        >
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-accent,#b9502a)]" />
            <p className="flex-1 font-serif text-sm leading-snug">
              <strong>{invite.invited_by_name || "Someone"}</strong> invited you to collaborate on{" "}
              <strong>{invite.event_name}</strong>
            </p>
            <button
              type="button"
              aria-label="Dismiss for now"
              onClick={() => setHidden((prev) => new Set(prev).add(invite.id))}
              className="cursor-pointer rounded-xs p-0.5 text-[var(--dash-text-muted,#7a6a5c)] hover:text-[var(--dash-text,#2b1d12)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy === invite.id}
              onClick={() => respond(invite, "decline")}
              className="cursor-pointer rounded-xs border border-[var(--dash-border,#d8c9b0)] px-3 py-1.5 text-xs font-semibold text-[var(--dash-text-soft,#5a4a3c)] hover:text-[var(--dash-text,#2b1d12)] disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={busy === invite.id}
              onClick={() => respond(invite, "accept")}
              className="flex cursor-pointer items-center gap-1.5 rounded-xs bg-[var(--dash-accent,#b9502a)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy === invite.id && <Loader2 className="h-3 w-3 animate-spin" />}
              Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
