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
      <div className="p-5 rounded-md bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-sm bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] shadow-2xs">
              <Bookmark className="w-4 h-4 fill-[#22c55e]" />
            </div>
            <h2 className="font-heading text-xl font-bold text-[var(--dash-text)] tracking-tight">
              Shortlisted Venues ({shortlistedRestaurants.length})
            </h2>
          </div>
          <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">
            Venues flagged for final banquet contract review and tasting consultation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExploreMore}
            className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading font-semibold bg-[var(--dash-surface)] hover:bg-[var(--dash-surface-hover)] text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] border border-[var(--dash-border)] transition-all cursor-pointer shadow-2xs"
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
        <div className="p-12 text-center rounded-md bg-[var(--dash-surface-raised)] border border-dashed border-[var(--dash-border-strong)] shadow-xs">
          <Bookmark className="w-10 h-10 text-[var(--dash-text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="font-heading text-lg font-bold text-[var(--dash-text)] mb-1">No Venues Shortlisted Yet</h3>
          <p className="text-xs text-[var(--dash-text-muted)] font-serif italic max-w-md mx-auto mb-5">
            You can bookmark candidate restaurants from the Overview ledger by clicking &ldquo;+ Shortlist&rdquo; on any venue card.
          </p>
          <button
            type="button"
            onClick={onExploreMore}
            className="px-5 py-2.5 rounded-sm bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white text-xs font-heading font-semibold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
          >
            Explore Candidate Restaurants
          </button>
        </div>
      )}
    </div>
  );
};
