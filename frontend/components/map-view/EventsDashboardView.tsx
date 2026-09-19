"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Users, Calendar, MapPin, Search, Plus } from 'lucide-react';
import type { DietreEvent } from '@/shared/lib/types';

export interface EventWithResponseCount extends DietreEvent {
  responseCount: number;
}

interface EventsDashboardViewProps {
  events: EventWithResponseCount[];
  hostEmail: string;
  profileName?: string;
  profileAvatarUrl?: string;
}

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
    <div id="events-dashboard" className="min-h-screen w-full bg-[#F5EDE3] flex flex-col text-[#2B170F] select-none">
      {/* Dashboard Top Header */}
      <header className="h-16 w-full bg-[#EFE5D8] border-b border-[#DFCEBD] px-6 md:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C15C3D] text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5 text-[#FFDEC9]" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-serif text-[#2B170F] leading-tight">Your Events</h1>
            <p className="text-xs text-[#7A6052]">Signed in as {hostEmail}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/events/new"
            id="btn-new-event"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#C15C3D] hover:bg-[#A8482C] text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FFDEC9]" />
            <span>New Event</span>
          </Link>

          <Link
            href="/profile"
            id="dashboard-profile-circle-btn"
            title={`View profile (${profileName || hostEmail})`}
            aria-label="View profile"
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#C15C3D] hover:border-[#8E3A20] shadow-xs hover:shadow-md transition-all cursor-pointer flex-shrink-0 flex items-center justify-center bg-[#FAF5EF] text-[#C15C3D] font-bold text-sm ring-2 ring-transparent hover:ring-[#DFAB62]/50"
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
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-[#EADECE] p-3.5 rounded-2xl border border-[#D5C2AF]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#472E21] font-serif">
              Your Events ({filteredEvents.length})
            </h2>
            <p className="text-xs text-[#7A6052]">Click an event to open its dashboard</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
            <input
              id="dashboard-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event or venue..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF5EF] border border-[#D5C2AF] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
            />
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD] space-y-3">
            <p className="text-sm text-[#7A6052]">
              No events yet. Create one, or check out the seeded{' '}
              <Link className="underline font-semibold text-[#C15C3D]" href="/events/demo-vt-hacks">
                VT Hacks demo
              </Link>
              .
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD]">
            <p className="text-sm text-[#7A6052]">No events match your current search query.</p>
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
                  className="group relative bg-[#FAF5EF] hover:bg-[#FFFDFB] rounded-2xl border border-[#DFCEBD] hover:border-[#C15C3D]/60 flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden h-full"
                >
                  {/* Generated pattern instead of a fake stock photo — no real venue photo exists */}
                  <div
                    className="relative w-full h-32 overflow-hidden flex items-end p-3"
                    style={{
                      background: `linear-gradient(135deg, #C15C3D 0%, #8E3A20 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent_45%)]" />
                    <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-xs text-[#FFDEC9] text-xs font-bold shadow-md">
                      <Users className="w-3.5 h-3.5" />
                      <span>{event.responseCount} response{event.responseCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-sm font-bold font-serif text-[#2B170F] group-hover:text-[#C15C3D] transition-colors line-clamp-2 leading-snug">
                        {event.name}
                      </h3>

                      <div className="mt-2 space-y-1.5 text-xs text-[#7A6052]">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#C15C3D] flex-shrink-0" />
                          <span className="truncate text-[#523526] font-medium">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#8C6D5A] text-[11px]">
                          <Calendar className="w-3 h-3 text-[#C15C3D] flex-shrink-0" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#8C6D5A]">
                      <span className="px-2 py-0.5 rounded-full bg-[#EADECE] border border-[#D5C2AF] font-semibold">
                        {event.budget_range}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#EADECE] border border-[#D5C2AF] font-semibold">
                        {event.radius} mi radius
                      </span>
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
