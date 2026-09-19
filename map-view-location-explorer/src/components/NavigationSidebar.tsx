import React from 'react';
import { NavigationTab } from '../types';
import {
  Map,
  MapPin,
  Layers,
  BarChart3,
  Clock,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface NavigationSidebarProps {
  tabs: NavigationTab[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Map: <Map className="w-5 h-5" />,
  MapPin: <MapPin className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  BarChart3: <BarChart3 className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  Sliders: <Sliders className="w-5 h-5" />,
};

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  tabs,
  activeTab,
  onSelectTab,
}) => {
  return (
    <aside
      id="navigation-tab-sidebar"
      aria-label="Navigation Tabs"
      className="w-16 md:w-56 h-full bg-[#E5D7C7] border-r border-[#D3C0AD] flex flex-col justify-between flex-shrink-0 z-25 select-none"
    >
      {/* Top Header / Tab Section */}
      <div className="flex flex-col py-3">
        {/* Section title (visible on desktop) */}
        <div className="hidden md:flex items-center justify-between px-4 pb-2 mb-1 border-b border-[#D3C0AD]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5A48]">
            Navigation Tabs
          </span>
          <span className="text-[10px] text-[#523526] bg-[#D6C2AF] px-1.5 py-0.5 rounded font-mono">
            Tabs
          </span>
        </div>

        {/* Tab Buttons */}
        <nav className="flex flex-col gap-1 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                title={tab.label}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[#C15C3D] text-white shadow-md'
                    : 'text-[#523526] hover:bg-[#D9C8B5] hover:text-[#2B170F]'
                }`}
              >
                {/* Active Indicator Bar on left for small screens */}
                {isActive && (
                  <span className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                )}

                <span
                  className={`flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-[#FFDEC9]' : 'text-[#7C5A48] group-hover:text-[#2B170F]'
                  }`}
                >
                  {ICON_MAP[tab.iconName] || <Map className="w-5 h-5" />}
                </span>

                {/* Tab label text (hidden on small icons-only screen) */}
                <span className="hidden md:inline truncate">{tab.label}</span>

                {/* Optional Badge */}
                {tab.badge && (
                  <span
                    className={`hidden md:inline-block ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-white/20 text-[#FFF2EA] border border-white/30'
                        : 'bg-[#D6C2AF] text-[#4A2F21]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status / Notice pill */}
      <div className="p-2 md:p-3 border-t border-[#D3C0AD] bg-[#DFCEBC]/50">
        <div className="hidden md:flex flex-col gap-1 text-[11px] text-[#6B5040] px-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#38261E]">
            <Sparkles className="w-3.5 h-3.5 text-[#C15C3D] flex-shrink-0" />
            <span>Navigation Hub</span>
          </div>
          <p className="text-[10px] text-[#7A6052] leading-tight">
            Use top header arrow to return to dashboard.
          </p>
        </div>
      </div>
    </aside>
  );
};
