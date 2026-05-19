import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import "leaflet/dist/leaflet.css";

import { useDebounce } from '@/hooks/use-debounce';
import { useFavorites } from '@/hooks/use-favorites';
import { useSaved } from '@/hooks/use-saved';
import { useGetLandmarks, getGetLandmarksQueryKey } from '@workspace/api-client-react';
import { LandmarkSidebar } from './LandmarkSidebar';
import { ExplorePanel } from './ExplorePanel';
import { SearchBar, SearchBarController } from './SearchBar';
import { MapPin, Compass, Heart, Bookmark, Loader2 } from 'lucide-react';
import type { Landmark } from '@workspace/api-client-react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function createCustomIcon(isFavorite: boolean, isSelected: boolean) {
  const color = isSelected ? '#2dd4bf' : isFavorite ? '#fb7185' : '#60a5fa';
  const size = isSelected ? 36 : 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <path d="M12 21 C12 21 5 14 5 9.5 A7 7 0 0 1 19 9.5 C19 14 12 21 12 21Z" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="12" cy="9.5" r="3" fill="rgba(255,255,255,0.9)"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

type BoundsType = { north: number; south: number; east: number; west: number };
type PanelType = 'explore' | 'favorites' | 'saved' | null;

function MapBoundsTracker({ setBounds }: { setBounds: (b: BoundsType) => void }) {
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
  const [bounds, setBoundsState] = useState<BoundsType | null>(null);
  const setBounds = useCallback((b: BoundsType) => setBoundsState(b), []);
  const debouncedBounds = useDebounce(bounds, 600);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);

  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const { saved, save, remove: removeSaved, isSaved } = useSaved();

  const { data: landmarks = [], isLoading, isFetching } = useGetLandmarks(
    debouncedBounds ?? { north: 0, south: 0, east: 0, west: 0 },
    {
      query: {
        enabled: !!debouncedBounds,
        queryKey: getGetLandmarksQueryKey(debouncedBounds ?? { north: 0, south: 0, east: 0, west: 0 }),
      },
    }
  );

  const handleNavClick = (panel: PanelType) => {
    setActivePanel(prev => (prev === panel ? null : panel));
  };

  const handleMarkerClick = (pageId: number) => {
    setSelectedPageId(pageId);
    setActivePanel(null);
  };

  return (
    <div className="relative w-full h-[100dvh] flex overflow-hidden">
      {/* Left nav bar */}
      <div className="flex flex-col items-center gap-1 w-12 h-full bg-card border-r border-border z-[600] shrink-0 pt-3 pb-3">
        <div className="mb-3 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
          <Compass className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <NavButton
            icon={<MapPin className="w-4 h-4" />}
            label="Explore"
            active={activePanel === 'explore'}
            onClick={() => handleNavClick('explore')}
          />
          <NavButton
            icon={<Heart className="w-4 h-4" />}
            label="Favorites"
            active={activePanel === 'favorites'}
            badge={favorites.size > 0 ? favorites.size : undefined}
            onClick={() => handleNavClick('favorites')}
          />
          <NavButton
            icon={<Bookmark className="w-4 h-4" />}
            label="Saved"
            active={activePanel === 'saved'}
            badge={saved.length > 0 ? saved.length : undefined}
            onClick={() => handleNavClick('saved')}
          />
        </div>

        <div className="flex flex-col items-center gap-0.5 pb-1">
          {(isLoading || isFetching) ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          ) : (
            <span className="text-xs font-bold text-primary tabular-nums">{landmarks.length}</span>
          )}
          <span className="text-[9px] text-muted-foreground leading-none text-center">visible</span>
        </div>
      </div>

      {/* Explore / Favorites / Saved panel */}
      {activePanel && (
        <ExplorePanel
          tab={activePanel}
          landmarks={landmarks}
          favoriteIds={favorites}
          savedLandmarks={saved}
          isLoading={isLoading || isFetching}
          onSelect={handleMarkerClick}
          onClose={() => setActivePanel(null)}
          onToggleFavorite={toggleFavorite}
          onRemoveSaved={removeSaved}
        />
      )}

      {/* Map */}
      <div className="flex-1 h-full relative z-0">
        <MapContainer
          center={[51.505, -0.09]}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            subdomains="abcd"
            maxZoom={19}
          />
          <MapBoundsTracker setBounds={setBounds} />
          <SearchBarController flyTarget={flyTarget} />

          {landmarks.map((landmark) => (
            <Marker
              key={landmark.pageId}
              position={[landmark.lat, landmark.lng]}
              icon={createCustomIcon(isFavorite(landmark.pageId), selectedPageId === landmark.pageId)}
              eventHandlers={{
                click: () => handleMarkerClick(landmark.pageId),
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Search bar — floating overlay above map, outside Leaflet DOM */}
      <div className="absolute top-3 right-4 z-[700] w-80 pointer-events-none">
        <div className="pointer-events-auto">
          <SearchBar onFlyTo={setFlyTarget} />
        </div>
      </div>

      {/* Detail sidebar */}
      {selectedPageId && (
        <LandmarkSidebar
          pageId={selectedPageId}
          onClose={() => setSelectedPageId(null)}
          isFavorite={isFavorite(selectedPageId)}
          isSaved={isSaved(selectedPageId)}
          onToggleFavorite={toggleFavorite}
          onSave={(lm: Landmark) => save(lm)}
          onRemoveSaved={removeSaved}
        />
      )}
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {icon}
      {badge !== undefined && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
