import React from 'react';
import { NavItem } from '../types';
import { PanelLeftClose, UtensilsCrossed, Home, ChevronRight, Bookmark, Users, Map } from 'lucide-react';

interface SidebarProps {
  navItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  workspaceTitle?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onGoHome: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  activeId,
  onSelect,
  workspaceTitle = 'WORKSPACE',
  isCollapsed,
  onToggleCollapse,
  onGoHome,
}) => {
  return (
    <>
      {/* Sidebar Container with Smooth Slide/Fold Transition */}
      <aside
        id="sidebar-navigation"
        className={`sidebar transition-all duration-300 ease-in-out z-30 flex flex-col justify-between shrink-0 bg-[#160f0d] border-r border-[#2a1e1a] ${
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
          <div className="flex items-center justify-between pb-6 mb-7 border-b border-[#2e201b]">
            <div className="flex items-center gap-3">
              {/* Round Logo Home Button */}
              <button
                type="button"
                onClick={onGoHome}
                id="sidebar-home-logo-btn"
                title="Go to Home / Overview"
                className="group relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d98b58] via-[#b8744b] to-[#733f20] p-0.5 shadow-md shadow-[#b8744b]/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
              >
                <div className="w-full h-full rounded-full bg-[#1a1210] flex items-center justify-center border border-[#e29b6e]/40 group-hover:bg-[#241714] transition-colors">
                  <UtensilsCrossed className="w-5 h-5 text-[#f4ba95] group-hover:rotate-12 transition-transform duration-300" />
                </div>
                {/* Floating mini home indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#b8744b] border border-[#1a1210] flex items-center justify-center text-[9px] text-white font-bold">
                  <Home className="w-2.5 h-2.5" />
                </span>
              </button>

              {/* Full Logo Title & Subtitle */}
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-wider text-white uppercase font-serif">
                  DietRe
                </span>
                <span className="text-[10px] tracking-widest text-[#a8958c] uppercase font-semibold">
                  Event Dashboard
                </span>
              </div>
            </div>

            {/* Fold/Slide Sidebar Left Toggle Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              id="collapse-sidebar-btn"
              title="Slide sidebar into left (Collapse)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8e7e78] hover:text-white hover:bg-[#291b17] transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Section Header: WORKSPACE */}
          <div className="workspace-label" id="workspace-title">
            {workspaceTitle}
          </div>

          {/* Sidebar Navigation Items */}
          <nav className="sidebar-nav" id="sidebar-nav">
            <ul id="nav-list" className="space-y-2">
              {navItems.map((item) => {
                const isActive = item.id === activeId;
                const renderIcon = () => {
                  switch (item.iconName || item.id) {
                    case 'shortlisted':
                    case 'bookmark':
                      return <Bookmark className={`w-4 h-4 ${isActive ? 'text-[#e29b6e] fill-[#e29b6e]/30' : 'text-[#887872]'}`} />;
                    case 'users':
                      return <Users className={`w-4 h-4 ${isActive ? 'text-[#e29b6e]' : 'text-[#887872]'}`} />;
                    case 'map':
                      return <Map className={`w-4 h-4 ${isActive ? 'text-[#e29b6e]' : 'text-[#887872]'}`} />;
                    case 'overview':
                    default:
                      return <UtensilsCrossed className={`w-4 h-4 ${isActive ? 'text-[#e29b6e]' : 'text-[#887872]'}`} />;
                  }
                };

                return (
                  <li key={item.id} id={`nav-wrapper-${item.id}`}>
                    <button
                      type="button"
                      id={`nav-link-${item.id}`}
                      className={`nav-item w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#291c18] text-[#f7ece8] font-semibold border-l-2 border-[#b8744b]'
                          : 'text-[#94847e] hover:text-white hover:bg-[#201512]'
                      }`}
                      onClick={() => onSelect(item.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        {renderIcon()}
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${
                            isActive
                              ? 'bg-[#b8744b] text-white'
                              : 'bg-[#3d2720] text-[#d68b5e]'
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
        <div className="p-4 m-3 rounded-xl bg-[#201512] border border-[#2d1e19] text-xs text-[#8e7e78]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[#d4c8c2]">Status</span>
            <span className="flex items-center gap-1 text-[11px] text-[#22c55e]">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" /> Live Curation
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#94847e]">
            Curating venues within event radius.
          </p>
        </div>
      </aside>

      {/* Reappear Button When Collapsed: Round Logo + Expand Arrow */}
      {isCollapsed && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-left duration-200">
          {/* Round Logo Home Button */}
          <button
            type="button"
            onClick={onGoHome}
            id="floating-home-logo-btn"
            title="Home / Overview"
            className="group relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d98b58] via-[#b8744b] to-[#733f20] p-0.5 shadow-xl shadow-black/50 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
          >
            <div className="w-full h-full rounded-full bg-[#1a1210] flex items-center justify-center border border-[#e29b6e]/40 group-hover:bg-[#241714] transition-colors">
              <UtensilsCrossed className="w-5 h-5 text-[#f4ba95]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#b8744b] border border-[#1a1210] flex items-center justify-center text-[9px] text-white font-bold">
              <Home className="w-2.5 h-2.5" />
            </span>
          </button>

          {/* Re-appear / Expand Sidebar Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            id="reopen-sidebar-btn"
            title="Expand Sidebar"
            className="h-10 px-3 rounded-full bg-[#231a17]/90 backdrop-blur-md border border-[#43322b] text-[#c7b9b3] hover:text-white hover:bg-[#32231e] shadow-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Menu</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#b8744b]" />
          </button>
        </div>
      )}
    </>
  );
};
