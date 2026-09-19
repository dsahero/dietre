import React, { useEffect, useState, useMemo, useRef } from 'react';
import { RestaurantCardData, TraitType, EventDetails } from '../types';
import { createMarbleTexture, createRustTexture, createSandTexture } from '../utils/textures';
import { evaluateRestaurantLimitations } from '../utils/limitationEvaluator';
import {
  MapPin,
  DollarSign,
  Users,
  Star,
  CheckCircle2,
  MinusCircle,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
} from 'lucide-react';

interface RestaurantCardProps {
  restaurant: RestaurantCardData;
  onSelect?: (id: string) => void;
  isShortlisted?: boolean;
  onToggleShortlist?: (id: string) => void;
  onClickDetails?: (restaurant: RestaurantCardData) => void;
  eventDetails?: EventDetails;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isShortlisted = false,
  onToggleShortlist,
  onClickDetails,
  eventDetails,
}) => {
  const [textureUrl, setTextureUrl] = useState<string>('');
  const detailsScrollRef = useRef<HTMLDivElement>(null);

  const scrollDetails = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (detailsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      detailsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Canvas texture generation needs `document` and must run client-side only
    // (computing it during render would crash SSR / desync from the server-rendered HTML).
    let url = '';
    if (restaurant.textureType === 'sand') {
      url = createSandTexture(260, 180);
    } else if (restaurant.textureType === 'rust') {
      url = createRustTexture(260, 180);
    } else if (restaurant.textureType === 'marble') {
      url = createMarbleTexture(260, 180);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with the Canvas API, not derivable during render
    setTextureUrl(url);
  }, [restaurant.textureType]);

  // Limitation Evaluation Notes (Good, Neutral, Bad)
  const limitationEvaluation = useMemo(() => {
    if (!eventDetails) return null;
    return evaluateRestaurantLimitations(restaurant, eventDetails);
  }, [restaurant, eventDetails]);

  // Color mapping for Good (Green), Neutral (Yellow), Bad (Red)
  const getTraitStyles = (type: TraitType) => {
    switch (type) {
      case 'good':
        return {
          dotBg: '#22c55e', // Emerald Green
          dotGlow: '0 0 10px rgba(34, 197, 94, 0.45)',
          border: 'border-[#22c55e]/40',
          badgeBg: 'bg-[#22c55e]/15 text-[#4ade80]',
          badgeBorder: 'border-[#22c55e]/30',
          label: 'Good',
          icon: <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />,
        };
      case 'neutral':
        return {
          dotBg: '#eab308', // Amber Yellow
          dotGlow: '0 0 10px rgba(234, 179, 8, 0.45)',
          border: 'border-[#eab308]/40',
          badgeBg: 'bg-[#eab308]/15 text-[#facc15]',
          badgeBorder: 'border-[#eab308]/30',
          label: 'Neutral',
          icon: <MinusCircle className="w-3 h-3 text-[#eab308]" />,
        };
      case 'bad':
        return {
          dotBg: '#ef4444', // Crimson Red
          dotGlow: '0 0 10px rgba(239, 68, 68, 0.45)',
          border: 'border-[#ef4444]/40',
          badgeBg: 'bg-[#ef4444]/15 text-[#f87171]',
          badgeBorder: 'border-[#ef4444]/30',
          label: 'Alert',
          icon: <AlertCircle className="w-3 h-3 text-[#ef4444]" />,
        };
    }
  };

  const getMatchBadgeStyle = (pct: number) => {
    if (pct >= 85) return 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/50';
    if (pct >= 70) return 'bg-[#eab308]/20 text-[#facc15] border-[#eab308]/50';
    return 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/50';
  };

  return (
    <div
      className="content-card relative group transition-all duration-200 hover:border-[#5a4239] border border-transparent cursor-pointer"
      id={`card-${restaurant.id}`}
      onClick={() => onClickDetails?.(restaurant)}
    >
      {/* Left Thumbnail with procedural texture */}
      <div
        className="card-thumbnail relative flex flex-col justify-between overflow-hidden"
        id={`thumb-${restaurant.id}`}
        style={{
          backgroundImage: textureUrl ? `url(${textureUrl})` : undefined,
          backgroundColor:
            restaurant.textureType === 'sand'
              ? '#9c816f'
              : restaurant.textureType === 'rust'
              ? '#6b4736'
              : '#bc6936',
        }}
      >
        {/* Subtle Dark Gradient Overlay for optimal legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

        {/* Top Tag: Rating & Group Compatibility */}
        <div className="relative z-10 flex items-center justify-between gap-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[#fcd34d] border border-white/10">
            <Star className="w-3 h-3 fill-[#fcd34d] text-[#fcd34d]" />
            {restaurant.rating.toFixed(1)}
          </span>
          <span
            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm ${getMatchBadgeStyle(
              restaurant.matchPercentage
            )}`}
          >
            {restaurant.matchPercentage}% Safe Match
          </span>
        </div>

        {/* Bottom Title & Cuisine Details */}
        <div className="relative z-10 mt-auto">
          <h3 className="card-title text-[16px] leading-snug group-hover:text-[#d88c5e] transition-colors" id={`card-title-${restaurant.id}`}>
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-[11.5px] text-[#f1eae6]/90">
            <span className="truncate font-medium">{restaurant.cuisine}</span>
            <span>•</span>
            <span className="shrink-0 flex items-center gap-0.5 text-[#e5d4cc]">
              <DollarSign className="w-3 h-3 text-[#d88c5e]" />
              {restaurant.pricePerPerson}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10.5px] text-[#cfc1ba]/80">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Cap: {restaurant.capacity}</span>
            </span>
            <span className="flex items-center gap-1 text-[#e2d9d5]">
              <MapPin className="w-2.5 h-2.5 text-[#b8744b]" />
              {restaurant.distance}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Details inside of each restaurant - SCROLLABLE LEFT TO RIGHT */}
      <div
        className="card-details min-w-0 flex-1 flex flex-col justify-between py-3 px-4 sm:px-5 relative overflow-hidden"
        id={`details-${restaurant.id}`}
      >
        {/* Header bar above details: title + explicit scroll left/right arrows + Shortlist button */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#362620]/70 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#cca152] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#eab308]" />
              Venue &amp; Dietary Details
            </span>
            <span className="text-[10px] text-[#8e7e78] hidden sm:flex items-center gap-1">
              <MoveHorizontal className="w-3 h-3 text-[#b8744b]" />
              <span>Scroll details &harr;</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Left & Right Scroll Buttons for Details inside this restaurant */}
            <div className="flex items-center gap-1 bg-[#1a1210] p-0.5 rounded-lg border border-[#362620]">
              <button
                type="button"
                onClick={(e) => scrollDetails('left', e)}
                className="p-1 rounded text-[#b8744b] hover:text-white hover:bg-[#b8744b]/20 transition-colors cursor-pointer"
                title="Scroll details left"
                aria-label="Scroll details left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => scrollDetails('right', e)}
                className="p-1 rounded text-[#b8744b] hover:text-white hover:bg-[#b8744b]/20 transition-colors cursor-pointer"
                title="Scroll details right"
                aria-label="Scroll details right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Shortlist Toggle Button on the Card Header */}
            {onToggleShortlist && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleShortlist(restaurant.id);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                  isShortlisted
                    ? 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/40'
                    : 'bg-[#1e1513] text-[#a89892] border-[#3a2924] hover:text-white hover:border-[#634940]'
                }`}
                id={`shortlist-btn-${restaurant.id}`}
              >
                {isShortlisted ? '✓ Shortlisted' : '+ Shortlist'}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Container for the Details inside this restaurant */}
        <div
          ref={detailsScrollRef}
          className="overflow-x-auto scrollbar-thin py-2 flex-1 min-w-0"
          id={`details-scroll-${restaurant.id}`}
        >
          {/* Inner content wrapper with guaranteed horizontal width so details scroll left to right without clipping */}
          <div className="min-w-[600px] space-y-2.5 pr-2">
            {/* Traits Evaluation list (Good, Neutral, Bad) */}
            <div className="space-y-1.5">
              {restaurant.traits.map((trait, idx) => {
                const styles = getTraitStyles(trait.type);
                return (
                  <div
                    className="indicator-row flex items-center gap-2.5 group/trait py-0.5"
                    id={`indicator-${restaurant.id}-${idx}`}
                    key={trait.id || idx}
                  >
                    {/* Colored Circle Indicator */}
                    <div className="relative flex items-center justify-center shrink-0">
                      <span
                        className="indicator-dot transition-all duration-300 group-hover/trait:scale-110"
                        id={`dot-${restaurant.id}-${idx}`}
                        style={{
                          backgroundColor: styles.dotBg,
                          boxShadow: styles.dotGlow,
                        }}
                        title={`${styles.label} trait`}
                      />
                    </div>

                    {/* Trait Badge & Full Label without clipping */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${styles.badgeBg} ${styles.badgeBorder}`}
                      >
                        {styles.icon}
                        {styles.label}
                      </span>
                      <span
                        className="indicator-text text-[13px] text-[#ddd6d2] group-hover/trait:text-white transition-colors whitespace-nowrap"
                        id={`text-${restaurant.id}-${idx}`}
                      >
                        {trait.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event Limitations Notes */}
            {limitationEvaluation && limitationEvaluation.allNotes.length > 0 && (
              <div className="pt-2 border-t border-[#2e1e19]/70 flex items-center gap-2 whitespace-nowrap">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#cca152] shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#eab308]" />
                  Limitations:
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {limitationEvaluation.allNotes.map((note, nIdx) => (
                    <span
                      key={nIdx}
                      className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border font-medium shrink-0 ${
                        note.type === 'good'
                          ? 'bg-[#22c55e]/10 text-[#4ade80] border-[#22c55e]/30'
                          : note.type === 'neutral'
                          ? 'bg-[#eab308]/10 text-[#facc15] border-[#eab308]/30'
                          : 'bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/30'
                      }`}
                      title={note.text}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          note.type === 'good'
                            ? 'bg-[#22c55e]'
                            : note.type === 'neutral'
                            ? 'bg-[#eab308]'
                            : 'bg-[#ef4444]'
                        }`}
                      />
                      <span className="whitespace-nowrap">{note.text}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Card Bar: Estimated Food Cost */}
            <div className="pt-2 border-t border-[#2e1e19] flex items-center justify-between gap-4 text-xs whitespace-nowrap">
              <div className="flex items-center gap-1.5 text-[#a89892] shrink-0">
                <span className="text-[11px] font-semibold text-[#d4c8c2]">
                  Est. Food Cost:
                </span>
                <span className="font-bold text-white text-[12px]">
                  ${restaurant.estimatedCost?.totalEstimatedCost || 1200}
                </span>
                <span className="text-[10px] text-[#8e7e78]">
                  (${restaurant.estimatedCost?.averagePerGuest || 100}/guest for 12 attendees with 10 dietary preps)
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-[#b8744b] font-medium group-hover:text-[#e89c6f] transition-colors flex items-center gap-1">
                  View Details &amp; Suggested Menu &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
