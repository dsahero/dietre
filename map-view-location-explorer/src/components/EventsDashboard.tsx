import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { EventItem } from '../types';
import {
  Users,
  Calendar,
  MapPin,
  Search,
  Plus,
} from 'lucide-react';

interface EventsDashboardProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  userAvatarUrl?: string;
  userName?: string;
  onOpenProfile?: () => void;
}

export const EventsDashboard: React.FC<EventsDashboardProps> = ({
  events,
  onSelectEvent,
  userAvatarUrl,
  userName,
  onOpenProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter((ev) => {
      const matchName = ev.name.toLowerCase().includes(q);
      const matchLoc = ev.locationName.toLowerCase().includes(q);
      const matchCat = ev.category.toLowerCase().includes(q);
      return matchName || matchLoc || matchCat;
    });
  }, [events, searchQuery]);

  return (
    <div
      id="events-dashboard"
      className="min-h-screen w-full bg-[#F5EDE3] flex flex-col text-[#2B170F] select-none"
    >
      {/* Dashboard Top Header */}
      <header className="h-16 w-full bg-[#EFE5D8] border-b border-[#DFCEBD] px-6 md:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C15C3D] text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5 text-[#FFDEC9]" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-serif text-[#2B170F] leading-tight">
              Events Dashboard
            </h1>
            <p className="text-xs text-[#7A6052]">
              Select any event card to explore its location and live map details
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* New Event Button (non-functional currently) */}
          <button
            id="btn-new-event"
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#C15C3D] hover:bg-[#A8482C] text-white shadow-xs transition-all cursor-pointer"
            title="New Event"
          >
            <Plus className="w-4 h-4 text-[#FFDEC9]" />
            <span>New Event</span>
          </button>

          {/* Profile Circle Button on top right corner */}
          {onOpenProfile && (
            <button
              id="dashboard-profile-circle-btn"
              onClick={onOpenProfile}
              title={`View profile (${userName || 'User'})`}
              aria-label="View user profile"
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#C15C3D] hover:border-[#8E3A20] shadow-xs hover:shadow-md transition-all cursor-pointer flex-shrink-0 group ring-2 ring-transparent hover:ring-[#DFAB62]/50"
            >
              <img
                src={
                  userAvatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
                }
                alt={userName || 'User Profile'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Search & Events Summary Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-[#EADECE] p-3.5 rounded-2xl border border-[#D5C2AF]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#472E21] font-serif">
              Upcoming Events ({filteredEvents.length})
            </h2>
            <p className="text-xs text-[#7A6052]">
              Clicking an event opens the interactive location map view
            </p>
          </div>

          {/* Search Box */}
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

        {/* The Responsive Grid System */}
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD]">
            <p className="text-sm text-[#7A6052]">
              No events match your current search query.
            </p>
          </div>
        ) : (
          <div
            id="events-grid"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
          >
            {filteredEvents.map((event, idx) => (
              <motion.div
                key={event.id}
                id={`event-card-${event.id}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: Math.min((idx % 4) * 0.08, 0.3), ease: 'easeOut' }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                onClick={() => onSelectEvent(event)}
                className="group relative bg-[#FAF5EF] hover:bg-[#FFFDFB] rounded-2xl border border-[#DFCEBD] hover:border-[#C15C3D]/60 flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* 1. Picture: takes up the top part of the frame, borderless and flush with the frame */}
                <div className="relative w-full h-44 bg-[#E8DDD0] overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
                    }}
                  />

                  {/* Number of Participants Badge on image */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2B170F]/85 backdrop-blur-xs text-[#DFAB62] text-xs font-bold shadow-md">
                    <Users className="w-3.5 h-3.5 text-[#DFAB62]" />
                    <span>{event.participants.toLocaleString()} participants</span>
                  </div>
                </div>

                {/* 2. Name & Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold font-serif text-[#2B170F] group-hover:text-[#C15C3D] transition-colors line-clamp-2 leading-snug">
                      {event.name}
                    </h3>

                    {/* Venue & Date line */}
                    <div className="mt-2 space-y-1.5 text-xs text-[#7A6052]">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#C15C3D] flex-shrink-0" />
                        <span className="truncate text-[#523526] font-medium">{event.locationName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#8C6D5A] text-[11px]">
                        <Calendar className="w-3 h-3 text-[#C15C3D] flex-shrink-0" />
                        <span>{event.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
