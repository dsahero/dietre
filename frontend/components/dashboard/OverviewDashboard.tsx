"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DonutChart } from './components/DonutChart';
import { AudienceStatsCard } from './components/AudienceStatsCard';
import { RestaurantCard } from './components/RestaurantCard';
import { EditEventModal } from './components/EditEventModal';
import { ParticipantsView } from './components/ParticipantsView';
import { ParticipantDetailModal } from './components/ParticipantDetailModal';
import { ShortlistedView } from './components/ShortlistedView';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { PARTICIPANTS_DATA } from './data/participants';
import { RESTAURANTS_DATA } from './data/restaurants';
import {
  DonutSegment,
  EventDetails,
  NavItem,
  RestaurantCardData,
  StatMetric,
  Participant,
} from './types';
import {
  Pencil,
  MapPin,
  DollarSign,
  Navigation,
  AlertTriangle,
  Sparkles,
  Users,
  PieChart,
  ArrowUpDown,
  Star,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Layers,
} from 'lucide-react';

export type RestaurantSortOption = 'best_fit' | 'least_costly' | 'closest' | 'highest_rated';

export default function OverviewDashboard() {
  // Navigation & Sidebar Fold State
  const [activeNavId, setActiveNavId] = useState<string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Event Details State
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    name: 'Executive Leadership Gala Dinner',
    limitations:
      'All venues must provide certified gluten-free & vegan alternatives. Minimum 45 seated capacity with dedicated private acoustic zoning. Evening sound curfew at 10:30 PM. ADA wheelchair accessible entrance required.',
    maxBudget: '$120 / guest',
    maxDistanceRadius: '5 miles',
    address: 'Metropolitan Arts Pavilion, 450 Grand Avenue, Suite 100',
  });

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState<boolean>(false);

  // Restaurant Detail & Suggested Menu Modal State
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantCardData | null>(null);
  const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState<boolean>(false);

  // Restaurants State & Shortlist
  const [restaurants] = useState<RestaurantCardData[]>(RESTAURANTS_DATA);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([
    'osteria-del-sole',
    'saffron-silk-pavilion',
  ]);
  const [sortBy, setSortBy] = useState<RestaurantSortOption>('best_fit');
  const [restaurantLayout, setRestaurantLayout] = useState<'side_scroll' | 'stacked'>('side_scroll');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const restaurantScrollRef = useRef<HTMLDivElement>(null);

  const handleScrollRestaurants = (direction: 'left' | 'right') => {
    if (restaurantScrollRef.current) {
      const scrollAmount = direction === 'left' ? -460 : 460;
      restaurantScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Participants State (12 Attendees)
  const [participants] = useState<Participant[]>(PARTICIPANTS_DATA);

  // Chart Mode: Dietary Intake (default per user prompt) vs. Venue Kitchen Traits
  const [chartMode, setChartMode] = useState<'dietary' | 'traits'>('dietary');

  // Dynamic Nav Items with real-time badges
  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Venues', badge: `${restaurants.length}`, iconName: 'utensils' },
      {
        id: 'shortlisted',
        label: 'Shortlisted',
        badge: `${shortlistedIds.length}`,
        iconName: 'bookmark',
      },
      {
        id: 'participants',
        label: 'Participants',
        badge: `${participants.length}`,
        iconName: 'users',
      },
      { id: 'reports', label: 'Reports', iconName: 'file-text' },
      { id: 'library', label: 'Library', iconName: 'library' },
    ],
    [restaurants.length, shortlistedIds.length, participants.length]
  );

  // 1. Participant Dietary Restriction Distribution (User Requirement)
  // Categorized into Main Groups + Complex "Other"
  const dietaryStats = useMemo(() => {
    // 12 participants total:
    // Other / Complex: Elena (Nut/Shellfish), Tariq (Diabetic), Sarah (Allium/Sodium), Chloe (Lactose) -> 4 (33.3%)
    // Vegetarian & Vegan: Julian (Vegan), Rajesh (Strict Veg), Sophie (Lacto-Ovo) -> 3 (25.0%)
    // Halal & Kosher: Amina (Halal), Hannah (Kosher) -> 2 (16.7%)
    // Standard / No Restrictions: Mateo, David -> 2 (16.7%)
    // Gluten-Free & Celiac: Marcus -> 1 (8.3%)

    // Total degrees = 360
    // Other: 120 deg
    // Veg: 90 deg
    // Halal/Kosher: 60 deg
    // Standard: 60 deg
    // Gluten-Free: 30 deg

    const segments: DonutSegment[] = [
      {
        id: 'other-complex',
        label: 'Other (Complex / Medical)',
        color: '#ef4444', // Red
        startAngle: 0,
        endAngle: 120,
        percentage: '33%',
        count: 4,
      },
      {
        id: 'veg-vegan',
        label: 'Vegetarian & Vegan',
        color: '#22c55e', // Green
        startAngle: 120,
        endAngle: 210,
        percentage: '25%',
        count: 3,
      },
      {
        id: 'halal-kosher',
        label: 'Halal & Kosher',
        color: '#a855f7', // Purple
        startAngle: 210,
        endAngle: 270,
        percentage: '17%',
        count: 2,
      },
      {
        id: 'standard',
        label: 'Standard (No Restrictions)',
        color: '#38bdf8', // Sky Blue
        startAngle: 270,
        endAngle: 330,
        percentage: '17%',
        count: 2,
      },
      {
        id: 'gluten-free',
        label: 'Gluten-Free & Celiac',
        color: '#f59e0b', // Amber
        startAngle: 330,
        endAngle: 360,
        percentage: '8%',
        count: 1,
      },
    ];

    const metrics: StatMetric[] = [
      {
        percentage: '33%',
        label: 'Other (Complex / Medical)',
        color: '#ef4444',
        count: 4,
      },
      {
        percentage: '25%',
        label: 'Vegetarian & Vegan',
        color: '#22c55e',
        count: 3,
      },
      {
        percentage: '17%',
        label: 'Halal & Kosher Requirements',
        color: '#a855f7',
        count: 2,
      },
      {
        percentage: '17%',
        label: 'Standard (No Restrictions)',
        color: '#38bdf8',
        count: 2,
      },
      {
        percentage: '8%',
        label: 'Gluten-Free & Celiac Disease',
        color: '#f59e0b',
        count: 1,
      },
    ];

    return { segments, metrics, totalGuests: participants.length };
  }, [participants]);

  // 2. Trait stats across candidate venues
  const traitStats = useMemo(() => {
    let good = 0;
    let neutral = 0;
    let bad = 0;

    restaurants.forEach((r) => {
      r.traits.forEach((t) => {
        if (t.type === 'good') good++;
        else if (t.type === 'neutral') neutral++;
        else if (t.type === 'bad') bad++;
      });
    });

    const total = good + neutral + bad || 1;
    const goodPct = Math.round((good / total) * 100);
    const neutralPct = Math.round((neutral / total) * 100);
    const badPct = 100 - goodPct - neutralPct;

    const goodAngle = (goodPct / 100) * 360;
    const neutralAngle = (neutralPct / 100) * 360;

    const segments: DonutSegment[] = [
      {
        id: 'good-traits',
        label: 'Good Accommodation Traits',
        color: '#22c55e',
        startAngle: 0,
        endAngle: goodAngle,
        percentage: `${goodPct}%`,
        count: good,
      },
      {
        id: 'neutral-traits',
        label: 'Neutral Conditions',
        color: '#eab308',
        startAngle: goodAngle,
        endAngle: goodAngle + neutralAngle,
        percentage: `${neutralPct}%`,
        count: neutral,
      },
      {
        id: 'bad-traits',
        label: 'Alert / Conflict Traits',
        color: '#ef4444',
        startAngle: goodAngle + neutralAngle,
        endAngle: 360,
        percentage: `${badPct}%`,
        count: bad,
      },
    ];

    const metrics: StatMetric[] = [
      { percentage: `${goodPct}%`, label: 'Good Traits (Verified Menus)', color: '#22c55e', count: good },
      { percentage: `${neutralPct}%`, label: 'Neutral Traits (Operational Notes)', color: '#eab308', count: neutral },
      { percentage: `${badPct}%`, label: 'Alert Traits (Missing Halal/Risks)', color: '#ef4444', count: bad },
    ];

    return { segments, metrics, totalVenues: restaurants.length };
  }, [restaurants]);

  // Toggle Shortlist
  const handleToggleShortlist = (id: string) => {
    const isNowShortlisted = !shortlistedIds.includes(id);
    setShortlistedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    const venueName = restaurants.find((r) => r.id === id)?.name || 'Venue';
    triggerNotification(
      isNowShortlisted
        ? `${venueName} added to Shortlist`
        : `${venueName} removed from Shortlist`
    );
  };

  // Participant Selection Handler
  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsParticipantModalOpen(true);
  };

  // Restaurant Selection Handler for Details & Suggested Menu Modal
  const handleOpenRestaurantDetails = (restaurant: RestaurantCardData) => {
    setSelectedRestaurant(restaurant);
    setIsRestaurantModalOpen(true);
  };

  // Home Button Action
  const handleGoHome = () => {
    setActiveNavId('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerNotification('Returned to Event Overview');
  };

  const triggerNotification = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 3000);
  };

  // Sorted candidate restaurants based on user requirements:
  // - Best Fit to Participants (highest dietary match %)
  // - Least Costly (lowest estimated food cost)
  // - Closest Options (lowest distance radius)
  // - Highest Rated (guest rating)
  const sortedRestaurants = useMemo(() => {
    const list = [...restaurants];
    switch (sortBy) {
      case 'best_fit':
        return list.sort((a, b) => b.matchPercentage - a.matchPercentage);
      case 'least_costly':
        return list.sort((a, b) => {
          const costA = a.estimatedCost?.totalEstimatedCost || 1200;
          const costB = b.estimatedCost?.totalEstimatedCost || 1200;
          return costA - costB;
        });
      case 'closest':
        return list.sort((a, b) => {
          const distA = parseFloat(a.distance.replace(/[^0-9.]/g, '')) || 0;
          const distB = parseFloat(b.distance.replace(/[^0-9.]/g, '')) || 0;
          return distA - distB;
        });
      case 'highest_rated':
        return list.sort((a, b) => b.rating - a.rating);
      default:
        return list;
    }
  }, [restaurants, sortBy]);

  return (
    <div className="dashboard-layout" id="dashboard-layout">
      {/* Toast Notification */}
      {showNotification && (
        <div
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 bg-[#291c18] border border-[#b8744b]/60 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200"
        >
          <Sparkles className="w-4 h-4 text-[#d88c5e]" />
          <span>{showNotification}</span>
        </div>
      )}

      {/* Left Navigation Sidebar with Fold / Slide Out capability */}
      <Sidebar
        navItems={navItems}
        activeId={activeNavId}
        onSelect={(id) => setActiveNavId(id)}
        workspaceTitle="WORKSPACE"
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onGoHome={handleGoHome}
      />

      {/* Main Content Area */}
      <main
        className={`main-content transition-all duration-300 ${
          isSidebarCollapsed ? 'pl-8 sm:pl-16' : 'pl-6 sm:pl-10'
        }`}
        id="main-content"
      >
        {/* Page Header: Event Name + "Edit event details" button */}
        <header className="main-header" id="main-header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* Top Subtitle / Breadcrumb */}
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold tracking-wider text-[#a0928c] uppercase">
                <span>EVENT PAGE</span>
                <span>•</span>
                <span className="text-[#d88c5e]">
                  {activeNavId === 'shortlisted'
                    ? 'SHORTLISTED VENUES'
                    : activeNavId === 'participants'
                    ? 'PARTICIPANTS & DIETARY INTAKE'
                    : activeNavId === 'reports'
                    ? 'FEASIBILITY REPORTS'
                    : activeNavId === 'library'
                    ? 'GUIDELINES LIBRARY'
                    : 'VENUE CURATION'}
                </span>
              </div>

              {/* Event Name Heading */}
              <h1 className="page-title text-2xl sm:text-3xl font-bold text-white tracking-tight" id="page-title">
                {eventDetails.name}
              </h1>
            </div>

            {/* "Edit event details" Button with Pencil Icon */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="edit-event-details-btn"
                onClick={() => setIsEditModalOpen(true)}
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#2b1e1a] hover:bg-[#382621] border border-[#4a342b] hover:border-[#b8744b]/60 text-[#d8cbc5] hover:text-white transition-all shadow-md active:scale-98 cursor-pointer"
                title="Edit event details"
              >
                <div className="w-6 h-6 rounded-lg bg-[#b8744b]/20 flex items-center justify-center text-[#d88c5e] group-hover:bg-[#b8744b] group-hover:text-white transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-semibold tracking-wide">
                  Edit event details
                </span>
              </button>
            </div>
          </div>

          {/* Event Parameters Box (Address, Budget, Radius, Limitations) - Expands naturally, NO side scroll */}
          <div
            className="mt-5 p-4 sm:p-5 rounded-2xl bg-[#231a17] border border-[#3a2822] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5"
            id="event-parameters-summary"
          >
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#cfc2bc]">
              {/* Event Address */}
              <div className="flex items-center gap-1.5 bg-[#1a1210] px-3 py-1.5 rounded-xl border border-[#362620]">
                <MapPin className="w-3.5 h-3.5 text-[#d88c5e] shrink-0" />
                <span className="font-semibold text-white">
                  {eventDetails.address}
                </span>
              </div>

              {/* Max Budget */}
              <div className="flex items-center gap-1.5 bg-[#1a1210] px-3 py-1.5 rounded-xl border border-[#362620]">
                <DollarSign className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                <span>Max Budget:</span>
                <span className="font-semibold text-white">{eventDetails.maxBudget}</span>
              </div>

              {/* Max Distance Radius */}
              <div className="flex items-center gap-1.5 bg-[#1a1210] px-3 py-1.5 rounded-xl border border-[#362620]">
                <Navigation className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                <span>Max Radius:</span>
                <span className="font-semibold text-white">
                  {eventDetails.maxDistanceRadius}
                </span>
              </div>
            </div>

            {/* Event Limitations Box - Truncated after 30 characters with ... */}
            {eventDetails.limitations && (
              <div
                className="flex items-center gap-2 text-xs bg-[#1f1513] px-3.5 py-2 rounded-xl border border-[#3c2a23] text-[#e0b769] cursor-pointer hover:border-[#e0b769]/50 transition-colors shrink-0"
                onClick={() => setIsEditModalOpen(true)}
                title={`Limitations: ${eventDetails.limitations} (Click to edit)`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#eab308]" />
                <div className="text-[#cfc1ba] text-xs">
                  <strong className="text-[#eab308] mr-1.5 font-semibold">Limitations:</strong>
                  <span>
                    {eventDetails.limitations.length > 30
                      ? `${eventDetails.limitations.slice(0, 30)}...`
                      : eventDetails.limitations}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Dynamic View Body Content */}
        <div className="content-body" id="content-body">
          {/* VIEW 1: PARTICIPANTS VIEW */}
          {activeNavId === 'participants' && (
            <ParticipantsView
              participants={participants}
              onSelectParticipant={handleSelectParticipant}
            />
          )}

          {/* VIEW 2: SHORTLISTED VENUES VIEW */}
          {activeNavId === 'shortlisted' && (
            <ShortlistedView
              restaurants={restaurants}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              eventDetails={eventDetails}
              onExploreMore={() => setActiveNavId('overview')}
              onClickDetails={handleOpenRestaurantDetails}
            />
          )}

          {/* VIEW 3: OVERVIEW / ALL VENUES CURATION */}
          {activeNavId === 'overview' && (
            <>
              {/* Top Row: Donut Chart + Dietary / Trait Stats Card */}
              <div className="space-y-3" id="overview-chart-container">
                {/* View Switcher: Participant Dietary Profiles vs. Candidate Kitchen Traits */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#a0928c]">
                      Overview Visualization:
                    </span>
                    <span className="text-xs text-[#ded3cd] font-semibold">
                      {chartMode === 'dietary'
                        ? '12 Attendees Dietary Restrictions Breakdown'
                        : 'Kitchen Accommodation Traits Distribution'}
                    </span>
                  </div>

                  <div className="inline-flex p-1 rounded-xl bg-[#201512] border border-[#34241e] text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setChartMode('dietary')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        chartMode === 'dietary'
                          ? 'bg-[#b8744b] text-white shadow-sm'
                          : 'text-[#9e8f88] hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Dietary Restrictions (12 Guests)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('traits')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        chartMode === 'traits'
                          ? 'bg-[#b8744b] text-white shadow-sm'
                          : 'text-[#9e8f88] hover:text-white'
                      }`}
                    >
                      <PieChart className="w-3.5 h-3.5" />
                      <span>Venue Kitchen Traits</span>
                    </button>
                  </div>
                </div>

                <section className="overview-top-row" id="overview-top-row">
                  {/* Donut Chart: Visualizes Dietary Restrictions or Traits */}
                  <DonutChart
                    segments={
                      chartMode === 'dietary'
                        ? dietaryStats.segments
                        : traitStats.segments
                    }
                    audienceLabel={
                      chartMode === 'dietary' ? 'PARTICIPANTS' : 'RESTAURANTS'
                    }
                    audienceValue={
                      chartMode === 'dietary'
                        ? `${dietaryStats.totalGuests} GUESTS`
                        : `${traitStats.totalVenues} VENUES`
                    }
                  />

                  {/* Stats Card: Metrics breakdown */}
                  <AudienceStatsCard
                    metrics={
                      chartMode === 'dietary'
                        ? dietaryStats.metrics
                        : traitStats.metrics
                    }
                  />
                </section>
              </div>

              {/* Section Header & Controls for Restaurants */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#2d1e19]">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Candidate Restaurants ({sortedRestaurants.length})
                  </h2>
                  <div className="hidden md:flex items-center gap-2 text-xs text-[#9e8f88] bg-[#201512] px-2.5 py-1 rounded-full border border-[#32221d]">
                    <span>Sorted by:</span>
                    <strong className="text-[#e89c6f] font-semibold capitalize">
                      {sortBy.replace('_', ' ')}
                    </strong>
                  </div>
                </div>

                {/* View Layout Controls & Sorting Options */}
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  {/* Layout Mode Switcher */}
                  <div className="inline-flex p-0.5 rounded-xl bg-[#201512] border border-[#34241e]">
                    <button
                      type="button"
                      onClick={() => setRestaurantLayout('side_scroll')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        restaurantLayout === 'side_scroll'
                          ? 'bg-[#b8744b] text-white shadow-sm'
                          : 'text-[#9e8f88] hover:text-white'
                      }`}
                      title="Side Scroll candidate restaurants row"
                    >
                      <MoveHorizontal className="w-3.5 h-3.5" />
                      <span>Side Scroll List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestaurantLayout('stacked')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        restaurantLayout === 'stacked'
                          ? 'bg-[#b8744b] text-white shadow-sm'
                          : 'text-[#9e8f88] hover:text-white'
                      }`}
                      title="Stacked cards going down"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Stacked</span>
                    </button>
                  </div>

                  {/* Horizontal Scroll Arrows for Restaurants List */}
                  {restaurantLayout === 'side_scroll' && (
                    <div className="flex items-center gap-1 bg-[#201512] p-0.5 rounded-xl border border-[#34241e]">
                      <button
                        type="button"
                        onClick={() => handleScrollRestaurants('left')}
                        className="p-1 rounded-lg text-[#b8744b] hover:text-white hover:bg-[#b8744b]/20 transition-colors cursor-pointer"
                        title="Scroll restaurants left"
                        aria-label="Scroll restaurants left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollRestaurants('right')}
                        className="p-1 rounded-lg text-[#b8744b] hover:text-white hover:bg-[#b8744b]/20 transition-colors cursor-pointer"
                        title="Scroll restaurants right"
                        aria-label="Scroll restaurants right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Sorting Options: Best Fit, Least Costly, Closest, Rating */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="text-[11px] font-semibold text-[#8e7e78] uppercase tracking-wider mr-1 flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3 text-[#b8744b]" />
                      Sort:
                    </span>

                    <button
                      type="button"
                      onClick={() => setSortBy('best_fit')}
                      className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        sortBy === 'best_fit'
                          ? 'bg-[#b8744b] text-white border-[#b8744b] shadow-sm'
                          : 'bg-[#201512] text-[#9e8f88] border-[#32221d] hover:text-white hover:border-[#4a342b]'
                      }`}
                      title="Sort by best dietary match to participants"
                    >
                      <Users className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>Best Fit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSortBy('least_costly')}
                      className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        sortBy === 'least_costly'
                          ? 'bg-[#b8744b] text-white border-[#b8744b] shadow-sm'
                          : 'bg-[#201512] text-[#9e8f88] border-[#32221d] hover:text-white hover:border-[#4a342b]'
                      }`}
                      title="Sort by lowest estimated total / per-guest food cost"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-[#22c55e]" />
                      <span>Least Costly</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSortBy('closest')}
                      className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        sortBy === 'closest'
                          ? 'bg-[#b8744b] text-white border-[#b8744b] shadow-sm'
                          : 'bg-[#201512] text-[#9e8f88] border-[#32221d] hover:text-white hover:border-[#4a342b]'
                      }`}
                      title="Sort by closest distance to event location"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>Closest</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSortBy('highest_rated')}
                      className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        sortBy === 'highest_rated'
                          ? 'bg-[#b8744b] text-white border-[#b8744b] shadow-sm'
                          : 'bg-[#201512] text-[#9e8f88] border-[#32221d] hover:text-white hover:border-[#4a342b]'
                      }`}
                      title="Sort by highest review rating"
                    >
                      <Star className="w-3.5 h-3.5 text-[#facc15]" />
                      <span>Rating</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Candidate Restaurant Cards Container: Side Scroll List or Stacked */}
              {restaurantLayout === 'side_scroll' ? (
                <div className="space-y-2">
                  <div
                    ref={restaurantScrollRef}
                    className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin"
                    id="content-cards-container"
                  >
                    {sortedRestaurants.map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="w-[360px] sm:w-[500px] md:w-[560px] shrink-0 snap-start"
                      >
                        <RestaurantCard
                          restaurant={restaurant}
                          isShortlisted={shortlistedIds.includes(restaurant.id)}
                          onToggleShortlist={handleToggleShortlist}
                          onClickDetails={handleOpenRestaurantDetails}
                          eventDetails={eventDetails}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#8e7e78] px-1">
                    <span className="flex items-center gap-1.5">
                      <MoveHorizontal className="w-3.5 h-3.5 text-[#b8744b]" />
                      Side scroll (&harr;) to explore candidate restaurants list without clipping
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleScrollRestaurants('left')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#201512] border border-[#34241e] text-[#cfc1ba] hover:text-white hover:border-[#b8744b] transition-colors cursor-pointer"
                      >
                        &larr; Scroll Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollRestaurants('right')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#201512] border border-[#34241e] text-[#cfc1ba] hover:text-white hover:border-[#b8744b] transition-colors cursor-pointer"
                      >
                        Scroll Right &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <section className="content-cards-section" id="content-cards-container">
                  {sortedRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      isShortlisted={shortlistedIds.includes(restaurant.id)}
                      onToggleShortlist={handleToggleShortlist}
                      onClickDetails={handleOpenRestaurantDetails}
                      eventDetails={eventDetails}
                    />
                  ))}
                </section>
              )}
            </>
          )}

          {/* VIEW 4: REPORTS VIEW */}
          {activeNavId === 'reports' && (
            <div className="space-y-6" id="reports-view-container">
              <div className="p-6 rounded-2xl bg-[#231a17] border border-[#3b2a23] shadow-md">
                <h3 className="text-lg font-bold text-white mb-2">
                  Dietary Compliance & Venue Feasibility Matrix
                </h3>
                <p className="text-xs text-[#9b8b84] mb-6">
                  Cross-referencing {participants.length} attendee dietary profiles against shortlisted candidate kitchens.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#1c1311] border border-[#372620]">
                    <div className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider mb-1">
                      Critical Allergen Cross-Check
                    </div>
                    <div className="text-2xl font-bold text-white">100% Passed</div>
                    <div className="text-[11px] text-[#9b8b84] mt-1">
                      Zero tree-nut / peanut cross-contamination risk verified for candidate venues.
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1311] border border-[#372620]">
                    <div className="text-xs font-semibold text-[#f59e0b] uppercase tracking-wider mb-1">
                      Celiac / Dedicated GF Kitchen
                    </div>
                    <div className="text-2xl font-bold text-white">2 of 4 Venues</div>
                    <div className="text-[11px] text-[#9b8b84] mt-1">
                      L&apos;Osteria del Sole &amp; The Brass Botanist maintain dedicated GF prep areas.
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1311] border border-[#372620]">
                    <div className="text-xs font-semibold text-[#22c55e] uppercase tracking-wider mb-1">
                      Budget Compliance
                    </div>
                    <div className="text-2xl font-bold text-[#4ade80]">Under Budget</div>
                    <div className="text-[11px] text-[#9b8b84] mt-1">
                      Average candidate cost ($107/guest) within the ${eventDetails.maxBudget} threshold.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: LIBRARY VIEW */}
          {activeNavId === 'library' && (
            <div className="space-y-6" id="library-view-container">
              <div className="p-6 rounded-2xl bg-[#231a17] border border-[#3b2a23] shadow-md">
                <h3 className="text-lg font-bold text-white mb-2">
                  Event Operations & Hospitality Guidelines Library
                </h3>
                <p className="text-xs text-[#9b8b84] mb-6">
                  Standard operating procedures and contract checklists for executive private dining.
                </p>

                <div className="space-y-3 text-xs text-[#cfc1ba]">
                  <div className="p-3.5 rounded-xl bg-[#1b1210] border border-[#35241f] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Acoustic Curfew Protocol (10:30 PM)</span>
                      <span className="text-[11px] text-[#8e7e78]">Audio limiter thresholds & amplifier shutoff steps.</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#4ade80] text-[10px] font-semibold border border-[#22c55e]/30">Active</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1b1210] border border-[#35241f] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Medical Allergen Tier 1 Isolation</span>
                      <span className="text-[11px] text-[#8e7e78]">EpiPen attendee notification and sealed platter service guide.</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#4ade80] text-[10px] font-semibold border border-[#22c55e]/30">Active</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1b1210] border border-[#35241f] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Executive Transportation & Radius Policy</span>
                      <span className="text-[11px] text-[#8e7e78]">Strict 5-mile maximum radius from Metropolitan Arts Pavilion.</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#4ade80] text-[10px] font-semibold border border-[#22c55e]/30">Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Event Details Modal (Popup that blurs background) */}
      <EditEventModal
        key={isEditModalOpen ? 'edit-open' : 'edit-closed'}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        eventDetails={eventDetails}
        attendeeCount={participants.length}
        onSave={(updated) => {
          setEventDetails(updated);
          triggerNotification('Event parameters updated successfully');
        }}
      />

      {/* Participant Dietary, Preferences, Email & AI Chat Transcript Modal */}
      <ParticipantDetailModal
        isOpen={isParticipantModalOpen}
        participant={selectedParticipant}
        onClose={() => {
          setIsParticipantModalOpen(false);
          setSelectedParticipant(null);
        }}
      />

      {/* Advanced Restaurant Details, Compatibility Dropdown & Suggested Menu Items Modal */}
      <RestaurantDetailModal
        isOpen={isRestaurantModalOpen}
        restaurant={selectedRestaurant}
        participants={participants}
        eventDetails={eventDetails}
        isShortlisted={
          selectedRestaurant ? shortlistedIds.includes(selectedRestaurant.id) : false
        }
        onToggleShortlist={handleToggleShortlist}
        onClose={() => {
          setIsRestaurantModalOpen(false);
          setSelectedRestaurant(null);
        }}
        onSelectParticipant={handleSelectParticipant}
      />
    </div>
  );
}
