"use client";

import React from 'react';
import { LocationItem, MarkerVariableConfig } from '@/shared/lib/map-view-types';
import { Info, Filter } from 'lucide-react';

interface MapSidebarProps {
  locations: LocationItem[];
  selectedLocation: LocationItem | null;
  onSelectLocation: (location: LocationItem | null) => void;
  markerVariable: MarkerVariableConfig;
  activeFilterValue: string | null;
  onFilterChange: (value: string | null) => void;
  isOpen: boolean;
}

export const MapSidebar: React.FC<MapSidebarProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  markerVariable,
  activeFilterValue,
  onFilterChange,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      id="locations-sidebar"
      className="w-72 sm:w-80 h-full bg-[#ECE2D6] border-r border-[#D9C8B5] flex flex-col flex-shrink-0 z-20 shadow-sm text-[#2B170F] transition-all duration-300 overflow-hidden"
    >
      {/* Sidebar Top Section: Single Variable Indicator & Filter Chips */}
      <div className="p-4 border-b border-[#D9C8B5] bg-[#E3D3C1]/70">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7C5A48] flex items-center gap-1.5 font-serif">
            <Filter className="w-3.5 h-3.5 text-[#C15C3D]" />
            Marker Variable: {markerVariable.name}
          </span>
          <span className="text-[11px] font-medium text-[#523526] bg-[#FAF5EF] px-2 py-0.5 rounded-full border border-[#DFCEBD]">
            {locations.length} shown
          </span>
        </div>

        {/* Legend / Filter Chips (No variable switching option) */}
        <div className="space-y-1.5 bg-[#FAF5EF] p-2.5 rounded-xl border border-[#D9C8B5]">
          <div className="text-[11px] font-semibold text-[#6B5040] mb-1 flex items-center justify-between">
            <span>Filter by {markerVariable.name}:</span>
            {activeFilterValue && (
              <button
                onClick={() => onFilterChange(null)}
                className="text-[10px] text-[#C15C3D] hover:underline cursor-pointer font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onFilterChange(null)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilterValue === null
                  ? 'bg-[#C15C3D] text-white font-semibold shadow-xs'
                  : 'bg-[#EADDCF] text-[#523526] hover:bg-[#DFCDBB]'
              }`}
            >
              All
            </button>
            {markerVariable.legend.map((item) => {
              const isActive = activeFilterValue === item.value;
              return (
                <button
                  key={item.value}
                  id={`filter-chip-${item.value}`}
                  onClick={() =>
                    onFilterChange(isActive ? null : item.value)
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#C15C3D] text-white font-semibold shadow-xs'
                      : 'bg-[#EADDCF] text-[#523526] hover:bg-[#DFCDBB]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Locations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-[#7C5A48] px-1 pt-1 flex items-center justify-between font-serif">
          <span>Locations</span>
          <span className="text-[10px] lowercase text-[#8C6D5A] font-normal font-sans">
            click marker or card
          </span>
        </div>

        {locations.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#7C675B]">
            No locations match the active filter or search query.
          </div>
        ) : (
          locations.map((loc) => {
            const isSelected = selectedLocation?.id === loc.id;
            const markerColor = markerVariable.getColor(loc);
            const varValue = markerVariable.getValue(loc);

            return (
              <button
                key={loc.id}
                id={`sidebar-loc-${loc.id}`}
                onClick={() => onSelectLocation(loc)}
                className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer border flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-[#FAF5EF] shadow-md border-[#C15C3D] ring-2 ring-[#C15C3D]/25'
                    : 'bg-[#FAF5EF]/85 hover:bg-[#FAF5EF] border-[#DFCEBD] hover:border-[#D0B7A0] hover:shadow-xs'
                }`}
              >
                {/* Marker color dot */}
                <div className="pt-0.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block shadow-xs border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: markerColor }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold font-serif text-[#2B170F] truncate">
                    {loc.name}
                  </div>
                  <div className="text-[11px] text-[#6B5040] truncate mt-0.5">
                    {loc.line1.text}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: markerColor }}
                    >
                      {varValue}
                    </span>
                    <span className="text-[10px] text-[#8C6D5A] font-mono">
                      {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Instructions card at bottom */}
      <div className="p-3 bg-[#DFCEBC] border-t border-[#D9C8B5] text-[11px] text-[#5A4032]">
        <div className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 text-[#C15C3D] flex-shrink-0" />
          <p className="leading-snug">
            Click any icon to pop up location details in the menu card. Click map again to dismiss.
          </p>
        </div>
      </div>
    </aside>
  );
};

