"use client";

import React from 'react';
import { MapPin, Menu, Search, ArrowLeft } from 'lucide-react';

interface MapHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLocationSidebarOpen: boolean;
  onToggleLocationSidebar: () => void;
  totalLocations: number;
  onReturnToDashboard: () => void;
  activeEventName?: string;
  userAvatarUrl?: string;
  userName?: string;
  onOpenProfile?: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  searchQuery,
  onSearchChange,
  isLocationSidebarOpen,
  onToggleLocationSidebar,
  totalLocations,
  onReturnToDashboard,
  activeEventName,
  userAvatarUrl,
  userName,
  onOpenProfile,
}) => {
  return (
    <header
      id="site-header"
      className="h-16 w-full bg-[#EFE5D8] border-b border-[#DFCEBD] px-4 md:px-6 flex items-center justify-between z-30 shadow-xs flex-shrink-0"
    >
      {/* Left: Return Arrow Button, Brand & Sidebar Toggle */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Return to Events Dashboard button (just an arrow) */}
        <button
          id="btn-return-events-dashboard"
          onClick={onReturnToDashboard}
          className="p-2 rounded-xl bg-[#FAF5EF] hover:bg-[#F2E5D5] text-[#523526] hover:text-[#2B170F] border border-[#DFCEBD] shadow-xs transition-all cursor-pointer hover:shadow-sm flex items-center justify-center"
          title="Return to Events Dashboard"
          aria-label="Return to Events Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="h-5 w-px bg-[#CEB59F] hidden sm:block" />

        <button
          id="btn-toggle-sidebar"
          onClick={onToggleLocationSidebar}
          aria-label={isLocationSidebarOpen ? 'Hide location sidebar' : 'Show location sidebar'}
          className="p-2 rounded-xl text-[#523526] hover:bg-[#E2D2C0] transition-colors cursor-pointer"
          title="Toggle Locations Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#C15C3D] text-white flex items-center justify-center shadow-xs">
            <MapPin className="w-4 h-4 text-[#FFDEC9]" />
          </div>
          <div>
            <h1 className="text-base font-bold font-serif text-[#2B170F] leading-tight">
              {activeEventName ? activeEventName : 'Location Map View'}
            </h1>
            <p className="text-xs text-[#7A6052] hidden sm:block">
              {totalLocations} locations loaded • Click marker to view card
            </p>
          </div>
        </div>
      </div>

      {/* Right: Search Input & Profile Avatar Circle */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <div className="relative w-36 sm:w-56">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
          <input
            id="search-locations-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search locations..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF5EF] border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D] transition-all"
          />
        </div>

        {/* Profile Circle on top right corner */}
        {onOpenProfile && (
          <button
            id="header-profile-circle-btn"
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
  );
};

