import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Filter, Info, Menu, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { RestaurantCardData } from '../types';

interface MapTabProps {
  event: { name: string; lat: number; lng: number; radiusMiles: number };
  restaurants: RestaurantCardData[];
  onSelectRestaurant: (restaurant: RestaurantCardData) => void;
}

type MatchTier = 'strong' | 'partial' | 'weak' | 'outside';

const TIER_COLOR: Record<MatchTier, string> = {
  strong: '#22c55e',
  partial: '#eab308',
  weak: '#ef4444',
  outside: '#786a63',
};

const TIER_LABEL: Record<MatchTier, string> = {
  strong: 'Strong match',
  partial: 'Partial match',
  weak: 'Weak match',
  outside: 'Outside radius/budget',
};

function tierFor(restaurant: RestaurantCardData): MatchTier {
  if (!restaurant.withinRadius || !restaurant.withinBudget) return 'outside';
  if (restaurant.matchPercentage >= 85) return 'strong';
  if (restaurant.matchPercentage >= 60) return 'partial';
  return 'weak';
}

export const MapTab: React.FC<MapTabProps> = ({ event, restaurants, onSelectRestaurant }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MatchTier | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only venues within the event radius plus a reasonable buffer, so the
  // map isn't cluttered with places nobody could realistically travel to.
  const inRange = useMemo(
    () => restaurants.filter((r) => r.distanceMiles <= event.radiusMiles * 1.5 + 1),
    [restaurants, event.radiusMiles]
  );

  const visible = useMemo(() => {
    return inRange.filter((r) => {
      if (activeFilter && tierFor(r) !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q);
      }
      return true;
    });
  }, [inRange, activeFilter, searchQuery]);

  const selectRestaurant = (restaurant: RestaurantCardData) => {
    setSelectedId(restaurant.id);
    mapRef.current?.panTo([restaurant.lat, restaurant.lng], { animate: true });
    onSelectRestaurant(restaurant);
  };

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [event.lat, event.lng],
      zoom: 13,
      zoomControl: false,
    });

    // Standard OSM tiles — no API key, no anonymous-usage rate limiting
    // (CartoDB's free Voyager tiles started rendering "API key required"
    // watermarks under repeated local testing).
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);

    L.circle([event.lat, event.lng], {
      radius: event.radiusMiles * 1609.34,
      color: '#b8744b',
      weight: 1,
      fillColor: '#b8744b',
      fillOpacity: 0.06,
    }).addTo(map);

    const eventIcon = L.divIcon({
      className: 'event-pin',
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#b8744b;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([event.lat, event.lng], { icon: eventIcon })
      .addTo(map)
      .bindTooltip(event.name, { direction: 'top', offset: [0, -8] });

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is initialized once; markers sync in the effect below
  }, []);

  // Keep Leaflet markers in sync with the filtered restaurant list.
  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();

    visible.forEach((restaurant) => {
      const tier = tierFor(restaurant);
      const color = TIER_COLOR[tier];
      const isSelected = selectedId === restaurant.id;
      const size = isSelected ? 32 : 26;
      const icon = L.divIcon({
        className: 'restaurant-pin',
        html: `
          <div style="position:relative;width:${size}px;height:${size * 1.3}px;transform:translate(-50%,-100%);cursor:pointer;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.4))">
            <svg viewBox="0 0 24 32" width="${size}" height="${size * 1.33}" style="display:block;overflow:visible;">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.627-5.373-12-12-12z"
                    fill="${color}" stroke="#ffffff" stroke-width="${isSelected ? '2.5' : '1.5'}" />
              <circle cx="12" cy="11.5" r="5.2" fill="#FAF5EF" fill-opacity="0.95" />
              <circle cx="12" cy="11.5" r="2.8" fill="${color}" />
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([restaurant.lat, restaurant.lng], { icon });
      marker.bindTooltip(
        `${restaurant.name} · ${restaurant.matchPercentage}% (${restaurant.coveredCount}/${restaurant.totalResponses})`,
        { direction: 'top', offset: [0, -size] }
      );
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectRestaurant(restaurant);
      });
      layer.addLayer(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectRestaurant is stable enough for this sync effect
  }, [visible, selectedId]);

  const filterCounts = useMemo(() => {
    const counts: Record<MatchTier, number> = { strong: 0, partial: 0, weak: 0, outside: 0 };
    inRange.forEach((r) => counts[tierFor(r)]++);
    return counts;
  }, [inRange]);

  return (
    <div
      className="flex h-[720px] overflow-hidden rounded-2xl border border-[#352520]"
      id="map-tab-container"
    >
      {/* Locations sidebar */}
      {isSidebarOpen && (
        <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-[#352520] bg-[#1c1310] sm:w-80">
          <div className="border-b border-[#352520] bg-[#231a17] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#cca152]">
                <Filter className="h-3.5 w-3.5 text-[#b8744b]" />
                Match Quality
              </span>
              <span className="rounded-full border border-[#3d2a23] bg-[#170f0e] px-2 py-0.5 text-[11px] font-medium text-[#cfc1ba]">
                {visible.length} shown
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  activeFilter === null
                    ? 'bg-[#b8744b] font-semibold text-white shadow-xs'
                    : 'bg-[#2a1d19] text-[#cfc1ba] hover:bg-[#382621]'
                }`}
              >
                All ({inRange.length})
              </button>
              {(Object.keys(TIER_LABEL) as MatchTier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === tier ? null : tier)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    activeFilter === tier
                      ? 'bg-[#b8744b] font-semibold text-white shadow-xs'
                      : 'bg-[#2a1d19] text-[#cfc1ba] hover:bg-[#382621]'
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TIER_COLOR[tier] }} />
                  <span>{TIER_LABEL[tier]} ({filterCounts[tier]})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {visible.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8e7e78]">
                No restaurants match the current filter or search.
              </div>
            ) : (
              visible.map((restaurant) => {
                const tier = tierFor(restaurant);
                const isSelected = selectedId === restaurant.id;
                return (
                  <button
                    key={restaurant.id}
                    type="button"
                    onClick={() => selectRestaurant(restaurant)}
                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#b8744b] bg-[#231a17] shadow-md ring-2 ring-[#b8744b]/30'
                        : 'border-[#352520] bg-[#1a1210] hover:border-[#4a342b] hover:bg-[#201512]'
                    }`}
                  >
                    <span
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-black/20 shadow-xs"
                      style={{ backgroundColor: TIER_COLOR[tier] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-white">{restaurant.name}</div>
                      <div className="truncate text-[11px] text-[#9b8b84]">{restaurant.cuisine}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: TIER_COLOR[tier] }}
                        >
                          {restaurant.matchPercentage}%
                        </span>
                        <span className="font-mono text-[10px] text-[#8e7e78]">{restaurant.distanceMiles} mi</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-[#352520] bg-[#201512] p-3 text-[11px] text-[#9b8b84]">
            <div className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b8744b]" />
              <p className="leading-snug">Click a card or a pin to open its full match details.</p>
            </div>
          </div>
        </aside>
      )}

      {/* Map area */}
      <div className="relative flex-1">
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-[900] flex items-center justify-between gap-3 border-b border-[#352520] bg-[#1c1210]/95 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              className="cursor-pointer rounded-lg p-1.5 text-[#cfc1ba] transition-colors hover:bg-[#2c1d18] hover:text-white"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-xs text-[#9b8b84]">
              {inRange.length} restaurant{inRange.length === 1 ? '' : 's'} near {event.name}
            </span>
          </div>

          <div className="relative w-40 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#786a63]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full rounded-lg border border-[#3a2822] bg-[#170f0e] py-1.5 pl-8 pr-3 text-xs text-white placeholder-[#786a63] transition-colors focus:border-[#b8744b] focus:outline-none"
            />
          </div>
        </div>

        <div ref={containerRef} className="absolute inset-0 z-0" />

        <div className="absolute bottom-5 right-5 z-[900] flex flex-col gap-1.5 rounded-xl border border-[#3a2822] bg-[#1c1210]/95 p-1.5 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            title="Zoom in"
            aria-label="Zoom in"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#cfc1ba] transition-colors hover:bg-[#2c1d18] hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            title="Zoom out"
            aria-label="Zoom out"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#cfc1ba] transition-colors hover:bg-[#2c1d18] hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="mx-1 h-px bg-[#3a2822]" />
          <button
            type="button"
            onClick={() => mapRef.current?.setView([event.lat, event.lng], 13, { animate: true })}
            title="Recenter on event"
            aria-label="Recenter on event"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#cfc1ba] transition-colors hover:bg-[#2c1d18] hover:text-white"
          >
            <Compass className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute bottom-5 left-5 z-[900] flex flex-wrap items-center gap-3 rounded-xl border border-[#3a2822] bg-[#1c1210]/95 px-3.5 py-2 text-xs shadow-lg backdrop-blur-md">
          <span className="flex items-center gap-1.5 text-[#cfc1ba]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#b8744b' }} />
            Event
          </span>
          {(Object.keys(TIER_LABEL) as MatchTier[]).map((tier) => (
            <span key={tier} className="flex items-center gap-1.5 text-[#cfc1ba]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLOR[tier] }} />
              {TIER_LABEL[tier]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
