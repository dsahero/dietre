import React from 'react';
import { NavItem } from '../types';
import { PanelLeftClose, ChevronRight, Bookmark, Users, Compass, Utensils } from 'lucide-react';
import { ThemeToggleButton } from '@/frontend/components/theme-toggle-button';
import { DietreLogo, DIETRE_CHROME_LOGO_CLASS } from '@/frontend/components/dietre-logo';

interface SidebarProps {
  navItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  workspaceTitle?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onGoHome: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  activeId,
  onSelect,
  workspaceTitle = 'WORKSPACE',
  isCollapsed,
  onToggleCollapse,
  onGoHome,
  theme,
  onToggleTheme,
}) => {
  const renderNavIcon = (item: NavItem, isActive: boolean) => {
    switch (item.iconName || item.id) {
      case 'shortlisted':
      case 'bookmark':
        return (
          <Bookmark
            className={`w-4 h-4 transition-colors ${
              isActive
                ? 'text-[var(--dash-accent)] fill-[var(--dash-accent)]/25 stroke-[1.75]'
                : 'text-[var(--dash-text-muted)] stroke-[1.5]'
            }`}
          />
        );
      case 'users':
        return (
          <Users
            className={`w-4 h-4 transition-colors ${
              isActive ? 'text-[var(--dash-accent)] stroke-[1.75]' : 'text-[var(--dash-text-muted)] stroke-[1.5]'
            }`}
          />
        );
      case 'map':
        return (
          <Compass
            className={`w-4 h-4 transition-colors ${
              isActive ? 'text-[var(--dash-accent)] stroke-[1.75]' : 'text-[var(--dash-text-muted)] stroke-[1.5]'
            }`}
          />
        );
      case 'overview':
      default:
        return (
          <Utensils
            className={`w-4 h-4 transition-colors ${
              isActive ? 'text-[var(--dash-accent)] stroke-[1.75]' : 'text-[var(--dash-text-muted)] stroke-[1.5]'
            }`}
          />
        );
    }
  };

  return (
    <>
      {/* Mobile-only scrim behind the drawer (see the max-width: 880px rules
          in dashboard.css) — tapping it closes the menu, same as the
          collapse button. Invisible/inert above that breakpoint. */}
      <div
        className={`sidebar-backdrop ${isCollapsed ? '' : 'is-open'}`}
        onClick={onToggleCollapse}
        aria-hidden="true"
      />

      {/* Sidebar Container with Smooth Slide/Fold Transition */}
      <aside
        id="sidebar-navigation"
        data-collapsed={isCollapsed}
        className={`sidebar transition-all duration-300 ease-in-out z-30 flex flex-col justify-between shrink-0 ${
          isCollapsed ? 'w-[68px] min-w-[68px]' : 'w-[220px] min-w-[220px]'
        }`}
        style={{
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        {isCollapsed ? (
          /* Collapsed Icon-Only View (68px wide, stays in flex flow, does NOT cover text) */
          <div className="px-2 flex flex-col items-center justify-between h-full space-y-6">
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Home / Logo Icon Button — h-16 row matches events list top chrome */}
              <button
                type="button"
                onClick={onGoHome}
                id="sidebar-collapsed-logo-btn"
                title="dietre — Return to Events"
                className="group h-16 flex items-center justify-center rounded-xs hover:bg-[var(--dash-surface-hover)] transition-colors cursor-pointer"
              >
                <DietreLogo className={`${DIETRE_CHROME_LOGO_CLASS} text-[var(--dash-text)] transition-colors group-hover:text-[var(--dash-accent)]`} />
              </button>

              {/* Expand Sidebar Button */}
              <button
                type="button"
                onClick={onToggleCollapse}
                id="expand-sidebar-btn"
                title="Expand Sidebar"
                className="w-8 h-8 rounded-xs flex items-center justify-center text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)] border border-[var(--dash-border)] transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronRight className="w-4 h-4 text-[var(--dash-accent)] stroke-[1.75]" />
              </button>

              <ThemeToggleButton theme={theme} onToggle={onToggleTheme} label="dashboard" />

              <div className="w-full border-b border-dashed border-[var(--dash-border)] my-1" />

              {/* Icon Navigation Items */}
              <nav className="flex flex-col items-center gap-2.5 w-full">
                {navItems.map((item) => {
                  const isActive = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`collapsed-nav-link-${item.id}`}
                      onClick={() => onSelect(item.id)}
                      title={`${item.label} ${item.badge ? `(${item.badge})` : ''}`}
                      className={`relative w-10 h-10 rounded-xs flex items-center justify-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--dash-surface-raised)] text-[var(--dash-accent)] border border-[var(--dash-accent)] shadow-2xs'
                          : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)]'
                      }`}
                    >
                      {renderNavIcon(item, isActive)}
                      {item.badge && item.badge !== '0' && (
                        <span className="absolute -top-1 -right-1 font-mono text-[9px] px-1 py-0.2 rounded-full font-bold bg-[var(--dash-accent)] text-white shadow-2xs">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Status Dot */}
            <div className="pt-2" title="Status: Live Curation">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse block" />
            </div>
          </div>
        ) : (
          /* Expanded Full-Width View (220px wide) */
          <div className="flex flex-col justify-between h-full px-6 pb-3">
            <div>
              {/* Top Brand Header — h-16 + px-6 matches events list top chrome */}
              <div className="flex h-16 items-center justify-between mb-4 border-b border-dashed border-[var(--dash-border)]">
                <button
                  type="button"
                  onClick={onGoHome}
                  id="sidebar-home-logo-btn"
                  title="dietre — Return to Events"
                  className="group flex items-center justify-start transition-opacity hover:opacity-85 active:scale-98 cursor-pointer"
                >
                  <DietreLogo className={`${DIETRE_CHROME_LOGO_CLASS} text-[var(--dash-text)] transition-colors group-hover:text-[var(--dash-accent)]`} />
                </button>

                <div className="flex items-center gap-1">
                  <ThemeToggleButton theme={theme} onToggle={onToggleTheme} label="dashboard" />
                  {/* Fold/Slide Sidebar Left Toggle Button */}
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    id="collapse-sidebar-btn"
                    title="Collapse Sidebar"
                    className="w-7 h-7 rounded-xs flex items-center justify-center text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)] transition-colors cursor-pointer"
                  >
                    <PanelLeftClose className="w-3.5 h-3.5 stroke-[1.5]" />
                  </button>
                </div>
              </div>

              {/* Section Header: WORKSPACE */}
              <div className="workspace-label font-mono uppercase tracking-[0.2em] text-[10px] text-[var(--dash-text-muted)]" id="workspace-title">
                {workspaceTitle}
              </div>

              {/* Sidebar Navigation Items */}
              <nav className="sidebar-nav" id="sidebar-nav">
                <ul id="nav-list" className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                      <li key={item.id} id={`nav-wrapper-${item.id}`}>
                        <button
                          type="button"
                          id={`nav-link-${item.id}`}
                          className={`nav-item w-full flex items-center justify-between px-3 py-2 rounded-xs text-[13px] font-medium transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[var(--dash-surface-raised)] text-[var(--dash-text)] font-heading font-semibold border-l-2 border-[var(--dash-accent)] shadow-2xs'
                              : 'text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)]'
                          }`}
                          onClick={() => onSelect(item.id)}
                        >
                          <div className="flex items-center gap-2.5">
                            {renderNavIcon(item, isActive)}
                            <span className="font-heading tracking-[-0.01em]">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`font-mono text-[9.5px] px-1.5 py-0.2 rounded-xs font-semibold ${
                                isActive
                                  ? 'bg-[var(--dash-accent)] text-white shadow-2xs'
                                  : 'bg-[var(--dash-surface-hover)] text-[var(--dash-accent-soft)] border border-[var(--dash-border)]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {/* Sidebar Footer: Quick Info */}
            <div className="p-3.5 m-1 rounded-xs bg-[var(--dash-surface-raised)] border border-dashed border-[var(--dash-border)] text-xs text-[var(--dash-text-muted)]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[var(--dash-text-soft)] font-heading text-[11px]">Status</span>
                <span className="flex items-center gap-1 text-[10.5px] text-[#22c55e] font-serif italic">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" /> Live Curation
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--dash-text-muted)] font-serif italic">
                Active venues within event radius.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
