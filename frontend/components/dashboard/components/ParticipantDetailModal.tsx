import React, { useState } from 'react';
import { Participant } from '../types';
import {
  X,
  ShieldAlert,
  Heart,
  Mail,
  Phone,
  MessageSquare,
  Bot,
  User,
  Copy,
  Check,
  Building,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface ParticipantDetailModalProps {
  participant: Participant | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  participant,
  isOpen,
  onClose,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen || !participant) return null;

  const handleCopyEmail = () => {
    if (participant.email) {
      navigator.clipboard.writeText(participant.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 transition-all duration-300"
      id="participant-detail-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-name-title"
    >
      {/* Blurred Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        id="participant-modal-backdrop"
      />

      {/* Modal Dialog Window */}
      <div
        className="relative w-full max-w-2xl bg-[#1e1513] border border-[#3f2e27] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        id="participant-detail-dialog"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#30211c] bg-[#19100e] shrink-0">
          <div className="flex items-center gap-3.5">
            {/* Avatar Initials */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#b8744b] to-[#783e20] p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-full bg-[#201512] flex items-center justify-center font-bold text-sm text-[#f0ba95]">
                {participant.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg font-bold text-white tracking-tight leading-snug"
                  id="participant-name-title"
                >
                  {participant.name}
                </h2>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getDietaryCategoryBadge(
                    participant.dietaryCategory
                  )}`}
                >
                  {participant.dietaryCategory}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#a0918a] mt-0.5">
                <span>{participant.role}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#d8cbc5]">
                  <Building className="w-3 h-3 text-[#b8744b]" />
                  {participant.company}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="close-participant-modal-btn"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9b8b84] hover:text-white hover:bg-[#2e1e19] transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
          {/* SECTION 1: FOOD RESTRICTIONS DATA */}
          <div
            className="rounded-xl bg-[#241916] border border-[#3d2a23] p-4.5 shadow-sm"
            id="section-food-restrictions"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#35241e]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 flex items-center justify-center text-[#ef4444]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    1. Food Restrictions Data
                  </h3>
                  <p className="text-[11px] text-[#9b8b84]">
                    Kitchen safety constraints & medical alerts
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30">
                {participant.foodRestrictions.length} Flags
              </span>
            </div>

            {participant.foodRestrictions.length > 0 &&
            participant.foodRestrictions[0] !== 'None' &&
            participant.foodRestrictions[0] !== 'None reported' ? (
              <div className="space-y-2">
                {participant.foodRestrictions.map((restriction, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#1a1210] border border-[#3b2721] text-xs text-[#f1e2dd]"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold text-white">{restriction}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#1a1210] border border-[#352520] text-xs text-[#9d8c85]">
                No critical medical dietary restrictions or allergies reported by participant.
              </div>
            )}
          </div>

          {/* SECTION 2: FOOD PREFERENCE DATA */}
          <div
            className="rounded-xl bg-[#241916] border border-[#3d2a23] p-4.5 shadow-sm"
            id="section-food-preferences"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#35241e]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e]">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    2. Food Preference Data
                  </h3>
                  <p className="text-[11px] text-[#9b8b84]">
                    Taste profile, course choices & beverage requests
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30">
                Tailored Profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {participant.foodPreferences.map((pref, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-[#1a1210] border border-[#372620] text-xs text-[#ded3ce]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                  <span>{pref}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: OPTIONAL CONTACT EMAIL */}
          <div
            className="rounded-xl bg-[#241916] border border-[#3d2a23] p-4.5 shadow-sm"
            id="section-contact-email"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#35241e]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#b8744b]/15 border border-[#b8744b]/30 flex items-center justify-center text-[#d88c5e]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    3. Optional Contact Email
                  </h3>
                  <p className="text-[11px] text-[#9b8b84]">
                    Direct communication channel for venue confirmations
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#1a1210] border border-[#372620]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2a1d19] flex items-center justify-center text-[#b8744b]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-[#9b8b84]">
                    Email Address
                  </span>
                  {participant.email ? (
                    <span className="text-sm font-semibold text-white select-all">
                      {participant.email}
                    </span>
                  ) : (
                    <span className="text-xs text-[#8a7972] italic">
                      No optional email provided
                    </span>
                  )}
                </div>
              </div>

              {participant.email && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#271a17] hover:bg-[#382621] border border-[#433028] text-xs font-medium text-[#d8cbc5] hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`mailto:${participant.email}?subject=Executive Gala Dinner - Dining Confirmation`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#b8744b] hover:bg-[#c98256] text-xs font-semibold text-white shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </a>
                </div>
              )}
            </div>

            {/* Optional Phone if present */}
            {participant.phone && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-[#a0918a] px-3">
                <Phone className="w-3.5 h-3.5 text-[#887872]" />
                <span>Mobile Contact:</span>
                <span className="text-[#cfc1ba] font-medium">{participant.phone}</span>
              </div>
            )}
          </div>

          {/* SECTION 4: FULL WHOLE TRANSCRIPT OF THAT PARTICIPANT'S CHAT WITH OUR AI */}
          <div
            className="rounded-xl bg-[#241916] border border-[#3d2a23] p-4.5 shadow-sm"
            id="section-ai-chat-transcript"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#35241e]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    4. Full Chat Transcript with AI
                  </h3>
                  <p className="text-[11px] text-[#9b8b84]">
                    Recorded intake dialogue between Concierge AI and participant
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#7dd3fc] border border-[#38bdf8]/30 flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {participant.aiChatTranscript.length} Messages
              </span>
            </div>

            {/* Chat Transcript Stream */}
            <div className="space-y-3.5 bg-[#170f0e] p-4 rounded-xl border border-[#35241e]">
              {participant.aiChatTranscript.map((msg) => {
                const isAi = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
                  >
                    {/* Sender Icon */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isAi
                          ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#7dd3fc]'
                          : 'bg-[#b8744b]/20 border border-[#b8744b]/40 text-[#f4ba95]'
                      }`}
                    >
                      {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        isAi
                          ? 'bg-[#251b18] border border-[#3a2822] text-[#e5dbd6]'
                          : 'bg-[#3d2720] border border-[#52372e] text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-[#8e7e78]">
                        <span className="font-semibold text-[#b8a9a2]">
                          {isAi ? 'Reserva Concierge AI' : participant.name}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#30211c] bg-[#19100e] shrink-0">
          <div className="text-xs text-[#8e7e78] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#b8744b]" />
            <span>Table: {participant.tableGroup || 'Unassigned'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2a1d19] hover:bg-[#382722] text-[#d4c8c2] hover:text-white border border-[#43322b] transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
