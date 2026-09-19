import React, { useState, useMemo } from 'react';
import { Participant } from '../types';
import {
  Users,
  Search,
  ShieldAlert,
  MessageSquare,
  Mail,
  ChevronRight,
  CheckCircle2,
  Wheat,
  Leaf,
  Moon,
  Sparkles,
} from 'lucide-react';

interface ParticipantsViewProps {
  participants: Participant[];
  onSelectParticipant: (participant: Participant) => void;
}

export const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  participants,
  onSelectParticipant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Stats calculation
  const stats = useMemo(() => {
    const total = participants.length;
    const withRestrictions = participants.filter(
      (p) =>
        p.foodRestrictions.length > 0 &&
        p.foodRestrictions[0] !== 'None' &&
        p.foodRestrictions[0] !== 'None reported'
    ).length;
    const severeAllergies = participants.filter((p) => p.dietaryCategory === 'Severe Allergy').length;
    const glutenFree = participants.filter((p) => p.dietaryCategory === 'Gluten-Free').length;
    const plantBased = participants.filter(
      (p) => p.dietaryCategory === 'Vegan' || p.dietaryCategory === 'Vegetarian'
    ).length;
    const completedIntake = participants.filter((p) => p.aiIntakeStatus === 'Completed').length;

    return {
      total,
      withRestrictions,
      severeAllergies,
      glutenFree,
      plantBased,
      completedIntake,
    };
  }, [participants]);

  // Filter logic
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Category filter
      if (activeCategory === 'restrictions') {
        const has =
          p.foodRestrictions.length > 0 &&
          p.foodRestrictions[0] !== 'None' &&
          p.foodRestrictions[0] !== 'None reported';
        if (!has) return false;
      } else if (activeCategory === 'severe') {
        if (p.dietaryCategory !== 'Severe Allergy') return false;
      } else if (activeCategory === 'gluten-free') {
        if (p.dietaryCategory !== 'Gluten-Free') return false;
      } else if (activeCategory === 'plant') {
        if (p.dietaryCategory !== 'Vegan' && p.dietaryCategory !== 'Vegetarian') return false;
      } else if (activeCategory === 'halal-kosher') {
        if (p.dietaryCategory !== 'Halal' && p.dietaryCategory !== 'Kosher') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchCompany = p.company.toLowerCase().includes(query);
        const matchRole = p.role.toLowerCase().includes(query);
        const matchEmail = p.email ? p.email.toLowerCase().includes(query) : false;
        const matchRestrictions = p.foodRestrictions.some((r) =>
          r.toLowerCase().includes(query)
        );
        const matchPrefs = p.foodPreferences.some((pref) => pref.toLowerCase().includes(query));
        return matchName || matchCompany || matchRole || matchEmail || matchRestrictions || matchPrefs;
      }

      return true;
    });
  }, [participants, activeCategory, searchQuery]);

  const getDietaryCategoryBadge = (cat: Participant['dietaryCategory']) => {
    switch (cat) {
      case 'Severe Allergy':
        return 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/40';
      case 'Gluten-Free':
        return 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/40';
      case 'Vegan':
      case 'Vegetarian':
        return 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/40';
      case 'Halal':
      case 'Kosher':
        return 'bg-[#38bdf8]/20 text-[#7dd3fc] border-[#38bdf8]/40';
      default:
        return 'bg-[#786a63]/20 text-[#d4c8c2] border-[#786a63]/40';
    }
  };

  return (
    <div className="space-y-6" id="participants-view-container">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" id="participants-kpi-row">
        <div className="p-4 rounded-2xl bg-[#231a17] border border-[#382721]">
          <div className="flex items-center justify-between text-xs text-[#9b8b84] mb-1">
            <span>Total Attendees</span>
            <Users className="w-4 h-4 text-[#b8744b]" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.total}</div>
          <div className="text-[11px] text-[#22c55e] mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% RSVP Confirmed
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#231a17] border border-[#382721]">
          <div className="flex items-center justify-between text-xs text-[#9b8b84] mb-1">
            <span>Dietary Flags</span>
            <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
          </div>
          <div className="text-2xl font-bold text-[#f87171] tracking-tight">
            {stats.withRestrictions}
          </div>
          <div className="text-[11px] text-[#9b8b84] mt-1">
            {Math.round((stats.withRestrictions / stats.total) * 100)}% of attendee roster
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#231a17] border border-[#382721]">
          <div className="flex items-center justify-between text-xs text-[#9b8b84] mb-1">
            <span>Strict Celiac / GF</span>
            <Wheat className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="text-2xl font-bold text-[#fbbf24] tracking-tight">
            {stats.glutenFree}
          </div>
          <div className="text-[11px] text-[#9b8b84] mt-1">Dedicated prep required</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#231a17] border border-[#382721]">
          <div className="flex items-center justify-between text-xs text-[#9b8b84] mb-1">
            <span>AI Intake Verified</span>
            <Sparkles className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="text-2xl font-bold text-[#7dd3fc] tracking-tight">
            {stats.completedIntake} / {stats.total}
          </div>
          <div className="text-[11px] text-[#22c55e] mt-1">Full transcripts on file</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#201512] border border-[#33221c]">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#786a63] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by participant name, company, allergen (e.g. Celiac, Nut), preference..."
            className="w-full pl-10 pr-4 py-2 bg-[#170f0e] border border-[#3a2822] rounded-xl text-white placeholder-[#786a63] text-xs focus:outline-none focus:border-[#b8744b] transition-colors"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-[#b8744b] text-white border-[#b8744b]'
                : 'bg-[#180f0d] text-[#8e7e78] border-[#31201b] hover:text-white'
            }`}
          >
            All ({participants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('severe')}
            className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'severe'
                ? 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/60'
                : 'bg-[#180f0d] text-[#8e7e78] border-[#31201b] hover:text-[#f87171]'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-[#ef4444]" />
            Severe Allergies ({stats.severeAllergies})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('gluten-free')}
            className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'gluten-free'
                ? 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/60'
                : 'bg-[#180f0d] text-[#8e7e78] border-[#31201b] hover:text-[#fbbf24]'
            }`}
          >
            <Wheat className="w-3 h-3 text-[#f59e0b]" />
            Gluten-Free ({stats.glutenFree})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('plant')}
            className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'plant'
                ? 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/60'
                : 'bg-[#180f0d] text-[#8e7e78] border-[#31201b] hover:text-[#4ade80]'
            }`}
          >
            <Leaf className="w-3 h-3 text-[#22c55e]" />
            Plant-Based ({stats.plantBased})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('halal-kosher')}
            className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'halal-kosher'
                ? 'bg-[#38bdf8]/20 text-[#7dd3fc] border-[#38bdf8]/60'
                : 'bg-[#180f0d] text-[#8e7e78] border-[#31201b] hover:text-[#7dd3fc]'
            }`}
          >
            <Moon className="w-3 h-3 text-[#38bdf8]" />
            Halal / Kosher
          </button>
        </div>
      </div>

      {/* Massive Participants Chart Table with Details */}
      <div
        className="rounded-2xl bg-[#231a17] border border-[#352520] shadow-xl overflow-hidden"
        id="participants-table-card"
      >
        <div className="px-6 py-4 border-b border-[#31211c] flex items-center justify-between bg-[#1d1311]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Participant Dietary & AI Intake Roster
            </h3>
            <p className="text-xs text-[#9b8b84] mt-0.5">
              Click any participant row to examine food restrictions, preferences, contact email, and full AI chat transcript.
            </p>
          </div>
          <span className="text-xs text-[#a0918a] font-semibold bg-[#2a1d19] px-3 py-1 rounded-full border border-[#3d2a23]">
            Showing {filteredParticipants.length} of {participants.length}
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="participants-table">
            <thead>
              <tr className="border-b border-[#30211c] bg-[#1a110f] text-[11px] font-bold uppercase tracking-wider text-[#91817a]">
                <th className="py-3.5 px-6">Participant</th>
                <th className="py-3.5 px-4">Food Restrictions Data</th>
                <th className="py-3.5 px-4">Food Preferences</th>
                <th className="py-3.5 px-4">Contact Email</th>
                <th className="py-3.5 px-4">AI Chat Intake</th>
                <th className="py-3.5 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a1d19] text-xs">
              {filteredParticipants.map((participant) => {
                const hasRestrictions =
                  participant.foodRestrictions.length > 0 &&
                  participant.foodRestrictions[0] !== 'None' &&
                  participant.foodRestrictions[0] !== 'None reported';

                return (
                  <tr
                    key={participant.id}
                    onClick={() => onSelectParticipant(participant)}
                    className="hover:bg-[#2c1d18] transition-colors cursor-pointer group"
                    id={`participant-row-${participant.id}`}
                  >
                    {/* Participant Column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#b8744b] to-[#783e20] p-0.5 shadow-sm shrink-0">
                          <div className="w-full h-full rounded-full bg-[#1c1210] flex items-center justify-center font-bold text-xs text-[#f4ba95]">
                            {participant.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-[#f4ba95] transition-colors flex items-center gap-2">
                            <span>{participant.name}</span>
                            <span
                              className={`text-[9.5px] uppercase font-bold px-1.5 py-0.2 rounded border ${getDietaryCategoryBadge(
                                participant.dietaryCategory
                              )}`}
                            >
                              {participant.dietaryCategory}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8e7e78]">
                            {participant.role} • {participant.company}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Food Restrictions Column */}
                    <td className="py-4 px-4 max-w-[240px]">
                      {hasRestrictions ? (
                        <div className="space-y-1">
                          {participant.foodRestrictions.slice(0, 2).map((res, i) => (
                            <div
                              key={i}
                              className="text-[11.5px] text-[#fca5a5] flex items-center gap-1.5 truncate"
                              title={res}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
                              <span className="truncate">{res}</span>
                            </div>
                          ))}
                          {participant.foodRestrictions.length > 2 && (
                            <span className="text-[10px] text-[#e0a4a4]">
                              +{participant.foodRestrictions.length - 2} more restrictions
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#887872] italic text-[11px]">
                          No dietary restrictions
                        </span>
                      )}
                    </td>

                    {/* Food Preferences Column */}
                    <td className="py-4 px-4 max-w-[220px]">
                      <div className="text-[11.5px] text-[#ddd2cd] truncate" title={participant.foodPreferences.join(', ')}>
                        {participant.foodPreferences[0] || 'Open culinary palette'}
                      </div>
                      {participant.foodPreferences[1] && (
                        <div className="text-[11px] text-[#9b8b84] truncate mt-0.5">
                          {participant.foodPreferences[1]}
                        </div>
                      )}
                    </td>

                    {/* Contact Email Column */}
                    <td className="py-4 px-4">
                      {participant.email ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#cfc1ba]">
                          <Mail className="w-3.5 h-3.5 text-[#b8744b] shrink-0" />
                          <span className="truncate max-w-[150px]">{participant.email}</span>
                        </div>
                      ) : (
                        <span className="text-[#6d5e58] italic text-[11px]">Not provided</span>
                      )}
                    </td>

                    {/* AI Chat Intake Column */}
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[11px] font-medium text-[#7dd3fc]">
                        <MessageSquare className="w-3 h-3" />
                        <span>{participant.aiChatTranscript.length} msgs (Verified)</span>
                      </div>
                    </td>

                    {/* Action Column */}
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectParticipant(participant);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#271916] group-hover:bg-[#b8744b] text-[#c9b9b3] group-hover:text-white border border-[#3f2b23] group-hover:border-[#b8744b] text-xs font-semibold transition-all"
                      >
                        <span>View Transcript</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
