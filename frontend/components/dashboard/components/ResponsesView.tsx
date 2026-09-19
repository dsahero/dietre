import React, { useState, useMemo } from 'react';
import { GuestResponse } from '../types';
import { Users, Search, ShieldAlert, Mail, ChevronRight, CheckCircle2, Flame } from 'lucide-react';

interface ResponsesViewProps {
  responses: GuestResponse[];
  onSelectResponse: (response: GuestResponse) => void;
}

const severityBadge = (severity: GuestResponse['severity']) => {
  switch (severity) {
    case 'high':
      return 'bg-[#ef4444]/15 text-[#c24134] border-[#ef4444]/40';
    case 'medium':
      return 'bg-[#f59e0b]/15 text-[#b45309] border-[#f59e0b]/40';
    default:
      return 'bg-[#38bdf8]/15 text-[#0284c7] border-[#38bdf8]/40';
  }
};

export const ResponsesView: React.FC<ResponsesViewProps> = ({ responses, onSelectResponse }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'zero-match' | 'high' | 'contact'>('all');

  const stats = useMemo(() => {
    return {
      total: responses.length,
      zeroMatch: responses.filter((r) => r.hasZeroMatch).length,
      high: responses.filter((r) => r.severity === 'high').length,
      withContact: responses.filter((r) => r.contactEmail).length,
    };
  }, [responses]);

  const filtered = useMemo(() => {
    return responses.filter((response) => {
      if (activeCategory === 'zero-match' && !response.hasZeroMatch) return false;
      if (activeCategory === 'high' && response.severity !== 'high') return false;
      if (activeCategory === 'contact' && !response.contactEmail) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          response.token.toLowerCase().includes(query) ||
          response.rawText.toLowerCase().includes(query) ||
          response.hardExcludes.some((rule) => rule.toLowerCase().includes(query)) ||
          response.softPreferences.some((rule) => rule.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [responses, activeCategory, searchQuery]);

  return (
    <div className="space-y-6" id="responses-view-container">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4" id="responses-kpi-row">
        <div className="rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4 shadow-2xs">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--dash-text-muted)] font-mono uppercase tracking-wider">
            <span>Responses In</span>
            <Users className="h-4 w-4 text-[var(--dash-accent)]" />
          </div>
          <div className="font-heading text-2xl font-bold tracking-tight text-[var(--dash-text)]">{stats.total}</div>
        </div>

        <div className="rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4 shadow-2xs">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--dash-text-muted)] font-mono uppercase tracking-wider">
            <span>Zero-Match Guests</span>
            <ShieldAlert className="h-4 w-4 text-[#ef4444]" />
          </div>
          <div className="font-heading text-2xl font-bold tracking-tight text-[#c24134]">{stats.zeroMatch}</div>
        </div>

        <div className="rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4 shadow-2xs">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--dash-text-muted)] font-mono uppercase tracking-wider">
            <span>High-Constraint</span>
            <Flame className="h-4 w-4 text-[#f59e0b]" />
          </div>
          <div className="font-heading text-2xl font-bold tracking-tight text-[#b45309]">{stats.high}</div>
        </div>

        <div className="rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4 shadow-2xs">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--dash-text-muted)] font-mono uppercase tracking-wider">
            <span>Left Contact Email</span>
            <Mail className="h-4 w-4 text-[var(--dash-accent)]" />
          </div>
          <div className="font-heading text-2xl font-bold tracking-tight text-[var(--dash-text)]">{stats.withContact}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3.5 sm:flex-row sm:items-center shadow-2xs">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--dash-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest token or rule text (e.g. peanuts, kosher, vegan)..."
            className="w-full rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] py-2 pl-10 pr-4 text-xs text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] font-serif transition-colors focus:border-[var(--dash-accent)] focus:outline-none shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap rounded-xs border px-3 py-1.5 font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
              activeCategory === 'all'
                ? 'border-[var(--dash-border)] bg-[var(--dash-accent)] text-white'
                : 'border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]'
            }`}
          >
            All ({responses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('zero-match')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xs border px-3 py-1.5 font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
              activeCategory === 'zero-match'
                ? 'border-[#ef4444]/60 bg-[#ef4444]/20 text-[#c24134]'
                : 'border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)] hover:text-[#c24134]'
            }`}
          >
            <ShieldAlert className="h-3 w-3 text-[#ef4444]" />
            Zero-Match ({stats.zeroMatch})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('high')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xs border px-3 py-1.5 font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
              activeCategory === 'high'
                ? 'border-[#f59e0b]/60 bg-[#f59e0b]/20 text-[#b45309]'
                : 'border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)] hover:text-[#b45309]'
            }`}
          >
            <Flame className="h-3 w-3 text-[#f59e0b]" />
            High-Constraint ({stats.high})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('contact')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xs border px-3 py-1.5 font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
              activeCategory === 'contact'
                ? 'border-[var(--dash-accent)] bg-[var(--dash-accent)]/15 text-[var(--dash-accent)]'
                : 'border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]'
            }`}
          >
            <Mail className="h-3 w-3 text-[var(--dash-accent)]" />
            Has Contact ({stats.withContact})
          </button>
        </div>
      </div>

      {/* Responses Table */}
      <div
        className="overflow-hidden rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] shadow-xs"
        id="responses-table-card"
      >
        <div className="flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-6 py-4">
          <div>
            <h3 className="font-heading text-lg font-bold tracking-tight text-[var(--dash-text)]">Guest Responses</h3>
            <p className="mt-0.5 text-xs text-[var(--dash-text-muted)] font-serif italic">
              Each guest is identified by a manifest token. Click a row to see their
              exact submitted words and parsed ingredient rules.
            </p>
          </div>
          <span className="font-mono text-[10.5px] rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-2.5 py-1 font-semibold text-[var(--dash-text-muted)]">
            Showing {filtered.length} of {responses.length}
          </span>
        </div>

        {responses.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-[var(--dash-text-muted)] font-serif italic">
            No responses recorded yet. Share the confidential guest link to begin collecting dietary profiles.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left" id="responses-table">
              <thead>
                <tr className="border-b border-[var(--dash-border)] bg-[var(--dash-surface)] text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  <th className="px-6 py-3.5">Guest</th>
                  <th className="px-4 py-3.5">Hard Restrictions</th>
                  <th className="px-4 py-3.5">Soft Preferences</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dash-border)] text-xs">
                {filtered.map((response) => (
                  <tr
                    key={response.id}
                    onClick={() => onSelectResponse(response)}
                    className="group cursor-pointer transition-colors hover:bg-[var(--dash-surface-hover)]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[var(--dash-text)] group-hover:text-[var(--dash-accent)]">
                          {response.token}
                        </span>
                        <span
                          className={`rounded-xs border px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase ${severityBadge(
                            response.severity
                          )}`}
                        >
                          {response.severity}
                        </span>
                        {response.hasZeroMatch && (
                          <span className="flex items-center gap-1 rounded-xs border border-[#ef4444]/40 bg-[#ef4444]/15 px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-[#c24134]">
                            <ShieldAlert className="h-2.5 w-2.5" /> No match
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="max-w-[240px] px-4 py-4">
                      {response.hardExcludes.length > 0 ? (
                        <div className="space-y-1">
                          {response.hardExcludes.slice(0, 2).map((rule, i) => (
                            <div key={i} className="flex items-center gap-1.5 truncate font-mono text-[11.5px] font-bold text-[#c24134]" title={rule}>
                              <span className="h-1.5 w-1.5 shrink-0 rounded-xs bg-[#ef4444]" />
                              <span className="truncate">{rule}</span>
                            </div>
                          ))}
                          {response.hardExcludes.length > 2 && (
                            <span className="font-mono text-[10px] font-semibold text-[#b91c1c]">
                              +{response.hardExcludes.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-serif text-[11px] italic text-[var(--dash-text-muted)]">None reported</span>
                      )}
                    </td>

                    <td className="max-w-[220px] px-4 py-4">
                      <div className="truncate font-serif text-[11.5px] text-[var(--dash-text-soft)]" title={response.softPreferences.join(', ')}>
                        {response.softPreferences[0] || 'No stated preference'}
                      </div>
                      {response.softPreferences[1] && (
                        <div className="mt-0.5 truncate font-serif text-[11px] text-[var(--dash-text-muted)]">
                          {response.softPreferences[1]}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {response.contactEmail ? (
                        <div className="flex items-center gap-1.5 font-serif text-xs text-[var(--dash-text)]">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
                          <span>Provided</span>
                        </div>
                      ) : (
                        <span className="font-serif text-[11px] italic text-[var(--dash-text-muted)]">Not provided</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectResponse(response);
                        }}
                        className="inline-flex items-center gap-1 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-1 font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)] shadow-2xs transition-all group-hover:border-[var(--dash-accent)] group-hover:bg-[var(--dash-accent)] group-hover:text-white"
                      >
                        <span>View</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
