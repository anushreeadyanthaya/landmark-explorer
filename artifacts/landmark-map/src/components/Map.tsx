import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import "leaflet/dist/leaflet.css";

import { useDebounce } from '@/hooks/use-debounce';
import { useFavorites } from '@/hooks/use-favorites';
import { useSaved } from '@/hooks/use-saved';
import { useGetLandmarks, getGetLandmarksQueryKey } from '@workspace/api-client-react';
import { LandmarkSidebar } from './LandmarkSidebar';
import { ExplorePanel } from './ExplorePanel';
import { SearchBar, SearchBarController } from './SearchBar';
import { MapPin, Compass, Heart, Bookmark, Loader2, LocateFixed, ChevronRight } from 'lucide-react';
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

function LocateController({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 15, { duration: 1.4 });
  }, [target, map]);
  return null;
}

function createCustomIcon(isFavorite: boolean, isSelected: boolean) {
  const color = isSelected ? '#0ea5e9' : isFavorite ? '#f43f5e' : '#3b82f6';
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTarget(loc);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

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

  const handleViewDetails = (pageId: number) => {
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
          <NavButton
            icon={locating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <LocateFixed className="w-4 h-4" />}
            label="My Location"
            active={!!userLocation}
            onClick={handleLocate}
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <MapBoundsTracker setBounds={setBounds} />
          <SearchBarController flyTarget={flyTarget} />
          <LocateController target={flyTarget} />
          {userLocation && (
            <>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={80}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1.5 }}
              />
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  html: `<div style="width:14px;height:14px;background:#3b82f6;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,0.5)"></div>`,
                  className: '',
                  iconSize: [14, 14],
                  iconAnchor: [7, 7],
                })}
              />
            </>
          )}

          {landmarks.map((landmark) => (
            <Marker
              key={landmark.pageId}
              position={[landmark.lat, landmark.lng]}
              icon={createCustomIcon(isFavorite(landmark.pageId), selectedPageId === landmark.pageId)}
            >
              <Popup className="landmark-popup" closeButton={false} offset={[0, -20]} minWidth={230}>
                <LandmarkPopupContent
                  landmark={landmark}
                  isFav={isFavorite(landmark.pageId)}
                  isSaved={isSaved(landmark.pageId)}
                  onToggleFavorite={() => toggleFavorite(landmark.pageId)}
                  onToggleSave={() => isSaved(landmark.pageId) ? removeSaved(landmark.pageId) : save(landmark)}
                  onViewDetails={() => handleViewDetails(landmark.pageId)}
                />
              </Popup>
            </Marker>
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

function LandmarkPopupContent({
  landmark,
  isFav,
  isSaved,
  onToggleFavorite,
  onToggleSave,
  onViewDetails,
}: {
  landmark: Landmark;
  isFav: boolean;
  isSaved: boolean;
  onToggleFavorite: () => void;
  onToggleSave: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div className="p-3" style={{ fontFamily: 'Inter, sans-serif' }}>
      {landmark.thumbnailUrl && (
        <img
          src={landmark.thumbnailUrl}
          alt={landmark.title}
          style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
        />
      )}
      <p style={{ fontWeight: 600, fontSize: '13px', color: '#111827', marginBottom: '2px', lineHeight: 1.3 }}>
        {landmark.title}
      </p>
      {landmark.extract && (
        <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {landmark.extract}
        </p>
      )}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            padding: '5px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
            border: isFav ? '1.5px solid #fda4af' : '1.5px solid #e5e7eb',
            background: isFav ? '#fff1f2' : '#f9fafb',
            color: isFav ? '#e11d48' : '#374151',
            transition: 'all 0.15s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {isFav ? 'Favorited' : 'Favorite'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            padding: '5px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
            border: isSaved ? '1.5px solid #93c5fd' : '1.5px solid #e5e7eb',
            background: isSaved ? '#eff6ff' : '#f9fafb',
            color: isSaved ? '#2563eb' : '#374151',
            transition: 'all 0.15s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          padding: '5px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
          border: '1.5px solid #e5e7eb', background: '#f3f4f6', color: '#374151', transition: 'all 0.15s',
        }}
      >
        View details
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
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
