"use client";

import React, { useMemo, useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { Sidebar } from './components/Sidebar';
import { DonutChart } from './components/DonutChart';
import { AudienceStatsCard } from './components/AudienceStatsCard';
import { RestaurantCard } from './components/RestaurantCard';
import { EditEventModal, type EventEditPatch } from './components/EditEventModal';
import { ResponsesView } from './components/ResponsesView';
import { ResponseDetailModal } from './components/ResponseDetailModal';
import { ShortlistedView } from './components/ShortlistedView';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';

// Leaflet touches `window` at module load time, so it can never be evaluated
// during SSR — load it client-only, the same way the original map module did.
const MapTab = nextDynamic(() => import('./components/MapTab').then((mod) => mod.MapTab), {
  ssr: false,
});
import { ZeroMatchPanel } from '@/frontend/components/zero-match-panel';
import {
  toEventDetails,
  toGuestResponses,
  toRestaurantCardData,
  toSeverityBreakdown,
  buildGuestTokenIndex,
  zeroMatchResponseIds,
} from './adapters';
import { GuestResponse, NavItem, RestaurantCardData } from './types';
import type { DietreEvent, MatchResult, DietResponse } from '@/shared/lib/types';
import {
  Pencil,
  MapPin,
  Sparkles,
  Users,
  PieChart,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Layers,
} from 'lucide-react';

export type RestaurantSortOption = 'best_fit' | 'closest';

interface OverviewDashboardProps {
  event: DietreEvent;
  match: MatchResult;
  responses: DietResponse[];
  sharePanel: ReactNode;
}

export default function OverviewDashboard({ event, match, responses, sharePanel }: OverviewDashboardProps) {
  const router = useRouter();

  const guestTokenById = useMemo(() => buildGuestTokenIndex(responses), [responses]);
  const zeroMatchIds = useMemo(() => zeroMatchResponseIds(match), [match]);
  const guestResponses = useMemo(
    () => toGuestResponses(responses, zeroMatchIds),
    [responses, zeroMatchIds]
  );
  const restaurants = useMemo(
    () => toRestaurantCardData(match.restaurants, responses, guestTokenById),
    [match.restaurants, responses, guestTokenById]
  );
  const eventDetails = useMemo(() => toEventDetails(event), [event]);
  const severity = useMemo(() => toSeverityBreakdown(responses), [responses]);

  const [activeNavId, setActiveNavId] = useState<string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const [selectedResponse, setSelectedResponse] = useState<GuestResponse | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState<boolean>(false);

  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantCardData | null>(null);
  const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState<boolean>(false);

  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<RestaurantSortOption>('best_fit');
  const [restaurantLayout, setRestaurantLayout] = useState<'side_scroll' | 'stacked'>('side_scroll');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const restaurantScrollRef = useRef<HTMLDivElement>(null);

  const triggerNotification = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handleScrollRestaurants = (direction: 'left' | 'right') => {
    if (restaurantScrollRef.current) {
      restaurantScrollRef.current.scrollBy({ left: direction === 'left' ? -460 : 460, behavior: 'smooth' });
    }
  };

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Restaurants', badge: `${restaurants.length}`, iconName: 'utensils' },
      { id: 'map', label: 'Map', iconName: 'map' },
      { id: 'shortlisted', label: 'Shortlisted', badge: `${shortlistedIds.length}`, iconName: 'bookmark' },
      { id: 'responses', label: 'Responses', badge: `${guestResponses.length}`, iconName: 'users' },
    ],
    [restaurants.length, shortlistedIds.length, guestResponses.length]
  );

  const handleToggleShortlist = (id: string) => {
    const isNowShortlisted = !shortlistedIds.includes(id);
    setShortlistedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    const venueName = restaurants.find((r) => r.id === id)?.name || 'Venue';
    triggerNotification(isNowShortlisted ? `${venueName} added to shortlist` : `${venueName} removed from shortlist`);
  };

  const handleSelectResponse = (response: GuestResponse) => {
    setSelectedResponse(response);
    setIsResponseModalOpen(true);
  };

  const handleOpenRestaurantDetails = (restaurant: RestaurantCardData) => {
    setSelectedRestaurant(restaurant);
    setIsRestaurantModalOpen(true);
  };

  const handleGoHome = () => {
    setActiveNavId('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEvent = async (patch: EventEditPatch) => {
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: patch.name,
        location: patch.address,
        radius: patch.radiusMiles,
        budget_range: patch.maxBudget,
        expected_headcount: patch.expectedHeadcount,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Could not save event details.');
    triggerNotification('Event details updated');
    router.refresh();
  };

  const sortedRestaurants = useMemo(() => {
    const list = [...restaurants];
    if (sortBy === 'closest') return list.sort((a, b) => a.distanceMiles - b.distanceMiles);
    return list.sort((a, b) => {
      const aEligible = Number(a.withinRadius && a.withinBudget);
      const bEligible = Number(b.withinRadius && b.withinBudget);
      if (aEligible !== bEligible) return bEligible - aEligible;
      return b.matchPercentage - a.matchPercentage;
    });
  }, [restaurants, sortBy]);

  return (
    <div className="dashboard-layout" id="dashboard-layout">
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[#b8744b]/60 bg-[#291c18] px-4 py-2.5 text-xs text-white shadow-2xl duration-200 animate-in slide-in-from-bottom-3">
          <Sparkles className="h-4 w-4 text-[#d88c5e]" />
          <span>{showNotification}</span>
        </div>
      )}

      <Sidebar
        navItems={navItems}
        activeId={activeNavId}
        onSelect={(id) => setActiveNavId(id)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onGoHome={handleGoHome}
      />

      <main className="main-content">
        <header className="main-header">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a0928c]">
                <span>EVENT</span>
                <span>•</span>
                <span className="text-[#d88c5e]">
                  {activeNavId === 'shortlisted'
                    ? 'SHORTLISTED VENUES'
                    : activeNavId === 'responses'
                      ? 'ANONYMOUS RESPONSES'
                      : activeNavId === 'map'
                        ? 'VENUE MAP'
                        : 'VENUE MATCHING'}
                </span>
              </div>
              <h1 className="page-title text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {eventDetails.name}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="group flex items-center gap-2.5 self-start rounded-xl border border-[#4a342b] bg-[#2b1e1a] px-4 py-2.5 text-[#d8cbc5] shadow-md transition-all hover:border-[#b8744b]/60 hover:bg-[#382621] hover:text-white active:scale-98 cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#b8744b]/20 text-[#d88c5e] transition-colors group-hover:bg-[#b8744b] group-hover:text-white">
                <Pencil className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-wide">Edit event details</span>
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3.5 rounded-2xl border border-[#3a2822] bg-[#231a17] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#cfc2bc]">
              <div className="flex items-center gap-1.5 rounded-xl border border-[#362620] bg-[#1a1210] px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#d88c5e]" />
                <span className="font-semibold text-white">{eventDetails.address}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-[#362620] bg-[#1a1210] px-3 py-1.5">
                <span>Budget:</span>
                <span className="font-semibold text-white">{eventDetails.maxBudget}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-[#362620] bg-[#1a1210] px-3 py-1.5">
                <span>Radius:</span>
                <span className="font-semibold text-white">{eventDetails.maxDistanceRadius}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-[#362620] bg-[#1a1210] px-3 py-1.5">
                <span>Expected:</span>
                <span className="font-semibold text-white">{eventDetails.expectedHeadcount}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-body">
          {activeNavId === 'responses' && (
            <ResponsesView responses={guestResponses} onSelectResponse={handleSelectResponse} />
          )}

          {activeNavId === 'map' && (
            <MapTab
              event={{ name: eventDetails.name, lat: event.lat, lng: event.lng, radiusMiles: event.radius }}
              restaurants={restaurants}
              onSelectRestaurant={handleOpenRestaurantDetails}
            />
          )}

          {activeNavId === 'shortlisted' && (
            <ShortlistedView
              restaurants={restaurants}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              onExploreMore={() => setActiveNavId('overview')}
              onClickDetails={handleOpenRestaurantDetails}
            />
          )}

          {activeNavId === 'overview' && (
            <>
              <div className="space-y-4">
                {sharePanel}
                <ZeroMatchPanel alerts={match.zero_matches} />
              </div>

              {responses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#433129] bg-[#231a17] p-10 text-center">
                  <h3 className="mb-1 text-base font-bold text-white">No responses yet</h3>
                  <p className="mx-auto max-w-md text-xs text-[#8e7e78]">
                    Share the guest link above. Restaurant rankings appear once the first response comes in.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3" id="overview-chart-container">
                    <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-[#ded3cd]">
                        <PieChart className="h-3.5 w-3.5 text-[#eab308]" />
                        Guest constraint breakdown ({responses.length} responses)
                      </span>
                    </div>
                    <section className="overview-top-row">
                      <DonutChart segments={severity.segments} audienceLabel="RESPONSES" audienceValue={`${responses.length}`} />
                      <AudienceStatsCard metrics={severity.metrics} title="Constraint Severity" />
                    </section>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[#2d1e19] pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-bold tracking-tight text-white">
                      Candidate Restaurants ({sortedRestaurants.length})
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="inline-flex rounded-xl border border-[#34241e] bg-[#201512] p-0.5">
                        <button
                          type="button"
                          onClick={() => setRestaurantLayout('side_scroll')}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                            restaurantLayout === 'side_scroll' ? 'bg-[#b8744b] text-white' : 'text-[#9e8f88] hover:text-white'
                          }`}
                        >
                          <MoveHorizontal className="h-3.5 w-3.5" /> Side Scroll
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestaurantLayout('stacked')}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                            restaurantLayout === 'stacked' ? 'bg-[#b8744b] text-white' : 'text-[#9e8f88] hover:text-white'
                          }`}
                        >
                          <Layers className="h-3.5 w-3.5" /> Stacked
                        </button>
                      </div>

                      {restaurantLayout === 'side_scroll' && (
                        <div className="flex items-center gap-1 rounded-xl border border-[#34241e] bg-[#201512] p-0.5">
                          <button
                            type="button"
                            onClick={() => handleScrollRestaurants('left')}
                            aria-label="Scroll restaurants left"
                            className="rounded-lg p-1 text-[#b8744b] transition-colors hover:bg-[#b8744b]/20 hover:text-white cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleScrollRestaurants('right')}
                            aria-label="Scroll restaurants right"
                            className="rounded-lg p-1 text-[#b8744b] transition-colors hover:bg-[#b8744b]/20 hover:text-white cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#8e7e78]">
                          <ArrowUpDown className="h-3 w-3 text-[#b8744b]" /> Sort:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSortBy('best_fit')}
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                            sortBy === 'best_fit'
                              ? 'border-[#b8744b] bg-[#b8744b] text-white'
                              : 'border-[#32221d] bg-[#201512] text-[#9e8f88] hover:border-[#4a342b] hover:text-white'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5 text-[#4ade80]" /> Best Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy('closest')}
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                            sortBy === 'closest'
                              ? 'border-[#b8744b] bg-[#b8744b] text-white'
                              : 'border-[#32221d] bg-[#201512] text-[#9e8f88] hover:border-[#4a342b] hover:text-white'
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5 text-[#38bdf8]" /> Closest
                        </button>
                      </div>
                    </div>
                  </div>

                  {restaurantLayout === 'side_scroll' ? (
                    <div
                      ref={restaurantScrollRef}
                      className="scrollbar-thin flex snap-x items-stretch gap-4 overflow-x-auto pb-4 pt-1"
                    >
                      {sortedRestaurants.map((restaurant) => (
                        <div key={restaurant.id} className="w-[360px] shrink-0 snap-start sm:w-[500px] md:w-[560px]">
                          <RestaurantCard
                            restaurant={restaurant}
                            isShortlisted={shortlistedIds.includes(restaurant.id)}
                            onToggleShortlist={handleToggleShortlist}
                            onClickDetails={handleOpenRestaurantDetails}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <section className="content-cards-section">
                      {sortedRestaurants.map((restaurant) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          isShortlisted={shortlistedIds.includes(restaurant.id)}
                          onToggleShortlist={handleToggleShortlist}
                          onClickDetails={handleOpenRestaurantDetails}
                        />
                      ))}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      <EditEventModal
        key={isEditModalOpen ? 'edit-open' : 'edit-closed'}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        eventDetails={eventDetails}
        onSave={handleSaveEvent}
      />

      <ResponseDetailModal
        isOpen={isResponseModalOpen}
        response={selectedResponse}
        onClose={() => {
          setIsResponseModalOpen(false);
          setSelectedResponse(null);
        }}
      />

      <RestaurantDetailModal
        isOpen={isRestaurantModalOpen}
        restaurant={selectedRestaurant}
        isShortlisted={selectedRestaurant ? shortlistedIds.includes(selectedRestaurant.id) : false}
        onToggleShortlist={handleToggleShortlist}
        onClose={() => {
          setIsRestaurantModalOpen(false);
          setSelectedRestaurant(null);
        }}
      />
    </div>
  );
}
