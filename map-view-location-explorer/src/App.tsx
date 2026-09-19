/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { NavigationSidebar } from './components/NavigationSidebar';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { EventsDashboard } from './components/EventsDashboard';
import { ProfilePage } from './components/ProfilePage';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { SignUpPage } from './components/SignUpPage';
import { INITIAL_LOCATIONS, MARKER_VARIABLE, NAVIGATION_TABS } from './data/locations';
import { EVENTS_DATA } from './data/events';
import { LocationItem, EventItem, UserProfile } from './types';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'signup' | 'dashboard' | 'map' | 'profile'>('home');
  const [previousView, setPreviousView] = useState<'dashboard' | 'map'>('dashboard');

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Lily Dritten',
    email: 'lilythedritten@gmail.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    provider: 'Email & Password',
    lastLogin: 'Today, 5:42 PM',
    createdAt: 'March 2024',
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAccountDeleted, setIsAccountDeleted] = useState<boolean>(false);

  const [locations] = useState<LocationItem[]>(INITIAL_LOCATIONS);
  const [events] = useState<EventItem[]>(EVENTS_DATA);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);

  const [activeTab, setActiveTab] = useState<string>('map');
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterValue, setActiveFilterValue] = useState<string | null>(null);
  const [isLocationSidebarOpen, setIsLocationSidebarOpen] = useState<boolean>(true);

  const handleOpenProfile = () => {
    if (currentView === 'dashboard' || currentView === 'map') {
      setPreviousView(currentView);
    }
    setCurrentView('profile');
  };

  const handleReturnFromProfile = () => {
    setCurrentView(previousView);
  };

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

  const handleUpdateEmail = (newEmail: string) => {
    setUserProfile((prev) => ({ ...prev, email: newEmail }));
  };

  const handleUpdateName = (newName: string) => {
    setUserProfile((prev) => ({ ...prev, name: newName }));
  };

  const handleUpdateAvatar = (newAvatar: string) => {
    setUserProfile((prev) => ({ ...prev, avatarUrl: newAvatar }));
  };

  const handleUserLogin = (profileData: Partial<UserProfile>) => {
    setUserProfile((prev) => ({
      ...prev,
      ...profileData,
    }));
    setIsLoggedIn(true);
    setIsAccountDeleted(false);
    setCurrentView('dashboard');
  };

  const handleUserSignUp = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setIsLoggedIn(true);
    setIsAccountDeleted(false);
    setCurrentView('dashboard');
  };

  const handleGoToHome = () => {
    setCurrentView('home');
  };

  const handleGoToLogin = () => {
    setCurrentView('login');
  };

  const handleGoToSignUp = () => {
    setCurrentView('signup');
  };

  const handleLogOut = () => {
    setIsLoggedIn(false);
    setCurrentView('home');
  };

  const handleDeleteAccount = () => {
    setIsAccountDeleted(true);
  };

  const handleRestoreAccount = () => {
    setIsAccountDeleted(false);
    setIsLoggedIn(false);
    setUserProfile({
      name: 'Lily Dritten',
      email: 'lilythedritten@gmail.com',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      provider: 'Email & Password',
      lastLogin: 'Just now',
      createdAt: 'September 2026',
    });
    setCurrentView('home');
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

  // State: Account Deleted View
  if (isAccountDeleted) {
    return (
      <div className="min-h-screen w-full bg-[#F5ECE1] flex items-center justify-center p-6 text-[#38261E] select-none">
        <div className="bg-[#FAF5EF] max-w-md w-full rounded-3xl border border-[#E5B59E] shadow-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#FBECE6] text-[#C15C3D] flex items-center justify-center mx-auto border border-[#F2C7B6]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-serif text-[#782816]">Account Deleted</h2>
            <p className="text-xs text-[#6B5549] leading-relaxed">
              Your account and personal credentials have been removed. You can start fresh or restore a default account at any time.
            </p>
          </div>
          <button
            onClick={handleRestoreAccount}
            className="w-full py-2.5 px-4 rounded-xl bg-[#C15C3D] hover:bg-[#A84A2E] text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-[#FFDEC9]" />
            <span>Create / Restore Account</span>
          </button>
        </div>
      </div>
    );
  }

  // View 0: Homepage advertising the product (default landing view)
  if (currentView === 'home' || (!isLoggedIn && currentView !== 'login' && currentView !== 'signup')) {
    return (
      <HomePage
        onGoToLogin={handleGoToLogin}
        onGoToSignUp={handleGoToSignUp}
      />
    );
  }

  // View: Sign Up Page (requires all profile information)
  if (currentView === 'signup') {
    return (
      <SignUpPage
        onSignUp={handleUserSignUp}
        onGoToLogin={handleGoToLogin}
        onGoToHome={handleGoToHome}
        defaultEmail={userProfile.email}
      />
    );
  }

  // View: Log In Page (when signed out or switched to login view)
  if (currentView === 'login' || !isLoggedIn) {
    return (
      <LoginPage
        onLogin={handleUserLogin}
        onGoToSignUp={handleGoToSignUp}
        onGoToHome={handleGoToHome}
        defaultEmail={userProfile.email}
      />
    );
  }

  // View: Profile Page
  if (currentView === 'profile') {
    return (
      <ProfilePage
        profile={userProfile}
        onUpdateEmail={handleUpdateEmail}
        onUpdateName={handleUpdateName}
        onUpdateAvatar={handleUpdateAvatar}
        onDeleteAccount={handleDeleteAccount}
        onLogOut={handleLogOut}
        onGoToLogin={handleGoToLogin}
        onBack={handleReturnFromProfile}
      />
    );
  }

  // View 1: Events Dashboard with Grid System
  if (currentView === 'dashboard') {
    return (
      <EventsDashboard
        events={events}
        onSelectEvent={handleSelectEvent}
        userAvatarUrl={userProfile.avatarUrl}
        userName={userProfile.name}
        onOpenProfile={handleOpenProfile}
      />
    );
  }

  // View 2: Current Map View with Header, Sidebars, Colored Markers & Details Card
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F5ECE1] font-sans text-[#38261E] select-none">
      {/* 1. Header Bar with arrow return, search, and profile circle */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLocationSidebarOpen={isLocationSidebarOpen}
        onToggleLocationSidebar={() => setIsLocationSidebarOpen((prev) => !prev)}
        totalLocations={filteredLocations.length}
        onReturnToDashboard={handleReturnToDashboard}
        activeEventName={activeEvent ? activeEvent.name : undefined}
        userAvatarUrl={userProfile.avatarUrl}
        userName={userProfile.name}
        onOpenProfile={handleOpenProfile}
      />

      {/* 2. Main Layout: Navigation Tab Sidebar + Locations Sidebar + Map View */}
      <div className="flex flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden relative">
        {/* Navigation Sidebar */}
        <NavigationSidebar
          tabs={NAVIGATION_TABS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Location Details & Filter Sidebar */}
        <Sidebar
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
