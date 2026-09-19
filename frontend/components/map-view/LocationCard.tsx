"use client";

import React from 'react';
import { LocationItem } from '@/frontend/lib/map-view-types';
import { X } from 'lucide-react';

interface LocationCardProps {
  location: LocationItem;
  onClose: () => void;
  markerColor: string;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onClose,
  markerColor,
}) => {
  return (
    <div
      id="location-menu-card"
      onClick={(e) => {
        // Prevent map click from dismissing card when interacting with the card itself
        e.stopPropagation();
      }}
      className="absolute top-5 left-5 z-[1000] w-72 sm:w-80 rounded-2xl bg-[#FAF5EF] shadow-xl border border-[#DFCEBD] transition-all duration-200 animate-in fade-in zoom-in-95 pointer-events-auto select-text overflow-hidden"
      style={{
        boxShadow: '0 20px 30px -10px rgba(61, 44, 36, 0.25), 0 10px 15px -5px rgba(61, 44, 36, 0.15)',
      }}
    >
      {/* Top Image: takes up the top part of the frame, borderless and flush with the frame */}
      <div className="relative w-full h-40 bg-[#E8DDD0] overflow-hidden">
        <img
          src={location.image}
          alt={location.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Close button inside image top-right */}
        <button
          id="btn-close-card"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close details"
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-[#3D2C24]/75 text-white hover:bg-[#3D2C24] transition-colors shadow-md backdrop-blur-xs cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Variable badge overlay */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3D2C24]/80 backdrop-blur-xs text-[#FAF5EF] text-xs font-medium">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: markerColor }}
          />
          <span>{location.variableValue}</span>
        </div>
      </div>

      {/* Card Body with inner padding */}
      <div className="p-4 space-y-3">
        {/* Three lines of text each with a circle color indicator */}
        <div className="space-y-2.5">
          {/* Line 1 */}
          <div id="card-line-1" className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex-shrink-0 shadow-xs border border-black/10"
              style={{ backgroundColor: location.line1.color }}
              title={location.line1.label || 'Indicator 1'}
            />
            <div className="text-sm font-bold font-serif text-[#2B170F] truncate leading-snug">
              {location.line1.text}
            </div>
          </div>

          {/* Line 2 */}
          <div id="card-line-2" className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex-shrink-0 shadow-xs border border-black/10"
              style={{ backgroundColor: location.line2.color }}
              title={location.line2.label || 'Indicator 2'}
            />
            <div className="text-xs font-medium text-[#523526] truncate leading-snug">
              {location.line2.text}
            </div>
          </div>

          {/* Line 3 */}
          <div id="card-line-3" className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex-shrink-0 shadow-xs border border-black/10"
              style={{ backgroundColor: location.line3.color }}
              title={location.line3.label || 'Indicator 3'}
            />
            <div className="text-xs text-[#7C675B] truncate leading-snug">
              {location.line3.text}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-2.5 pt-2.5 border-t border-[#DFCEBD] flex items-center justify-between text-[11px] text-[#8C6D5A]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C15C3D]"></span>
            Click map to dismiss
          </span>
          <span className="font-mono text-[10px] text-[#8C6D5A]">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
};

