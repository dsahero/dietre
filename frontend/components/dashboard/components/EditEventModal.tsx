import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  MapPin,
  DollarSign,
  Navigation,
  AlertTriangle,
  Check,
  Sparkles,
  Users,
} from 'lucide-react';
import { EventDetails } from '../types';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventDetails: EventDetails;
  onSave: (details: EventDetails) => void;
  attendeeCount?: number;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  eventDetails,
  onSave,
  attendeeCount = 12,
}) => {
  // NOTE: This component is remounted (via a `key` on the parent's isOpen state)
  // every time the modal opens, so these initializers only need to run once per
  // open and don't need an effect to "resync" on the isOpen prop.
  const [name, setName] = useState(eventDetails.name);
  const [address, setAddress] = useState(eventDetails.address);
  const [limitations, setLimitations] = useState(eventDetails.limitations);
  const [maxDistanceRadius, setMaxDistanceRadius] = useState(eventDetails.maxDistanceRadius);

  const initialBudget = useMemo(() => {
    const budgetStr = eventDetails.maxBudget || '';
    const isOverall = /total|overall/i.test(budgetStr);
    const match = budgetStr.match(/\$?(\d+(?:,\d+)?(?:\.\d+)?)/);
    const numericVal = match ? parseFloat(match[1].replace(/,/g, '')) : 120;
    return isOverall
      ? {
          mode: 'overall' as const,
          perGuest: Math.round(numericVal / attendeeCount),
          overall: numericVal,
        }
      : {
          mode: 'per_guest' as const,
          perGuest: numericVal,
          overall: numericVal * attendeeCount,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only needs to run once per mount (see note above)
  }, []);

  // Budget mode: per attendee vs overall total
  const [budgetMode, setBudgetMode] = useState<'per_guest' | 'overall'>(initialBudget.mode);
  const [perGuestValue, setPerGuestValue] = useState<number>(initialBudget.perGuest);
  const [overallValue, setOverallValue] = useState<number>(initialBudget.overall);

  // Notification of auto-sync from limitations text
  const [autoSyncAlert, setAutoSyncAlert] = useState<string | null>(null);

  // Handle Per Guest Input Change
  const handlePerGuestChange = (val: number) => {
    setPerGuestValue(val);
    setOverallValue(val * attendeeCount);
  };

  // Handle Overall Total Input Change
  const handleOverallChange = (val: number) => {
    setOverallValue(val);
    setPerGuestValue(Math.round(val / attendeeCount));
  };

  // Switch budget mode
  const handleModeSwitch = (mode: 'per_guest' | 'overall') => {
    setBudgetMode(mode);
  };

  // AUTO-SYNC from limitations:
  // When limitations text is modified, automatically parse & update relevant fields
  const handleLimitationsChange = (newText: string) => {
    setLimitations(newText);

    const detectedUpdates: string[] = [];

    // 1. Detect per-guest budget in limitations (e.g. "$130 per person", "$150 / guest", "$115/head")
    const perGuestRegex = /\$(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:\/|\s*per\s*)(?:guest|person|attendee|head|pax)/i;
    const perGuestMatch = newText.match(perGuestRegex);
    if (perGuestMatch) {
      const num = parseFloat(perGuestMatch[1].replace(/,/g, ''));
      if (num > 0 && num !== perGuestValue) {
        setPerGuestValue(num);
        setOverallValue(num * attendeeCount);
        detectedUpdates.push(`$${num}/guest`);
      }
    } else {
      // Detect overall total budget (e.g. "Total budget $3,000", "overall budget $2,500", "$3000 total")
      const totalBudgetRegex = /(?:total\s*budget|overall\s*budget|budget\s*of)\s*(?:is\s*)?\$(\d+(?:,\d+)?(?:\.\d+)?)/i;
      const totalMatch = newText.match(totalBudgetRegex) || newText.match(/\$(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:total|overall)/i);
      if (totalMatch) {
        const num = parseFloat(totalMatch[1].replace(/,/g, ''));
        if (num > 0 && num !== overallValue) {
          setOverallValue(num);
          setPerGuestValue(Math.round(num / attendeeCount));
          detectedUpdates.push(`$${num.toLocaleString()} total`);
        }
      }
    }

    // 2. Detect radius in limitations (e.g. "within 4 miles", "max 3 mile radius", "radius 2.5 miles", "radius of 6 miles")
    const radiusRegex = /(?:within|max(?:imum)?\s*(?:distance|radius)?(?:\s*of)?|radius(?:\s*of)?)\s*(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i;
    const radiusMatch = newText.match(radiusRegex) || newText.match(/\b(\d+(?:\.\d+)?)\s*(?:miles?|mi)\s*(?:radius|max|limit)\b/i);
    if (radiusMatch) {
      const radiusVal = `${radiusMatch[1]} miles`;
      if (radiusVal !== maxDistanceRadius) {
        setMaxDistanceRadius(radiusVal);
        detectedUpdates.push(`${radiusVal} radius`);
      }
    }

    // 3. Detect address if location is specified (e.g. "venue at 450 Grand Ave", "located at 100 Main St")
    const addressRegex = /(?:venue\s*(?:at|is\s*at)|located\s*at)\s*([0-9]+\s+[A-Za-z0-9\s,.]+?(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Pavilion|Center|Suite\s*\d+))/i;
    const addrMatch = newText.match(addressRegex);
    if (addrMatch && addrMatch[1].trim() !== address) {
      setAddress(addrMatch[1].trim());
      detectedUpdates.push('venue address');
    }

    if (detectedUpdates.length > 0) {
      setAutoSyncAlert(`⚡ Auto-updated from limitations: ${detectedUpdates.join(', ')}`);
      setTimeout(() => setAutoSyncAlert(null), 4000);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Format formatted budget string based on current mode
    const formattedBudget =
      budgetMode === 'per_guest'
        ? `$${perGuestValue} / guest ($${overallValue.toLocaleString()} total)`
        : `$${overallValue.toLocaleString()} total ($${perGuestValue} / guest)`;

    onSave({
      name,
      address,
      limitations,
      maxDistanceRadius,
      maxBudget: formattedBudget,
      budgetMode,
      budgetAmount: budgetMode === 'per_guest' ? perGuestValue : overallValue,
      overallBudgetTotal: overallValue,
      attendeeCount,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300 overflow-y-auto"
      id="edit-event-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        id="modal-backdrop-blur"
      />

      {/* Modal Dialog Window - Scrollable Container */}
      <div
        className="relative w-full max-w-xl bg-[#231a17] border border-[#43322b] rounded-2xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col overflow-hidden"
        id="edit-event-dialog-box"
      >
        {/* Header with Title & X close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#362722] bg-[#1e1513] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#b8744b]/20 border border-[#b8744b]/40 flex items-center justify-center text-[#d88c5e]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight" id="modal-headline">
                Edit Event Details &amp; Parameters
              </h2>
              <p className="text-xs text-[#a0928c]">
                Limitations automatically sync budget, radius, and candidate kitchen checks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            id="close-modal-btn"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#a0928c] hover:text-white hover:bg-[#34241f] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Fully Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Auto-Sync Alert Toast Banner */}
          {autoSyncAlert && (
            <div
              className="p-3 rounded-xl bg-[#b8744b]/20 border border-[#b8744b]/60 text-white text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1"
              id="auto-sync-notification"
            >
              <Sparkles className="w-4 h-4 text-[#e09867] shrink-0" />
              <span className="font-semibold">{autoSyncAlert}</span>
            </div>
          )}

          {/* 1. Event Name */}
          <div>
            <label
              htmlFor="event-name-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[#a0928c] mb-1.5"
            >
              Event Name <span className="text-[#e06c55]">*</span>
            </label>
            <input
              type="text"
              id="event-name-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Executive Gala & Dinner"
              className="w-full px-4 py-2.5 bg-[#170f0e] border border-[#3e2c26] rounded-xl text-white placeholder-[#685852] text-sm focus:outline-none focus:border-[#b8744b] focus:ring-1 focus:ring-[#b8744b] transition-colors"
            />
          </div>

          {/* 2. Event Limitations Textbox with Live Field Auto-Sync */}
          <div className="p-4 rounded-xl bg-[#1b1210] border border-[#3c2a23] space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="event-limitations-input"
                className="block text-xs font-bold uppercase tracking-wider text-[#e0b769] flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#eab308]" />
                Event Limitations &amp; Restrictions
              </label>
              <span className="text-[11px] text-[#22c55e] flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-[#4ade80]" /> Auto-syncs fields
              </span>
            </div>
            <p className="text-[11.5px] text-[#9b8b85] leading-relaxed">
              Type your constraints here (e.g. <em>&quot;budget $140 per guest, max 4 miles radius, sound curfew at 10:30 PM, wheelchair accessible, gluten-free prep&quot;</em>). Relevant fields below will update automatically!
            </p>
            <textarea
              id="event-limitations-input"
              rows={4}
              value={limitations}
              onChange={(e) => handleLimitationsChange(e.target.value)}
              placeholder="Describe constraints: e.g. Maximum budget of $120 / guest; 5 miles radius from pavilion; sound curfew at 10:30 PM; dedicated gluten-free prep; ADA wheelchair ramp..."
              className="w-full px-3.5 py-2.5 bg-[#120b0a] border border-[#382721] rounded-xl text-white placeholder-[#685852] text-xs focus:outline-none focus:border-[#b8744b] focus:ring-1 focus:ring-[#b8744b] transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* 3. Budget Section: Cost by Attendee vs. Overall Budget */}
          <div className="p-4 rounded-xl bg-[#1e1513] border border-[#392822] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#a0928c] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#22c55e]" />
                Event Budget Calculation
              </label>

              {/* Toggle Mode: Cost per Attendee vs Overall Budget */}
              <div className="inline-flex p-1 rounded-xl bg-[#140d0c] border border-[#34241e] text-xs">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('per_guest')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    budgetMode === 'per_guest'
                      ? 'bg-[#b8744b] text-white shadow-sm'
                      : 'text-[#9e8f88] hover:text-white'
                  }`}
                >
                  Cost by Attendee ($/guest)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('overall')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    budgetMode === 'overall'
                      ? 'bg-[#b8744b] text-white shadow-sm'
                      : 'text-[#9e8f88] hover:text-white'
                  }`}
                >
                  Overall Budget ($ Total)
                </button>
              </div>
            </div>

            {/* Input based on selected budget mode */}
            {budgetMode === 'per_guest' ? (
              <div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[#22c55e] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    id="event-budget-per-guest-input"
                    required
                    value={perGuestValue}
                    onChange={(e) => handlePerGuestChange(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 120"
                    className="w-full pl-10 pr-24 py-2.5 bg-[#140d0c] border border-[#3e2c26] rounded-xl text-white placeholder-[#685852] text-sm focus:outline-none focus:border-[#b8744b] focus:ring-1 focus:ring-[#b8744b] transition-colors"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-[#9c8c85] font-medium pointer-events-none">
                    / guest
                  </span>
                </div>
                {/* Calculated Overall Preview */}
                <div className="flex items-center justify-between text-[11.5px] text-[#a0928c] mt-1.5 px-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#38bdf8]" />
                    For {attendeeCount} attendees:
                  </span>
                  <span className="font-bold text-[#4ade80]">
                    Total Budget: ${overallValue.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[#22c55e] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="number"
                    min="1"
                    step="10"
                    id="event-budget-overall-input"
                    required
                    value={overallValue}
                    onChange={(e) => handleOverallChange(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 2400"
                    className="w-full pl-10 pr-24 py-2.5 bg-[#140d0c] border border-[#3e2c26] rounded-xl text-white placeholder-[#685852] text-sm focus:outline-none focus:border-[#b8744b] focus:ring-1 focus:ring-[#b8744b] transition-colors"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-[#9c8c85] font-medium pointer-events-none">
                    Total
                  </span>
                </div>
                {/* Calculated Per-Guest Preview */}
                <div className="flex items-center justify-between text-[11.5px] text-[#a0928c] mt-1.5 px-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#38bdf8]" />
                    Divided across {attendeeCount} attendees:
                  </span>
                  <span className="font-bold text-[#4ade80]">
                    ${perGuestValue} / guest
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Event Address & Max Distance Radius in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="event-radius-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[#a0928c] mb-1.5"
              >
                Max Distance Radius <span className="text-[#e06c55]">*</span>
              </label>
              <div className="relative">
                <Navigation className="w-4 h-4 text-[#38bdf8] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  id="event-radius-input"
                  required
                  value={maxDistanceRadius}
                  onChange={(e) => setMaxDistanceRadius(e.target.value)}
                  placeholder="e.g. 5 miles"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#170f0e] border border-[#3e2c26] rounded-xl text-white placeholder-[#685852] text-sm focus:outline-none focus:border-[#b8744b] focus:ring-1 focus:ring-[#b8744b] transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="event-address-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[#a0928c] mb-1.5"
              >
                Address of Event <span className="text-[#e06c55]">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#d88c5e] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  id="event-address-input"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 450 Grand Ave, Suite 100"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#170f0e] border border-[#3e2c26] rounded-xl text-white placeholder-[#685852] text-sm focus:outline-none focus:border-[#b8744b] focus:ring-1 focus:ring-[#b8744b] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#362722] shrink-0">
            <button
              type="button"
              onClick={onClose}
              id="cancel-event-details-btn"
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#b5a7a1] hover:text-white hover:bg-[#32231e] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-event-details-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#b8744b] hover:bg-[#c98256] active:bg-[#a6653e] shadow-lg shadow-[#b8744b]/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save &amp; Re-evaluate Venues
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
