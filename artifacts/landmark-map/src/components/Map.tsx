import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import "leaflet/dist/leaflet.css";

// Fix default icon issue with Leaflet and Webpack/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { useDebounce } from '@/hooks/use-debounce';
import { useGetLandmarks, getGetLandmarksQueryKey } from '@workspace/api-client-react';
import { LandmarkSidebar } from './LandmarkSidebar';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapBoundsTracker({ setBounds }: { setBounds: (bounds: { north: number; south: number; east: number; west: number } | null) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    },
    zoomend: () => {
      const b = map.getBounds();
      setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
  }, [map, setBounds]);

  return null;
}

export function Map() {
  const [bounds, setBoundsState] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const setBounds = useCallback((b: { north: number; south: number; east: number; west: number } | null) => setBoundsState(b), []);
  const debouncedBounds = useDebounce(bounds, 500);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);

  const { data: landmarks = [], isLoading, isFetching } = useGetLandmarks(
    debouncedBounds || { north: 0, south: 0, east: 0, west: 0 },
    { 
      query: { 
        enabled: !!debouncedBounds,
        queryKey: getGetLandmarksQueryKey(debouncedBounds || { north: 0, south: 0, east: 0, west: 0 }) 
      } 
    }
  );

  return (
    <div className="relative w-full h-[100dvh] flex">
      <div className="flex-1 h-full relative z-0">
        <MapContainer
          center={[51.505, -0.09]} // Default to London
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBoundsTracker setBounds={setBounds} />
          
          {landmarks.map((landmark) => (
            <Marker
              key={landmark.pageId}
              position={[landmark.lat, landmark.lng]}
              eventHandlers={{
                click: () => setSelectedPageId(landmark.pageId),
              }}
            />
          ))}
        </MapContainer>
        
        {/* UI Overlay */}
        <div className="absolute top-4 left-4 z-[400] bg-card text-card-foreground shadow-md rounded-md px-4 py-2 flex items-center gap-2 border border-border">
          <span className="font-semibold text-sm font-sans tracking-wide uppercase">Visible Landmarks</span>
          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-mono">{landmarks.length}</span>
          {(isLoading || isFetching) && (
            <span className="text-xs text-muted-foreground ml-2 animate-pulse">Updating...</span>
          )}
        </div>
      </div>
      
      {/* Sidebar Overlay */}
      {selectedPageId && (
        <LandmarkSidebar pageId={selectedPageId} onClose={() => setSelectedPageId(null)} />
      )}
    </div>
  );
}
