"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Users, Calendar, MapPin, Search, Plus } from 'lucide-react';
import type { Collaborator, DietreEvent, PendingInvite } from '@/shared/lib/types';
import { EventPeoplePopover } from '@/frontend/components/dashboard/components/EventPeoplePopover';
import { HostThemeToggle } from '@/frontend/components/host-theme-toggle';

export interface EventWithResponseCount extends DietreEvent {
  responseCount: number;
}

interface EventsDashboardViewProps {
  events: EventWithResponseCount[];
  hostEmail: string;
  profileName?: string;
  profileAvatarUrl?: string;
}

// Person icon + access list for a shared event; state is local so removals
// show immediately without reloading the list.
const EventCardPeople: React.FC<{ event: EventWithResponseCount; hostEmail: string }> = ({ event, hostEmail }) => {
  const viewer = hostEmail.trim().toLowerCase();
  const [collaborators, setCollaborators] = useState<Collaborator[]>(event.collaborators ?? []);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(event.pending_invites ?? []);
  const isOwner = !(event.collaborator_emails ?? []).includes(viewer);
  return (
    <EventPeoplePopover
      compact
      eventId={event.id}
      isOwner={isOwner}
      viewerEmail={viewer}
      collaborators={collaborators}
      pendingInvites={pendingInvites}
      onChange={(next) => {
      onChange={(next: { collaborators: Collaborator[]; pendingInvites: PendingInvite[] }) => {
        setCollaborators(next.collaborators);
        setPendingInvites(next.pendingInvites);
      }}
    />
  );
};

export const EventsDashboardView: React.FC<EventsDashboardViewProps> = ({
  events,
  hostEmail,
  profileName,
  profileAvatarUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter((ev) => {
      return ev.name.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q);
    });
  }, [events, searchQuery]);

  return (
    <div id="events-dashboard" className="min-h-screen w-full bg-[var(--dash-bg)] flex flex-col text-[var(--dash-text)] select-none">
      {/* Dashboard Top Header */}
      <header className="h-16 w-full bg-[var(--dash-surface)] border-b border-[var(--dash-border)] px-6 md:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--dash-accent)] text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5 text-[#FFDEC9]" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading text-[var(--dash-text)] leading-tight">Your Events</h1>
            <p className="text-xs text-[var(--dash-text-soft)]">Signed in as {hostEmail}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <HostThemeToggle />

          <Link
            href="/events/new"
            id="btn-new-event"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FFDEC9]" />
            <span>New Event</span>
          </Link>

          <Link
            href="/profile"
            id="dashboard-profile-circle-btn"
            title={`View profile (${profileName || hostEmail})`}
            aria-label="View profile"
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--dash-accent)] hover:border-[var(--dash-accent-deep)] shadow-xs hover:shadow-md transition-all cursor-pointer flex-shrink-0 flex items-center justify-center bg-[var(--dash-surface-raised)] text-[var(--dash-accent)] font-bold text-sm ring-2 ring-transparent hover:ring-[#DFAB62]/50"
          >
            {profileAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileAvatarUrl} alt={profileName || hostEmail} className="w-full h-full object-cover" />
            ) : (
              (profileName || hostEmail).charAt(0).toUpperCase()
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-[var(--dash-surface-raised)] p-4 rounded-md border border-[var(--dash-border)] shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-[var(--dash-text)] font-heading">
              Your Events ({filteredEvents.length})
            </h2>
            <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">Select an event to open its banquet ledger</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]" />
            <input
              id="dashboard-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event or venue..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] font-serif focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)] shadow-2xs"
            />
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center bg-[var(--dash-surface-raised)] rounded-2xl border border-[var(--dash-border)] space-y-3">
            <p className="text-sm text-[var(--dash-text-soft)]">
              No events yet. Create one, or check out the seeded{' '}
              <Link className="underline font-semibold text-[var(--dash-accent)]" href="/events/demo-vt-hacks">
                VT Hacks demo
              </Link>
              .
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-[var(--dash-surface-raised)] rounded-2xl border border-[var(--dash-border)]">
            <p className="text-sm text-[var(--dash-text-soft)]">No events match your current search query.</p>
          </div>
        ) : (
          <div id="events-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredEvents.map((event, idx) => (
              <motion.div
                key={event.id}
                id={`event-card-${event.id}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min((idx % 4) * 0.08, 0.3), ease: 'easeOut' }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Link
                  href={`/events/${event.id}`}
                  className="group relative bg-[var(--dash-surface-raised)] rounded-md border border-[var(--dash-border)] hover:border-[var(--dash-accent)] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-full"
                >
                  {/* Google Places Location Image Header */}
                  <div className="relative w-full h-32 overflow-hidden flex items-end p-3 border-b border-[var(--dash-border)] bg-[var(--dash-surface)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/places/image?query=${encodeURIComponent(event.name + ' ' + event.location)}&address=${encodeURIComponent(event.location)}&place_id=${encodeURIComponent(event.google_place_id || '')}`}
                      alt={event.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
                    <div className="absolute right-2 top-2 z-20">
                      <EventCardPeople event={event} hostEmail={hostEmail} />
                    </div>
                    <div className="relative z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/60 backdrop-blur-xs text-white font-mono text-[11px] font-bold shadow-xs">
                      <Users className="w-3.5 h-3.5 text-[#f5d5be]" />
                      <span>{event.responseCount} response{event.responseCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-[var(--dash-surface-raised)]">
                    <div>
                      <h3 className="font-heading text-base font-bold text-[var(--dash-text)] group-hover:text-[var(--dash-accent)] transition-colors line-clamp-2 leading-snug">
                        {event.name}
                      </h3>

                      <div className="mt-2 space-y-1.5 text-xs text-[var(--dash-text-soft)]">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[var(--dash-accent)] flex-shrink-0" />
                          <span className="truncate text-[var(--dash-text-soft)] font-serif">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--dash-text-muted)]">
                          <Calendar className="w-3.5 h-3.5 text-[var(--dash-accent)] flex-shrink-0" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10.5px] text-[var(--dash-text-muted)] pt-2 border-t border-[var(--dash-border)]/60">
                      <span className="px-1.5 py-0.5 rounded-xs bg-[var(--dash-surface)] border border-[var(--dash-border)] font-semibold">
                        {event.budget_range}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-xs bg-[var(--dash-surface)] border border-[var(--dash-border)] font-semibold">
                        {event.radius} mi radius
                      </span>
                      {(event.collaborator_emails ?? []).includes(hostEmail.trim().toLowerCase()) && (
                        <span className="px-1.5 py-0.5 rounded-xs bg-[var(--dash-accent)]/15 border border-[var(--dash-accent)]/40 font-semibold text-[var(--dash-accent)]">
                          Shared with you
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
