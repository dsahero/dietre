"use client";

import React, { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { useThemeToggle, HOST_THEME_STORAGE_KEY } from '@/frontend/lib/use-theme-toggle';
import { useIsMobile } from '@/frontend/lib/use-is-mobile';
import {
  toEventDetails,
  toGuestResponses,
  toRestaurantCardData,
  toSeverityBreakdown,
  buildGuestTokenIndex,
  zeroMatchResponseIds,
} from './adapters';
import { GuestResponse, NavItem, RestaurantCardData } from './types';
import type { DietreEvent, MatchResult, DietResponse, Collaborator, PendingInvite } from '@/shared/lib/types';
import { ShareEventModal } from './components/ShareEventModal';
import { EventPeoplePopover } from './components/EventPeoplePopover';
import {
  Pencil,
  MapPin,
  Stamp,
  Users,
  PieChart,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MoveHorizontal,
  Layers,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Share2,
} from 'lucide-react';

export type RestaurantSortOption = 'best_fit' | 'closest';

interface OverviewDashboardProps {
  event: DietreEvent;
  match: MatchResult;
  responses: DietResponse[];
  sharePanel: ReactNode;
  /** True for the event creator; collaborators can do everything except delete the event. */
  isOwner?: boolean;
  viewerEmail?: string;
}

export default function OverviewDashboard({
  event,
  match,
  responses,
  sharePanel,
  isOwner = true,
  viewerEmail = '',
}: OverviewDashboardProps) {
  const router = useRouter();
  const [collaborators, setCollaborators] = useState<Collaborator[]>(event.collaborators ?? []);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(event.pending_invites ?? []);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const guestTokenById = useMemo(() => buildGuestTokenIndex(responses), [responses]);
  const zeroMatchIds = useMemo(() => zeroMatchResponseIds(match), [match]);
  const guestResponses = useMemo(
    () => toGuestResponses(responses, zeroMatchIds),
    [responses, zeroMatchIds]
  );
  const checklistNotesByRestaurant = useMemo(
    () => new Map(Object.entries(event.checklist_notes_by_restaurant ?? {})),
    [event.checklist_notes_by_restaurant]
  );
  const restaurants = useMemo(
    () => toRestaurantCardData(match.restaurants, responses, guestTokenById, checklistNotesByRestaurant),
    [match.restaurants, responses, guestTokenById, checklistNotesByRestaurant]
  );
  const eventDetails = useMemo(() => toEventDetails(event, responses), [event, responses]);
  const severity = useMemo(() => toSeverityBreakdown(responses), [responses]);

  const [activeNavId, setActiveNavId] = useState<string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const isMobile = useIsMobile(880);
  // On a phone the sidebar can't share the row with content at a usable
  // width, so it defaults closed there (see the drawer/backdrop treatment
  // in dashboard.css) and re-collapses itself if the window is resized
  // down to phone width while it happens to be open — full-screen content
  // is the point of "minimizing the menu," not just an initial default.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with the viewport, not derivable during render
    if (isMobile) setIsSidebarCollapsed(true);
  }, [isMobile]);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState<boolean>(false);

  const [selectedResponse, setSelectedResponse] = useState<GuestResponse | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState<boolean>(false);

  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantCardData | null>(null);
  const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState<boolean>(false);

  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<RestaurantSortOption>('best_fit');
  const [restaurantLayout, setRestaurantLayout] = useState<'side_scroll' | 'stacked'>('stacked');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const restaurantScrollRef = useRef<HTMLDivElement>(null);

  // Host-side theme — separate storage key from the guest responder flow's
  // own toggle (see use-theme-toggle.ts), so a host and a guest sharing a
  // browser never affect each other's preference. Shared across every
  // logged-in host page via the same hook + `data-theme` on <html>.
  const [hostTheme, toggleHostTheme] = useThemeToggle(HOST_THEME_STORAGE_KEY);

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

  const handleSelectResponseById = (responseId: string) => {
    const response = guestResponses.find((r) => r.id === responseId);
    if (response) handleSelectResponse(response);
  };

  const handleOpenRestaurantDetails = (restaurant: RestaurantCardData) => {
    setSelectedRestaurant(restaurant);
    setIsRestaurantModalOpen(true);
  };

  const handleGoHome = () => {
    router.push('/events');
  };

  const handleDeleteEvent = async () => {
    const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Could not delete the event.');
    router.push('/events');
    router.refresh();
  };

  const handleSaveEvent = async (patch: EventEditPatch) => {
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: patch.name,
        location: patch.address,
        place_id: patch.place_id,
        radius: patch.radiusMiles,
        budget_range: patch.maxBudget,
        expected_headcount: patch.expectedHeadcount,
        limitations: patch.limitations,
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
    <div className="dashboard-layout" id="dashboard-layout" data-theme={hostTheme}>
      {showNotification && (
        <div className="tilt-slight fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-sm border border-[var(--dash-accent)]/60 bg-[var(--dash-surface-raised)] px-4 py-2.5 text-xs text-[var(--dash-text)] shadow-2xl duration-200 animate-in slide-in-from-bottom-3">
          <Stamp className="h-4 w-4 shrink-0 text-[var(--dash-accent-soft)]" />
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
        theme={hostTheme}
        onToggleTheme={toggleHostTheme}
      />

      <main className="main-content">
        <header className="main-header">
          {/* Typographic Asymmetry: natural line breaks, off-baseline action, no small-caps bullet eyebrow */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-baseline">
            <div className="max-w-2xl">
              <Link
                href="/events"
                id="btn-back-to-events"
                className="group inline-flex items-center gap-1.5 mb-2.5 py-1.5 px-3 rounded-xs border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] text-xs font-heading font-semibold text-[var(--dash-text-soft)] transition-all hover:border-[var(--dash-accent)] hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)] cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[var(--dash-accent)] stroke-[1.75] transition-transform group-hover:-translate-x-0.5" />
                <span>Back to My Events</span>
              </Link>
              {activeNavId !== 'overview' && (
                <p className="font-serif italic text-xs text-[var(--dash-accent)] mb-1">
                  {activeNavId === 'shortlisted'
                    ? 'Shortlisted venues for review'
                    : activeNavId === 'responses'
                      ? 'Guest dietary roster & constraints'
                      : 'Venue radius & map'}
                </p>
              )}
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[var(--dash-text)] leading-[1.14] tracking-[-0.038em] text-balance">
                {eventDetails.name}
              </h1>
            </div>

            {/* Asymmetric bespoke action: bare icon, artisan tactile link/button, no box-in-a-box */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-baseline">
              <EventPeoplePopover
                eventId={event.id}
                isOwner={isOwner}
                viewerEmail={viewerEmail}
                collaborators={collaborators}
                pendingInvites={pendingInvites}
                onChange={(next) => {
                  setCollaborators(next.collaborators);
                  setPendingInvites(next.pendingInvites);
                  // Removing yourself revokes your own access.
                  if (viewerEmail && !isOwner && !next.collaborators.some((c) => c.email === viewerEmail)) {
                    router.push('/events');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="group inline-flex items-center gap-2 py-1.5 px-3 rounded-xs border border-[var(--dash-accent)] bg-[var(--dash-accent)] text-xs text-white transition-all hover:opacity-90 cursor-pointer shadow-2xs"
              >
                <Share2 className="h-3 w-3 stroke-[1.75]" />
                <span className="font-serif text-xs font-medium">Share</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="group inline-flex items-center gap-2 py-1.5 px-3 rounded-xs border border-dashed border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] text-xs text-[var(--dash-text-soft)] transition-all hover:border-[var(--dash-accent)] hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)] cursor-pointer shadow-2xs"
              >
                <Pencil className="h-3 w-3 text-[var(--dash-accent)] stroke-[1.75] transition-transform group-hover:-rotate-12" />
                <span className="font-serif text-xs font-medium">Modify event ledger</span>
              </button>
            </div>
          </div>

          {/* Broken grid metadata bar: varied shapes, bare text, stamped seal, judged spacing */}
          <div className="mt-4 pt-3.5 pb-2.5 border-t border-b border-dashed border-[var(--dash-border)] flex flex-wrap items-baseline justify-between gap-y-2 gap-x-6 text-xs text-[var(--dash-text-soft)]">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[var(--dash-accent)] shrink-0 stroke-[1.75]" />
              <span className="font-serif font-medium text-[var(--dash-text)] text-[13px]">{eventDetails.address}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-serif">
              <span className="ink-stamp px-2 py-0.5 text-[9.5px] font-bold text-[var(--dash-accent-deep)] border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] shadow-2xs">
                {eventDetails.maxBudget} budget
              </span>
              <span className="text-[var(--dash-text-muted)]">
                within <strong className="font-mono text-[11px] text-[var(--dash-text)] font-semibold">{eventDetails.maxDistanceRadius}</strong>
              </span>
              <span className="text-[var(--dash-text-soft)] italic">
                <strong className="font-serif not-italic font-semibold text-[var(--dash-text)]">{eventDetails.expectedHeadcount}</strong> expected banquet guests
              </span>
              <button
                type="button"
                onClick={() => setIsEventDetailsOpen((prev) => !prev)}
                aria-expanded={isEventDetailsOpen}
                className="inline-flex items-center gap-1 rounded-xs border border-dashed border-[var(--dash-border-strong)] px-2 py-0.5 font-serif text-[11px] text-[var(--dash-text-soft)] transition-colors hover:border-[var(--dash-accent)] hover:text-[var(--dash-text)] cursor-pointer"
              >
                Event details
                {isEventDetailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Event Detail Limits & Complex Dietary Restrictions, behind the "Event details" toggle above. */}
          <div className={`mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs ${isEventDetailsOpen ? '' : 'hidden'}`}>
            {/* 1) Event Detail Limits */}
            <div className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3 shadow-2xs">
              <div className="flex items-center justify-between mb-2 border-b border-[var(--dash-border)] pb-1.5">
                <span className="font-heading text-[11.5px] font-bold uppercase tracking-wider text-[var(--dash-text)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-[var(--dash-accent)]" />
                  Event Detail Limits
                </span>
                <span className="font-mono text-[9px] text-[var(--dash-text-muted)] uppercase tracking-wider">Host Parameters</span>
              </div>
              {eventDetails.limitations ? (
                <p className="font-serif italic text-xs text-[var(--dash-text-soft)] line-clamp-2" title={eventDetails.limitations}>
                  &ldquo;{eventDetails.limitations}&rdquo;
                </p>
              ) : (
                <p className="font-serif italic text-xs text-[var(--dash-text-muted)]">
                  Standard radius ({eventDetails.maxDistanceRadius}) and budget ({eventDetails.maxBudget}) enforced.
                </p>
              )}
              {eventDetails.limitationsChecklist && eventDetails.limitationsChecklist.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {eventDetails.limitationsChecklist.map((c) => (
                    <span key={c.id} className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--dash-text-soft)]">
                      ✓ {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2) Complex Dietary Restrictions */}
            <div className="rounded-sm border border-[#f59e0b]/40 bg-[#f59e0b]/5 p-3 shadow-2xs">
              <div className="flex items-center justify-between mb-2 border-b border-[#f59e0b]/20 pb-1.5">
                <span className="font-heading text-[11.5px] font-bold uppercase tracking-wider text-[#b45309] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-[#f59e0b]" />
                  Complex Dietary Restrictions
                </span>
                <span className="ink-stamp px-1.5 py-0.2 text-[8.5px] font-bold text-[#b45309] border-[#b45309]">
                  Gemini Audited
                </span>
              </div>
              {eventDetails.complexRequirementsSummary && eventDetails.complexRequirementsSummary.length > 0 ? (
                <div className="space-y-1">
                  {eventDetails.complexRequirementsSummary.map((req, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 font-serif text-[11.5px] leading-snug text-[var(--dash-text)]">
                      <span className="text-[#f59e0b] font-bold">•</span>
                      <span>{req}</span>
                    </div>
                  ))}
                  <p className="mt-1 font-serif text-[10.5px] italic text-[var(--dash-text-muted)]">
                    Checked across all restaurant menus to verify separation, surfaces, and preparation rules.
                  </p>
                </div>
              ) : (
                <p className="font-serif italic text-xs text-[var(--dash-text-muted)]">
                  No compound or relational dietary rules submitted yet. (e.g. kosher meat/dairy separation, cross-contamination).
                </p>
              )}
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
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              onSelectResponse={handleSelectResponseById}
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
                <div className="rounded-md border border-dashed border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-10 text-center shadow-xs">
                  <h3 className="mb-1 font-heading text-lg font-bold text-[var(--dash-text)]">No responses yet</h3>
                  <p className="mx-auto max-w-md text-xs text-[var(--dash-text-muted)] font-serif italic">
                    Share the guest intake link above. Restaurant rankings appear once the first response is recorded.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3" id="overview-chart-container">
                    <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-[var(--dash-text-soft)] font-serif">
                        <PieChart className="h-3.5 w-3.5 text-[#eab308]" />
                        Guest constraint breakdown ({responses.length} responses)
                      </span>
                    </div>
                    <section className="overview-top-row">
                      <DonutChart segments={severity.segments} audienceLabel="RESPONSES" audienceValue={`${responses.length}`} />
                      <AudienceStatsCard metrics={severity.metrics} title="Constraint Severity" />
                    </section>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[var(--dash-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-heading text-xl font-bold tracking-tight text-[var(--dash-text)]">
                      Candidate Restaurants ({sortedRestaurants.length})
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="inline-flex rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setRestaurantLayout('side_scroll')}
                          className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-heading text-xs font-semibold transition-all cursor-pointer ${
                            restaurantLayout === 'side_scroll' ? 'bg-[var(--dash-accent)] text-white shadow-2xs' : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]'
                          }`}
                        >
                          <MoveHorizontal className="h-3.5 w-3.5" /> Side Scroll
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestaurantLayout('stacked')}
                          className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-heading text-xs font-semibold transition-all cursor-pointer ${
                            restaurantLayout === 'stacked' ? 'bg-[var(--dash-accent)] text-white shadow-2xs' : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]'
                          }`}
                        >
                          <Layers className="h-3.5 w-3.5" /> Stacked
                        </button>
                      </div>

                      {restaurantLayout === 'side_scroll' && (
                        <div className="flex items-center gap-1 rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleScrollRestaurants('left')}
                            aria-label="Scroll restaurants left"
                            className="rounded-sm p-1 text-[var(--dash-accent)] transition-colors hover:bg-[var(--dash-accent)]/15 hover:text-[var(--dash-accent-deep)] cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleScrollRestaurants('right')}
                            aria-label="Scroll restaurants right"
                            className="rounded-sm p-1 text-[var(--dash-accent)] transition-colors hover:bg-[var(--dash-accent)]/15 hover:text-[var(--dash-accent-deep)] cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                          <ArrowUpDown className="h-3 w-3 text-[var(--dash-accent)]" /> Sort:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSortBy('best_fit')}
                          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-heading text-xs font-semibold transition-all cursor-pointer ${
                            sortBy === 'best_fit'
                              ? 'border-[var(--dash-accent)] bg-[var(--dash-accent)] text-white shadow-xs'
                              : 'border-[var(--dash-border)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)] hover:border-[var(--dash-border-strong)] hover:text-[var(--dash-text)]'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5 text-[#22c55e]" /> Best Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy('closest')}
                          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-heading text-xs font-semibold transition-all cursor-pointer ${
                            sortBy === 'closest'
                              ? 'border-[var(--dash-accent)] bg-[var(--dash-accent)] text-white shadow-xs'
                              : 'border-[var(--dash-border)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)] hover:border-[var(--dash-border-strong)] hover:text-[var(--dash-text)]'
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5 text-[var(--dash-accent)]" /> Closest
                        </button>
                      </div>
                    </div>
                  </div>

                  {sortedRestaurants.length === 0 && (
                    <p className="rounded-md border border-dashed border-[var(--dash-border)] px-4 py-6 text-center font-serif text-sm italic text-[var(--dash-text-muted)]">
                      No restaurants found near this event&apos;s address yet. Try a larger radius or a more specific
                      address in Edit Event.
                    </p>
                  )}

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
        onDelete={isOwner ? handleDeleteEvent : undefined}
      />

      <ShareEventModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        eventId={event.id}
        eventName={event.name}
        inviterName={viewerEmail}
        onInvited={(invite) => setPendingInvites((prev) => [...prev.filter((p) => p.email !== invite.email), invite])}
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
        onSelectResponse={handleSelectResponseById}
      />
    </div>
  );
}
