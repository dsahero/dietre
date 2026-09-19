"use client";

import React, { useState, useMemo } from 'react';
import { MapHeader } from './MapHeader';
import { MapNavigationSidebar } from './MapNavigationSidebar';
import { MapSidebar } from './MapSidebar';
import { MapView } from './MapView';
import { EventsDashboardView } from './EventsDashboardView';
import { INITIAL_LOCATIONS, MARKER_VARIABLE, NAVIGATION_TABS, EVENTS_DATA } from '@/shared/lib/map-view-data';
import { LocationItem, EventItem, UserProfile } from '@/shared/lib/map-view-types';

export function MapExplorer() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'map'>('dashboard');

  const [userProfile] = useState<UserProfile>({
    name: 'Lily Dritten',
    email: 'lilythedritten@gmail.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    provider: 'Email & Password',
    lastLogin: 'Today, 5:42 PM',
    createdAt: 'March 2024',
  });

  const [locations] = useState<LocationItem[]>(INITIAL_LOCATIONS);
  const [events] = useState<EventItem[]>(EVENTS_DATA);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);

  const [activeTab, setActiveTab] = useState<string>('map');
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterValue, setActiveFilterValue] = useState<string | null>(null);
  const [isLocationSidebarOpen, setIsLocationSidebarOpen] = useState<boolean>(true);

  // When an event entry in the grid is clicked, lead to the map view.
  const handleSelectEvent = (event: EventItem) => {
    setActiveEvent(event);
    setSelectedLocation(null);
    setCurrentView('map');
    setActiveTab('map');
  };

  const handleReturnToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedLocation(null);
  };

  // Derive initial map center based on active event venue if available
  const initialCenter = useMemo<[number, number] | undefined>(() => {
    if (activeEvent?.featuredLocationId) {
      const match = locations.find((l) => l.id === activeEvent.featuredLocationId);
      if (match) {
        return [match.lat, match.lng];
      }
    }
    return undefined;
  }, [activeEvent, locations]);

  // Filter locations based on search query and variable value filter
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (activeFilterValue) {
        if (loc.variableValue !== activeFilterValue) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = loc.name.toLowerCase().includes(q);
        const matchesLine1 = loc.line1.text.toLowerCase().includes(q);
        const matchesLine2 = loc.line2.text.toLowerCase().includes(q);
        const matchesLine3 = loc.line3.text.toLowerCase().includes(q);
        return matchesName || matchesLine1 || matchesLine2 || matchesLine3;
      }

      return true;
    });
  }, [locations, activeFilterValue, searchQuery]);

  // View 1: Events Dashboard with Grid System
  if (currentView === 'dashboard') {
    return (
      <EventsDashboardView
        events={events}
        onSelectEvent={handleSelectEvent}
        userAvatarUrl={userProfile.avatarUrl}
        userName={userProfile.name}
      />
    );
  }

  // View 2: Current Map View with Header, Sidebars, Colored Markers & Details Card
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F5ECE1] font-sans text-[#38261E] select-none">
      {/* 1. Header Bar with arrow return, search, and profile circle */}
      <MapHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLocationSidebarOpen={isLocationSidebarOpen}
        onToggleLocationSidebar={() => setIsLocationSidebarOpen((prev) => !prev)}
        totalLocations={filteredLocations.length}
        onReturnToDashboard={handleReturnToDashboard}
        activeEventName={activeEvent ? activeEvent.name : undefined}
        userAvatarUrl={userProfile.avatarUrl}
        userName={userProfile.name}
      />

      {/* 2. Main Layout: Navigation Tab Sidebar + Locations Sidebar + Map View */}
      <div className="flex flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden relative">
        {/* Navigation Sidebar */}
        <MapNavigationSidebar
          tabs={NAVIGATION_TABS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Location Details & Filter Sidebar */}
        <MapSidebar
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          markerVariable={MARKER_VARIABLE}
          activeFilterValue={activeFilterValue}
          onFilterChange={setActiveFilterValue}
          isOpen={isLocationSidebarOpen}
        />

        {/* Interactive Map View */}
        <main className="flex-1 h-full w-full relative overflow-hidden">
          <MapView
            locations={filteredLocations}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
            markerVariable={MARKER_VARIABLE}
            initialCenter={initialCenter}
          />
        </main>
      </div>
    </div>
  );
}

