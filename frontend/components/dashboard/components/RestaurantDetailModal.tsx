import React, { useState, useMemo } from 'react';
import {
  RestaurantCardData,
  Participant,
  EventDetails,
} from '../types';
import { evaluateRestaurantLimitations } from '../utils/limitationEvaluator';
import {
  X,
  MapPin,
  Star,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Utensils,
  Sparkles,
  Bookmark,
  ShieldCheck,
  Calculator,
  UserCheck,
  UserX,
} from 'lucide-react';

interface RestaurantDetailModalProps {
  isOpen: boolean;
  restaurant: RestaurantCardData | null;
  participants: Participant[];
  isShortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  onClose: () => void;
  onSelectParticipant: (participant: Participant) => void;
  eventDetails?: EventDetails;
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  isOpen,
  restaurant,
  participants,
  isShortlisted,
  onToggleShortlist,
  onClose,
  onSelectParticipant,
  eventDetails,
}) => {
  const [showMatchedDropdown, setShowMatchedDropdown] = useState<boolean>(true);
  const [showUnmatchedDropdown, setShowUnmatchedDropdown] = useState<boolean>(true);
  const [showSuggestedMenu, setShowSuggestedMenu] = useState<boolean>(false);

  // Dynamic Limitations Evaluation Notes
  const limitationEvaluation = useMemo(() => {
    if (!restaurant || !eventDetails) return null;
    return evaluateRestaurantLimitations(restaurant, eventDetails, participants.length);
  }, [restaurant, eventDetails, participants.length]);

  if (!isOpen || !restaurant) return null;

  // Resolve matched participants
  const matchedParticipants = participants.filter((p) =>
    restaurant.matchedParticipantIds.includes(p.id)
  );

  const getParticipantObject = (id: string): Participant | undefined => {
    return participants.find((p) => p.id === id);
  };

  const getMatchBadgeColor = (percentage: number) => {
    if (percentage >= 85) return 'text-[#4ade80] bg-[#22c55e]/20 border-[#22c55e]/50';
    if (percentage >= 70) return 'text-[#facc15] bg-[#eab308]/20 border-[#eab308]/50';
    return 'text-[#f87171] bg-[#ef4444]/20 border-[#ef4444]/50';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
      id="restaurant-detail-modal"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#1c1311] border border-[#453028] rounded-2xl shadow-2xl overflow-hidden my-auto"
        id="restaurant-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#35241f] bg-[#231815]">
          <div className="flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold tracking-wider text-[#b8744b] uppercase">
                {restaurant.cuisine}
              </span>
              <span className="text-[#5e473f]">•</span>
              <span className="flex items-center gap-1 text-xs text-[#fcd34d] font-semibold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
                <Star className="w-3 h-3 fill-[#fcd34d] text-[#fcd34d]" />
                {restaurant.rating.toFixed(1)} Rating
              </span>
              <span className="text-[#5e473f]">•</span>
              <span className="flex items-center gap-1 text-xs text-[#cfc1ba] bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
                <MapPin className="w-3 h-3 text-[#b8744b]" />
                {restaurant.distance}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {restaurant.name}
            </h2>

            {restaurant.address && (
              <p className="text-xs text-[#9e8f87] mt-1 flex items-center gap-1.5">
                <span>{restaurant.address}</span>
                {restaurant.phone && <span>• {restaurant.phone}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleShortlist(restaurant.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isShortlisted
                  ? 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/50 hover:bg-[#22c55e]/30'
                  : 'bg-[#2b1c18] text-[#cfc1ba] border-[#443029] hover:text-white hover:border-[#634940]'
              }`}
              title="Toggle Shortlist"
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  isShortlisted ? 'fill-[#4ade80] text-[#4ade80]' : 'text-[#b8744b]'
                }`}
              />
              <span className="hidden sm:inline">
                {isShortlisted ? 'Shortlisted' : 'Shortlist Venue'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#9b8b84] hover:text-white hover:bg-[#2e1d18] transition-colors border border-transparent hover:border-[#48332b] cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-[#cfc1ba]">
          {/* Top Banner: Compatibility Ratio & Dropdown Drilldown */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#251915] border border-[#483229] shadow-inner space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm sm:text-base font-bold px-3 py-1 rounded-xl border ${getMatchBadgeColor(
                      restaurant.matchPercentage
                    )}`}
                  >
                    {restaurant.matchPercentage}% of your group can eat safely here
                  </span>
                  <span className="text-xs text-[#9b8b84]">
                    ({matchedParticipants.length} of {participants.length} guests)
                  </span>
                </div>
                <p className="text-xs text-[#a89993] mt-1.5">
                  Based on AI verification of 12 attendee dietary intake profiles, medical
                  restrictions, and cross-contamination alerts.
                </p>
              </div>

              {/* Mini visual bar */}
              <div className="w-full sm:w-48 bg-[#18100e] h-3 rounded-full overflow-hidden border border-[#3b2923] shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-[#b8744b] to-[#22c55e] transition-all duration-500 rounded-full"
                  style={{ width: `${restaurant.matchPercentage}%` }}
                />
              </div>
            </div>

            {/* Interactive Accordion 1: Matched Participants (Can Eat Safely) */}
            <div className="border-t border-[#3b2923] pt-3">
              <button
                type="button"
                onClick={() => setShowMatchedDropdown(!showMatchedDropdown)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-white hover:text-[#d88c5e] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>
                    Matched Participants ({matchedParticipants.length} Guests Can Eat Safely)
                  </span>
                  <span className="text-[10px] text-[#22c55e] bg-[#22c55e]/15 px-2 py-0.5 rounded-full border border-[#22c55e]/30 font-semibold">
                    100% Accommodated
                  </span>
                </div>
                {showMatchedDropdown ? (
                  <ChevronUp className="w-4 h-4 text-[#a89892]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#a89892]" />
                )}
              </button>

              {showMatchedDropdown && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {matchedParticipants.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectParticipant(p)}
                      className="p-2.5 rounded-xl bg-[#1d1310] border border-[#37251f] hover:border-[#22c55e]/50 hover:bg-[#251713] transition-all cursor-pointer group"
                      title="Click to view full intake profile & AI transcript"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white group-hover:text-[#4ade80] transition-colors truncate">
                          {p.name}
                        </span>
                        <UserCheck className="w-3 h-3 text-[#22c55e] shrink-0" />
                      </div>
                      <div className="text-[10px] text-[#9b8b84] truncate mt-0.5">
                        {p.role}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2a1b17] border border-[#3e2922] text-[#d6c7c0] truncate">
                          {p.dietaryCategory}
                        </span>
                        <span className="text-[9px] text-[#8e7e78] group-hover:text-white transition-colors ml-auto">
                          View profile &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Accordion 2: Dietary Conflicts / Unmatched */}
            {restaurant.dietaryConflicts.length > 0 && (
              <div className="border-t border-[#3b2923] pt-3">
                <button
                  type="button"
                  onClick={() => setShowUnmatchedDropdown(!showUnmatchedDropdown)}
                  className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-white hover:text-[#ef4444] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                    <span>
                      Dietary Conflicts & Unmatched ({restaurant.dietaryConflicts.length}{' '}
                      {restaurant.dietaryConflicts.length === 1 ? 'Guest' : 'Guests'})
                    </span>
                    <span className="text-[10px] text-[#ef4444] bg-[#ef4444]/15 px-2 py-0.5 rounded-full border border-[#ef4444]/30 font-semibold">
                      Action Required
                    </span>
                  </div>
                  {showUnmatchedDropdown ? (
                    <ChevronUp className="w-4 h-4 text-[#a89892]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#a89892]" />
                  )}
                </button>

                {showUnmatchedDropdown && (
                  <div className="mt-3 space-y-2">
                    {restaurant.dietaryConflicts.map((conflict) => {
                      const pObj = getParticipantObject(conflict.participantId);
                      return (
                        <div
                          key={conflict.participantId}
                          onClick={() => pObj && onSelectParticipant(pObj)}
                          className="p-3 rounded-xl bg-[#221411] border border-[#52251e] hover:border-[#ef4444]/70 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          title="Click to view participant profile & transcript"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center shrink-0 mt-0.5">
                              <UserX className="w-3.5 h-3.5 text-[#f87171]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-white group-hover:text-[#f87171] transition-colors">
                                  {conflict.participantName}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef4444]/20 text-[#fca5a5] border border-[#ef4444]/40 font-medium">
                                  {conflict.dietaryIssue}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#cf9f96] mt-1 leading-relaxed">
                                {conflict.reason}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 sm:text-right">
                            <span className="text-[10px] text-[#b8744b] group-hover:text-white transition-colors flex items-center gap-1">
                              View {conflict.participantName}&apos;s profile &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Limitations Evaluation & Compliance Notes */}
          {limitationEvaluation && (
            <div className="space-y-3 p-4 rounded-2xl bg-[#1d1412] border border-[#3b2720] shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#e0b769] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#eab308]" />
                  Event Limitations &amp; Constraints Evaluation
                </h3>
                <span className="text-[10px] text-[#a0928c] font-medium">
                  Evaluated against your event parameters
                </span>
              </div>

              <div className="space-y-2">
                {limitationEvaluation.allNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      note.type === 'good'
                        ? 'bg-[#152319] border-[#22c55e]/30 text-[#d4ebd8]'
                        : note.type === 'neutral'
                        ? 'bg-[#262013] border-[#eab308]/30 text-[#faedd4]'
                        : 'bg-[#281514] border-[#ef4444]/30 text-[#ffd5d2]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {note.type === 'good' && (
                        <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                      )}
                      {note.type === 'neutral' && (
                        <MinusCircle className="w-4 h-4 text-[#eab308]" />
                      )}
                      {note.type === 'bad' && (
                        <AlertCircle className="w-4 h-4 text-[#ef4444]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            note.type === 'good'
                              ? 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/40'
                              : note.type === 'neutral'
                              ? 'bg-[#eab308]/20 text-[#facc15] border-[#eab308]/40'
                              : 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/40'
                          }`}
                        >
                          {note.category} • {note.type === 'good' ? 'Compliant' : note.type === 'neutral' ? 'Notice' : 'Alert'}
                        </span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed">{note.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traits Evaluation Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#b8744b]" />
              Attendee Accommodation Traits & Kitchen Verification
            </h3>

            <div className="space-y-2">
              {restaurant.traits.map((trait) => (
                <div
                  key={trait.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 ${
                    trait.type === 'good'
                      ? 'bg-[#152319] border-[#22c55e]/30'
                      : trait.type === 'neutral'
                      ? 'bg-[#262013] border-[#eab308]/30'
                      : 'bg-[#281514] border-[#ef4444]/30'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {trait.type === 'good' && (
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    )}
                    {trait.type === 'neutral' && (
                      <MinusCircle className="w-4 h-4 text-[#eab308]" />
                    )}
                    {trait.type === 'bad' && (
                      <AlertCircle className="w-4 h-4 text-[#ef4444]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mr-2 ${
                        trait.type === 'good'
                          ? 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/40'
                          : trait.type === 'neutral'
                          ? 'bg-[#eab308]/20 text-[#facc15] border-[#eab308]/40'
                          : 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/40'
                      }`}
                    >
                      {trait.type === 'good'
                        ? 'Good Match'
                        : trait.type === 'neutral'
                        ? 'Neutral'
                        : 'Alert / Conflict'}
                    </span>
                    <span className="text-xs text-white font-medium">
                      {trait.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Food Cost Breakdown Card */}
          <div className="p-5 rounded-2xl bg-[#201512] border border-[#3b2923] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#b8744b]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Estimated Food Cost Breakdown ({restaurant.estimatedCost.attendeeCount} Attendees)
                </h3>
              </div>
              <span className="text-xs font-bold text-[#4ade80] bg-[#22c55e]/15 px-2.5 py-0.5 rounded-full border border-[#22c55e]/30">
                Avg. ${restaurant.estimatedCost.averagePerGuest} / guest
              </span>
            </div>

            <p className="text-xs text-[#a09088]">
              Includes customized dietary courses and sterile allergen annex prep for your{' '}
              <strong className="text-white">
                {restaurant.estimatedCost.dietaryCount} attendees with dietary requirements
              </strong>
              .
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#19100e] border border-[#32211b]">
                <span className="text-[11px] text-[#8e7e78] block">Base Course</span>
                <span className="text-base font-bold text-white">
                  ${restaurant.estimatedCost.baseFoodTotal}
                </span>
                <span className="text-[10px] text-[#6d5e58] block mt-0.5">
                  12 x ${restaurant.estimatedCost.basePricePerGuest}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#19100e] border border-[#32211b]">
                <span className="text-[11px] text-[#8e7e78] block">Dietary Surcharge</span>
                <span className="text-base font-bold text-[#f59e0b]">
                  +${restaurant.estimatedCost.dietarySurcharge}
                </span>
                <span className="text-[10px] text-[#6d5e58] block mt-0.5">
                  10 Custom Course Preps
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#19100e] border border-[#32211b]">
                <span className="text-[11px] text-[#8e7e78] block">Service & Gratuity</span>
                <span className="text-base font-bold text-white">
                  ${restaurant.estimatedCost.serviceAndGratuity}
                </span>
                <span className="text-[10px] text-[#6d5e58] block mt-0.5">
                  20% Banquet Staffing
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#291712] border border-[#522a1f]">
                <span className="text-[11px] text-[#b8744b] font-semibold block">Total Estimated</span>
                <span className="text-base font-bold text-[#4ade80]">
                  ${restaurant.estimatedCost.totalEstimatedCost}
                </span>
                <span className="text-[10px] text-[#a89892] block mt-0.5">
                  All taxes & prep included
                </span>
              </div>
            </div>
          </div>

          {/* SUGGESTED MENU ORDERING PLAN TOGGLE BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowSuggestedMenu(!showSuggestedMenu)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#2c1d18] via-[#3a251e] to-[#2c1d18] border border-[#58392d] hover:border-[#b8744b] text-white font-bold text-sm transition-all shadow-md cursor-pointer group"
              id="view-suggested-menu-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#b8744b]/20 border border-[#b8744b]/40 flex items-center justify-center text-[#d88c5e] group-hover:scale-110 transition-transform">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-white group-hover:text-[#d88c5e] transition-colors">
                    {showSuggestedMenu
                      ? 'Hide Suggested Menu Items'
                      : 'View Suggested Menu Items (Group Order Breakdown)'}
                  </span>
                  <span className="text-xs text-[#a09088] font-normal block">
                    Exact quantities: &quot;Order 4 of this, 3 of this, 1 for special guest...&quot;
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#b8744b] text-white font-semibold group-hover:bg-[#cb8357] transition-colors">
                  {showSuggestedMenu ? 'Collapse' : 'Expand Order Plan'}
                </span>
                {showSuggestedMenu ? (
                  <ChevronUp className="w-5 h-5 text-[#d88c5e]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#d88c5e]" />
                )}
              </div>
            </button>

            {/* EXPANDED SUGGESTED MENU ITEMS CONTAINER */}
            {showSuggestedMenu && (
              <div
                className="mt-4 p-5 rounded-2xl bg-[#1f1411] border border-[#483027] space-y-4 animate-in fade-in duration-300"
                id="suggested-menu-items-panel"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#35241f]">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#facc15]" />
                      Chef-Curated Group Order Plan (12 Total Entrées)
                    </h4>
                    <p className="text-xs text-[#9b8b84]">
                      Labels indicate exactly which participants each entrée batch is designated for.
                    </p>
                  </div>
                  <span className="text-xs text-[#22c55e] font-semibold bg-[#22c55e]/15 px-3 py-1 rounded-full border border-[#22c55e]/30 self-start sm:self-auto">
                    12 / 12 Guests Covered
                  </span>
                </div>

                <div className="space-y-3">
                  {restaurant.suggestedMenuItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl bg-[#170f0d] border border-[#38241e] hover:border-[#4d3229] transition-all space-y-2.5"
                    >
                      {/* Item Top: Quantity Badge + Dish Name + Price */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {/* Prominent Order Quantity Pill */}
                          <span className="text-xs font-black px-3 py-1.5 rounded-lg bg-[#b8744b] text-white border border-[#d88c5e] shadow-sm tracking-wide shrink-0">
                            Order {item.quantity}x
                          </span>
                          <span className="font-bold text-sm text-white leading-snug">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-xs text-[#a09088] shrink-0 font-medium">
                          ${item.price} each •{' '}
                          <strong className="text-[#4ade80]">
                            ${item.price * item.quantity} subtotal
                          </strong>
                        </div>
                      </div>

                      {/* Participant Destination Label - Highlighting Target Audience */}
                      <div className="p-2.5 rounded-lg bg-[#241714] border border-[#432c24] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs text-[#f1eae6] font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#b8744b] shrink-0" />
                          <span>{item.targetAudienceLabel}</span>
                        </div>

                        {/* Clickable Participant Chips */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.participantIds.map((pId) => {
                            const pObj = getParticipantObject(pId);
                            if (!pObj) return null;
                            return (
                              <button
                                key={pId}
                                type="button"
                                onClick={() => onSelectParticipant(pObj)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-[#33201b] hover:bg-[#482e27] text-[#e5dad5] hover:text-white border border-[#52332a] transition-colors cursor-pointer"
                                title={`View ${pObj.name}'s profile`}
                              >
                                {pObj.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Chef / Allergen Kitchen Notes */}
                      {item.notes && (
                        <p className="text-[11.5px] text-[#9b8b84] italic pl-2 border-l-2 border-[#b8744b]/50">
                          Prep Notes: {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#35241f] bg-[#231815] flex items-center justify-between gap-3">
          <div className="text-xs text-[#8e7e78]">
            {restaurant.capacity} capacity • Radius: {restaurant.distance}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#2c1b17] hover:bg-[#3d2620] text-[#ded3cd] hover:text-white border border-[#452c23] transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
