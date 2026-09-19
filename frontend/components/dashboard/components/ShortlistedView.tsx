import React from 'react';
import { RestaurantCardData } from '../types';
import { RestaurantCard } from './RestaurantCard';
import { Bookmark, UtensilsCrossed } from 'lucide-react';

interface ShortlistedViewProps {
  restaurants: RestaurantCardData[];
  shortlistedIds: string[];
  onToggleShortlist: (id: string) => void;
  onExploreMore: () => void;
  onClickDetails?: (restaurant: RestaurantCardData) => void;
}

export const ShortlistedView: React.FC<ShortlistedViewProps> = ({
  restaurants,
  shortlistedIds,
  onToggleShortlist,
  onExploreMore,
  onClickDetails,
}) => {
  const shortlistedRestaurants = restaurants.filter((r) =>
    shortlistedIds.includes(r.id)
  );

  return (
    <div className="space-y-6" id="shortlisted-view-container">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-[var(--dash-surface)] border border-[var(--dash-border)] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e]">
              <Bookmark className="w-4 h-4 fill-[#22c55e]" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Shortlisted Venues ({shortlistedRestaurants.length})
            </h2>
          </div>
          <p className="text-xs text-[var(--dash-text-muted)]">
            Venues flagged for final event contract review and tasting consideration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExploreMore}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--dash-surface-raised)] hover:bg-[var(--dash-border)] text-[var(--dash-text-soft)] hover:text-white border border-[var(--dash-border)] transition-all cursor-pointer"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
            <span>Browse All Candidates</span>
          </button>
        </div>
      </div>

      {/* Venues Display or Empty State */}
      {shortlistedRestaurants.length > 0 ? (
        <section className="content-cards-section" id="shortlisted-cards-container">
          {shortlistedRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              isShortlisted={true}
              onToggleShortlist={onToggleShortlist}
              onClickDetails={onClickDetails}
            />
          ))}
        </section>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-[var(--dash-surface)] border border-dashed border-[var(--dash-border)]">
          <Bookmark className="w-12 h-12 text-[var(--dash-text-muted)] mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Venues Shortlisted Yet</h3>
          <p className="text-xs text-[var(--dash-text-muted)] max-w-md mx-auto mb-5">
            You can flag candidate restaurants from the Overview page by clicking &ldquo;+ Shortlist&rdquo; on any venue card.
          </p>
          <button
            type="button"
            onClick={onExploreMore}
            className="px-5 py-2.5 rounded-xl bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-soft)] text-white text-xs font-semibold shadow-lg shadow-[var(--dash-accent)]/20 transition-all"
          >
            Explore Candidate Restaurants
          </button>
        </div>
      )}
    </div>
  );
};
