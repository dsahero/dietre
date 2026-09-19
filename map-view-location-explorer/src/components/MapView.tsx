import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationItem, MarkerVariableConfig } from '../types';
import { LocationCard } from './LocationCard';
import { Compass, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface MapViewProps {
  locations: LocationItem[];
  selectedLocation: LocationItem | null;
  onSelectLocation: (location: LocationItem | null) => void;
  markerVariable: MarkerVariableConfig;
  initialCenter?: [number, number];
}

export const MapView: React.FC<MapViewProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  markerVariable,
  initialCenter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Mexico City center (Paseo de la Reforma area matching user reference mockup)
    const centerLat = initialCenter ? initialCenter[0] : 19.4310;
    const centerLng = initialCenter ? initialCenter[1] : -99.1620;
    const initialZoom = 14;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
    });

    // Clean voyager tiles matching the screenshot
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // "when the map is clicked again the menu card disappears"
    map.on('click', () => {
      onSelectLocation(null);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update center when initialCenter changes if map is already initialized and no location is selected
  useEffect(() => {
    if (initialCenter && mapInstanceRef.current && !selectedLocation) {
      mapInstanceRef.current.panTo(initialCenter, { animate: true, duration: 0.5 });
    }
  }, [initialCenter]);

  // Update markers when locations, selectedLocation, or markerVariable changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    locations.forEach((loc) => {
      const isSelected = selectedLocation?.id === loc.id;
      // Single marker color variable:
      const markerColor = markerVariable.getColor(loc);

      const size = isSelected ? 42 : 36;
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            position: relative;
            width: ${size}px;
            height: ${size * 1.3}px;
            transform: translate(-50%, -100%);
            cursor: pointer;
            filter: drop-shadow(0px 4px 6px rgba(61,44,36,0.35));
            transition: transform 0.15s ease-out;
          ">
            <svg viewBox="0 0 24 32" width="${size}" height="${size * 1.33}" style="display:block; overflow:visible;">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.627-5.373-12-12-12z" 
                    fill="${markerColor}" 
                    stroke="#ffffff" 
                    stroke-width="${isSelected ? '2.5' : '1.5'}" />
              <circle cx="12" cy="11.5" r="5.2" fill="#FAF5EF" fill-opacity="0.95" />
              <circle cx="12" cy="11.5" r="2.8" fill="${markerColor}" />
            </svg>
            ${
              isSelected
                ? `<div style="position:absolute; top:-8px; left:50%; transform:translateX(-50%); background:#C15C3D; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; white-space:nowrap; box-shadow:0 2px 5px rgba(61,44,36,0.35);">Selected</div>`
                : ''
            }
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

      // When icon is clicked, pop up location details in menu card
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectLocation(loc);
      });

      markersLayer.addLayer(marker);
    });
  }, [locations, selectedLocation, markerVariable, onSelectLocation]);

  // Center smoothly on selected location if chosen
  useEffect(() => {
    if (selectedLocation && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([selectedLocation.lat, selectedLocation.lng], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedLocation]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetView = () => {
    if (!mapInstanceRef.current || locations.length === 0) return;
    const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  };

  const activeVarColor = selectedLocation
    ? markerVariable.getColor(selectedLocation)
    : '#8B4538';

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-[#F7F2EB]">
      {/* Leaflet Map DOM Element */}
      <div
        id="interactive-map-container"
        ref={mapContainerRef}
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Location Menu Card: ONLY visible after a marker or location is clicked; never on first open */}
      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          onClose={() => onSelectLocation(null)}
          markerColor={activeVarColor}
        />
      )}

      {/* Map Zoom & Center Controls */}
      <div className="absolute bottom-6 right-6 z-[900] flex flex-col gap-2 bg-[#FAF5EF]/95 backdrop-blur-md rounded-xl shadow-lg border border-[#DFCEBD] p-1.5 pointer-events-auto">
        <button
          id="btn-zoom-in"
          onClick={handleZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#EFE5D8] text-[#523526] transition-colors cursor-pointer"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          id="btn-zoom-out"
          onClick={handleZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#EFE5D8] text-[#523526] transition-colors cursor-pointer"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="h-px bg-[#DFCEBD] my-0.5" />
        <button
          id="btn-reset-view"
          onClick={handleResetView}
          title="Fit all locations"
          aria-label="Fit all locations"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#EFE5D8] text-[#523526] transition-colors cursor-pointer"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom-left Status Indicator on the map */}
      <div
        id="map-status-legend"
        className="absolute bottom-6 left-6 z-[900] bg-[#FAF5EF]/95 backdrop-blur-md rounded-xl shadow-lg border border-[#DFCEBD] px-3.5 py-2 text-xs flex items-center gap-3 pointer-events-auto"
      >
        <span className="font-semibold font-serif text-[#2B170F] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#C15C3D]" />
          Status:
        </span>
        <div className="flex items-center gap-3">
          {markerVariable.legend.map((item) => (
            <div key={item.value} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block shadow-xs border border-black/10"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[#523526] font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
