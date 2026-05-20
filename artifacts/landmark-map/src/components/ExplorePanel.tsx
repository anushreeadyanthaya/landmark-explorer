import { useState } from 'react';
import { MapPin, Heart, Bookmark, X, Navigation } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Landmark } from '@workspace/api-client-react';

interface UserLocation {
  lat: number;
  lng: number;
}

interface ExplorePanelProps {
  tab: 'explore' | 'favorites' | 'saved';
  landmarks: Landmark[];
  favoriteIds: Set<number>;
  savedLandmarks: Landmark[];
  isLoading: boolean;
  userLocation: UserLocation | null;
  onSelect: (pageId: number) => void;
  onClose: () => void;
  onToggleFavorite: (pageId: number) => void;
  onRemoveSaved: (pageId: number) => void;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function LandmarkCard({
  landmark,
  isFavorited,
  isSaved,
  distance,
  onSelect,
  onToggleFavorite,
  showRemove,
  onRemove,
}: {
  landmark: Landmark;
  isFavorited: boolean;
  isSaved: boolean;
  distance?: string;
  onSelect: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  showRemove?: boolean;
  onRemove?: (id: number) => void;
}) {
  return (
    <div
      onClick={() => onSelect(landmark.pageId)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(landmark.pageId)}
      className="w-full text-left group flex gap-3 p-3 rounded-xl hover:bg-accent/60 transition-colors cursor-pointer"
    >
      {landmark.thumbnailUrl ? (
        <img
          src={landmark.thumbnailUrl}
          alt={landmark.title}
          className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg shrink-0 bg-muted flex items-center justify-center border border-border">
          <MapPin className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-snug">{landmark.title}</p>
        {distance && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5 mt-1 mb-0.5">
            <Navigation className="w-2.5 h-2.5" />
            {distance}
          </span>
        )}
        {landmark.extract && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{landmark.extract}</p>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite(landmark.pageId); }}
          className={`p-1 rounded-md hover:bg-background transition-colors ${isFavorited ? 'text-rose-500' : 'text-muted-foreground'}`}
          title={isFavorited ? 'Unfavorite' : 'Favorite'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
        {showRemove && onRemove ? (
          <button
            onClick={e => { e.stopPropagation(); onRemove(landmark.pageId); }}
            className="p-1 rounded-md hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className={`p-1 rounded-md transition-colors ${isSaved ? 'text-primary' : 'text-muted-foreground'}`}>
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ExplorePanel({
  tab,
  landmarks,
  favoriteIds,
  savedLandmarks,
  isLoading,
  userLocation,
  onSelect,
  onClose,
  onToggleFavorite,
  onRemoveSaved,
}: ExplorePanelProps) {
  const [sortBy, setSortBy] = useState<'default' | 'nearby'>('default');

  const favoritedLandmarks = landmarks.filter(l => favoriteIds.has(l.pageId));

  const baseItems = tab === 'explore'
    ? landmarks
    : tab === 'favorites'
    ? favoritedLandmarks
    : savedLandmarks;

  const canSortNearby = userLocation !== null;
  const activeSort = canSortNearby ? sortBy : 'default';

  const itemsWithDistance = baseItems.map(l => ({
    landmark: l,
    distanceKm: userLocation
      ? haversineKm(userLocation.lat, userLocation.lng, l.lat, l.lng)
      : null,
  }));

  const sortedItems = activeSort === 'nearby'
    ? [...itemsWithDistance].sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    : itemsWithDistance;

  const emptyMessage = tab === 'explore'
    ? 'Pan or zoom the map to discover landmarks.'
    : tab === 'favorites'
    ? 'Heart any landmark to see it here.'
    : 'Save landmarks to access them later.';

  const emptyIcon = tab === 'explore'
    ? <MapPin className="w-8 h-8 text-muted-foreground/40" />
    : tab === 'favorites'
    ? <Heart className="w-8 h-8 text-muted-foreground/40" />
    : <Bookmark className="w-8 h-8 text-muted-foreground/40" />;

  return (
    <div className="w-80 h-full bg-card/95 backdrop-blur-sm border-r border-border shadow-2xl flex flex-col z-[500] shrink-0">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-sm text-foreground capitalize">{tab}</h2>
          {tab === 'explore' && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? 'Loading...' : `${landmarks.length} landmark${landmarks.length !== 1 ? 's' : ''} in view`}
            </p>
          )}
          {tab === 'favorites' && (
            <p className="text-xs text-muted-foreground mt-0.5">{favoritedLandmarks.length} saved</p>
          )}
          {tab === 'saved' && (
            <p className="text-xs text-muted-foreground mt-0.5">{savedLandmarks.length} saved</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canSortNearby && (
            <button
              onClick={() => setSortBy(s => s === 'nearby' ? 'default' : 'nearby')}
              title={activeSort === 'nearby' ? 'Sort: Nearby (click to reset)' : 'Sort by distance from your location'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                activeSort === 'nearby'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-transparent hover:border-border hover:text-foreground'
              }`}
            >
              <Navigation className="w-3 h-3" />
              Nearby
            </button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              {emptyIcon}
              <p className="text-xs text-muted-foreground text-center max-w-[180px] leading-relaxed">{emptyMessage}</p>
              {!canSortNearby && tab === 'explore' && (
                <p className="text-xs text-muted-foreground/60 text-center max-w-[180px] leading-relaxed">
                  Use the location button to sort by distance.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {sortedItems.map(({ landmark, distanceKm }) => (
                <LandmarkCard
                  key={landmark.pageId}
                  landmark={landmark}
                  isFavorited={favoriteIds.has(landmark.pageId)}
                  isSaved={savedLandmarks.some(l => l.pageId === landmark.pageId)}
                  distance={activeSort === 'nearby' && distanceKm !== null ? formatDistance(distanceKm) : undefined}
                  onSelect={onSelect}
                  onToggleFavorite={onToggleFavorite}
                  showRemove={tab === 'saved'}
                  onRemove={onRemoveSaved}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
