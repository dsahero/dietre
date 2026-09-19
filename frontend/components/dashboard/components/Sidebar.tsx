import React from 'react';
import { NavItem } from '../types';
import { PanelLeftClose, ChevronRight, Bookmark, Users, Compass, Utensils } from 'lucide-react';
import { ThemeToggleButton } from '@/frontend/components/theme-toggle-button';
import { DietreLogo } from '@/frontend/components/dietre-logo';

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
        className={`sidebar transition-all duration-300 ease-in-out z-30 flex flex-col justify-between shrink-0 ${
          isCollapsed
            ? '-translate-x-full w-0 opacity-0 pointer-events-none p-0 overflow-hidden'
            : 'translate-x-0 w-[220px] opacity-100'
        }`}
        style={{
          boxShadow: isCollapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.25)',
        }}
        aria-hidden={isCollapsed}
      >
        <div className="pt-7 px-5">
          {/* Top Brand Header: Single Considered Wordmark using dietre.svg without stacked icons or duplicate text */}
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-dashed border-[var(--dash-border)]">
            <button
              type="button"
              onClick={onGoHome}
              id="sidebar-home-logo-btn"
              title="dietre — Return to Ledger"
              className="group flex items-center justify-start py-1 transition-opacity hover:opacity-85 active:scale-98 cursor-pointer"
            >
              <DietreLogo className="h-7 w-auto text-[var(--dash-text)] transition-colors group-hover:text-[var(--dash-accent)]" />
            </button>

            <div className="flex items-center gap-1">
              <ThemeToggleButton theme={theme} onToggle={onToggleTheme} label="dashboard" />
              {/* Fold/Slide Sidebar Left Toggle Button */}
              <button
                type="button"
                onClick={onToggleCollapse}
                id="collapse-sidebar-btn"
                title="Slide sidebar into left (Collapse)"
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

          {/* Sidebar Navigation Items with hand-adjusted stroke weight and warm character */}
          <nav className="sidebar-nav" id="sidebar-nav">
            <ul id="nav-list" className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = item.id === activeId;
                const renderIcon = () => {
                  switch (item.iconName || item.id) {
                    case 'shortlisted':
                    case 'bookmark':
                      return (
                        <Bookmark
                          className={`w-3.5 h-3.5 transition-colors ${
                            isActive
                              ? 'text-[var(--dash-accent)] fill-[var(--dash-accent)]/25 stroke-[1.6]'
                              : 'text-[var(--dash-text-muted)] stroke-[1.4]'
                          }`}
                        />
                      );
                    case 'users':
                      return (
                        <Users
                          className={`w-3.5 h-3.5 transition-colors ${
                            isActive ? 'text-[var(--dash-accent)] stroke-[1.6]' : 'text-[var(--dash-text-muted)] stroke-[1.4]'
                          }`}
                        />
                      );
                    case 'map':
                      return (
                        <Compass
                          className={`w-3.5 h-3.5 transition-colors ${
                            isActive ? 'text-[var(--dash-accent)] stroke-[1.6]' : 'text-[var(--dash-text-muted)] stroke-[1.4]'
                          }`}
                        />
                      );
                    case 'overview':
                    default:
                      return (
                        <Utensils
                          className={`w-3.5 h-3.5 transition-colors ${
                            isActive ? 'text-[var(--dash-accent)] stroke-[1.6]' : 'text-[var(--dash-text-muted)] stroke-[1.4]'
                          }`}
                        />
                      );
                  }
                };

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
                        {renderIcon()}
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
        <div className="p-3.5 m-3 rounded-xs bg-[var(--dash-surface-raised)] border border-dashed border-[var(--dash-border)] text-xs text-[var(--dash-text-muted)]">
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
      </aside>

      {/* Reappear Button When Collapsed: Single considered dietre mark without stacked utensil house badge */}
      {isCollapsed && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-left duration-200">
          <button
            type="button"
            onClick={onGoHome}
            id="floating-home-logo-btn"
            title="dietre — Overview"
            className="group flex h-9 px-2.5 items-center justify-center rounded-xs border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] shadow-md transition-all hover:border-[var(--dash-accent)] hover:bg-[var(--dash-surface-hover)] active:scale-95 cursor-pointer"
          >
            <DietreLogo className="h-5 w-auto text-[var(--dash-text)] transition-colors group-hover:text-[var(--dash-accent)]" />
          </button>

          {/* Re-appear / Expand Sidebar Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            id="reopen-sidebar-btn"
            title="Expand Sidebar"
            className="h-9 px-2.5 rounded-xs bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)] shadow-xs flex items-center gap-1 font-heading text-xs font-semibold transition-all cursor-pointer"
          >
            <span className="font-serif text-xs">Menu</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--dash-accent)] stroke-[1.75]" />
          </button>

          <ThemeToggleButton
            theme={theme}
            onToggle={onToggleTheme}
            label="dashboard"
            className="h-9 w-9 rounded-full bg-[var(--dash-surface)]/90 backdrop-blur-md shadow-md"
          />
        </div>
      )}
    </>
  );
};
