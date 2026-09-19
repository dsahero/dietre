import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, ZoomIn, ZoomOut } from 'lucide-react';
import { RestaurantCardData } from '../types';

interface MapTabProps {
  event: { name: string; lat: number; lng: number; radiusMiles: number };
  restaurants: RestaurantCardData[];
  onSelectRestaurant: (restaurant: RestaurantCardData) => void;
}

function markerColor(restaurant: RestaurantCardData): string {
  if (!restaurant.withinRadius || !restaurant.withinBudget) return '#786a63';
  if (restaurant.matchPercentage >= 85) return '#22c55e';
  if (restaurant.matchPercentage >= 60) return '#eab308';
  return '#ef4444';
}

export const MapTab: React.FC<MapTabProps> = ({ event, restaurants, onSelectRestaurant }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Only plot venues within the event radius plus a reasonable buffer so the
  // map isn't cluttered with places nobody could realistically travel to.
  const visible = restaurants.filter((r) => r.distanceMiles <= event.radiusMiles * 1.5 + 1);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [event.lat, event.lng],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is initialized once; markers are synced in the effect below
  }, []);

  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();

    visible.forEach((restaurant) => {
      const color = markerColor(restaurant);
      const icon = L.divIcon({
        className: 'restaurant-pin',
        html: `
          <div style="width:26px;height:26px;transform:translate(-50%,-50%);cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <circle cx="12" cy="12" r="9" fill="${color}" stroke="#ffffff" stroke-width="2" />
            </svg>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([restaurant.lat, restaurant.lng], { icon });
      marker.bindTooltip(
        `${restaurant.name} · ${restaurant.matchPercentage}% (${restaurant.coveredCount}/${restaurant.totalResponses})`,
        { direction: 'top', offset: [0, -14] }
      );
      marker.on('click', () => onSelectRestaurant(restaurant));
      layer.addLayer(marker);
    });
  }, [visible, onSelectRestaurant]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-[#352520]"
      style={{ height: '640px' }}
      id="map-tab-container"
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="absolute bottom-5 right-5 z-[900] flex flex-col gap-1.5 rounded-xl border border-[#3a2822] bg-[#1c1210]/95 p-1.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom in"
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#cfc1ba] transition-colors hover:bg-[#2c1d18] hover:text-white cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom out"
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#cfc1ba] transition-colors hover:bg-[#2c1d18] hover:text-white cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="mx-1 h-px bg-[#3a2822]" />
        <button
          type="button"
          onClick={() => mapRef.current?.setView([event.lat, event.lng], 13, { animate: true })}
          title="Recenter on event"
          aria-label="Recenter on event"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#cfc1ba] transition-colors hover:bg-[#2c1d18] hover:text-white cursor-pointer"
        >
          <Compass className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-5 left-5 z-[900] flex items-center gap-3 rounded-xl border border-[#3a2822] bg-[#1c1210]/95 px-3.5 py-2 text-xs shadow-lg backdrop-blur-md">
        <span className="flex items-center gap-1.5 text-[#cfc1ba]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#b8744b' }} />
          Event
        </span>
        <span className="flex items-center gap-1.5 text-[#cfc1ba]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#22c55e' }} />
          Strong match
        </span>
        <span className="flex items-center gap-1.5 text-[#cfc1ba]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#eab308' }} />
          Partial match
        </span>
        <span className="flex items-center gap-1.5 text-[#cfc1ba]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} />
          Weak match
        </span>
        <span className="flex items-center gap-1.5 text-[#cfc1ba]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#786a63' }} />
          Outside radius/budget
        </span>
      </div>
    </div>
  );
};
