import React from 'react';
import { NavItem } from '../types';
import { PanelLeftClose, UtensilsCrossed, Home, ChevronRight, Bookmark, Users, Map } from 'lucide-react';
import { ThemeToggleButton } from '@/frontend/components/theme-toggle-button';

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
  return (
    <>
      {/* Sidebar Container with Smooth Slide/Fold Transition */}
      <aside
        id="sidebar-navigation"
        className={`sidebar transition-all duration-300 ease-in-out z-30 flex flex-col justify-between shrink-0 bg-[var(--dash-bg)] border-r border-[var(--dash-border)] ${
          isCollapsed
            ? '-translate-x-full w-0 opacity-0 pointer-events-none p-0 overflow-hidden'
            : 'translate-x-0 w-[220px] opacity-100'
        }`}
        style={{
          boxShadow: isCollapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.35)',
        }}
        aria-hidden={isCollapsed}
      >
        <div className="pt-7 px-5">
          {/* Top Brand Header: Round Logo (Home Button) + Full Brand + Collapse Toggle */}
          <div className="flex items-center justify-between pb-6 mb-7 border-b border-[var(--dash-border)]">
            <div className="flex items-center gap-3">
              {/* Home button — a flat ink-stamped medallion, not a glowing gradient orb */}
              <button
                type="button"
                onClick={onGoHome}
                id="sidebar-home-logo-btn"
                title="Go to Home / Overview"
                className="group tilt-left relative flex h-11 w-11 items-center justify-center rounded-sm border border-[var(--dash-accent-deep)] bg-[var(--dash-accent)] shadow-sm transition-transform hover:-rotate-1 active:scale-95 cursor-pointer"
              >
                <UtensilsCrossed className="h-5 w-5 text-white transition-transform duration-300 group-hover:rotate-12" />
                {/* Floating mini home indicator */}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-sm border border-[var(--dash-bg)] bg-[var(--dash-accent-deep)] text-[9px] font-bold text-white">
                  <Home className="w-2.5 h-2.5" />
                </span>
              </button>

              {/* Full Logo Title & Subtitle */}
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-wider text-[var(--dash-text)] font-heading">
                  dietre
                </span>
                <span className="font-mono text-[9.5px] tracking-[0.16em] text-[var(--dash-text-muted)] uppercase font-semibold">
                  Banquet Ledger
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeToggleButton theme={theme} onToggle={onToggleTheme} label="dashboard" />
              {/* Fold/Slide Sidebar Left Toggle Button */}
              <button
                type="button"
                onClick={onToggleCollapse}
                id="collapse-sidebar-btn"
                title="Slide sidebar into left (Collapse)"
                className="w-8 h-8 rounded-sm flex items-center justify-center text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)] transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
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
                const renderIcon = () => {
                  switch (item.iconName || item.id) {
                    case 'shortlisted':
                    case 'bookmark':
                      return <Bookmark className={`w-4 h-4 ${isActive ? 'text-[var(--dash-accent)] fill-[var(--dash-accent)]/30' : 'text-[var(--dash-text-muted)]'}`} />;
                    case 'users':
                      return <Users className={`w-4 h-4 ${isActive ? 'text-[var(--dash-accent)]' : 'text-[var(--dash-text-muted)]'}`} />;
                    case 'map':
                      return <Map className={`w-4 h-4 ${isActive ? 'text-[var(--dash-accent)]' : 'text-[var(--dash-text-muted)]'}`} />;
                    case 'overview':
                    default:
                      return <UtensilsCrossed className={`w-4 h-4 ${isActive ? 'text-[var(--dash-accent)]' : 'text-[var(--dash-text-muted)]'}`} />;
                  }
                };

                return (
                  <li key={item.id} id={`nav-wrapper-${item.id}`}>
                    <button
                      type="button"
                      id={`nav-link-${item.id}`}
                      className={`nav-item w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-[13.5px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--dash-surface-raised)] text-[var(--dash-text)] font-heading font-semibold border-l-2 border-[var(--dash-accent)] shadow-2xs'
                          : 'text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)]'
                      }`}
                      onClick={() => onSelect(item.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        {renderIcon()}
                        <span className="font-heading">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-sm font-semibold ${
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
        <div className="p-4 m-3 rounded-sm bg-[var(--dash-surface)] border border-[var(--dash-border)] text-xs text-[var(--dash-text-muted)]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[var(--dash-text-soft)]">Status</span>
            <span className="flex items-center gap-1 text-[11px] text-[#22c55e]">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" /> Live Curation
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--dash-text-muted)]">
            Curating venues within event radius.
          </p>
        </div>
      </aside>

      {/* Reappear Button When Collapsed: Round Logo + Expand Arrow */}
      {isCollapsed && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-left duration-200">
          {/* Home button — flat medallion, matching the expanded sidebar's */}
          <button
            type="button"
            onClick={onGoHome}
            id="floating-home-logo-btn"
            title="Home / Overview"
            className="group tilt-left relative flex h-11 w-11 items-center justify-center rounded-sm border border-[var(--dash-accent-deep)] bg-[var(--dash-accent)] shadow-md transition-transform hover:-rotate-1 active:scale-95 cursor-pointer"
          >
            <UtensilsCrossed className="h-5 w-5 text-white" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-sm border border-[var(--dash-bg)] bg-[var(--dash-accent-deep)] text-[9px] font-bold text-white">
              <Home className="w-2.5 h-2.5" />
            </span>
          </button>

          {/* Re-appear / Expand Sidebar Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            id="reopen-sidebar-btn"
            title="Expand Sidebar"
            className="h-9 px-3 rounded-sm bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)] shadow-xs flex items-center gap-1.5 font-heading text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Menu</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
          </button>

          <ThemeToggleButton
            theme={theme}
            onToggle={onToggleTheme}
            label="dashboard"
            className="h-10 w-10 rounded-full bg-[var(--dash-surface)]/90 backdrop-blur-md shadow-lg"
          />
        </div>
      )}
    </>
  );
};
