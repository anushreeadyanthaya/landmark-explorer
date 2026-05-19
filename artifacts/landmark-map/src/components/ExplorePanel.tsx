import { MapPin, Heart, Bookmark, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Landmark } from '@workspace/api-client-react';

interface ExplorePanelProps {
  tab: 'explore' | 'favorites' | 'saved';
  landmarks: Landmark[];
  favoriteIds: Set<number>;
  savedLandmarks: Landmark[];
  isLoading: boolean;
  onSelect: (pageId: number) => void;
  onClose: () => void;
  onToggleFavorite: (pageId: number) => void;
  onRemoveSaved: (pageId: number) => void;
}

function LandmarkCard({
  landmark,
  isFavorited,
  isSaved,
  onSelect,
  onToggleFavorite,
  showRemove,
  onRemove,
}: {
  landmark: Landmark;
  isFavorited: boolean;
  isSaved: boolean;
  onSelect: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  showRemove?: boolean;
  onRemove?: (id: number) => void;
}) {
  return (
    <button
      onClick={() => onSelect(landmark.pageId)}
      className="w-full text-left group flex gap-3 p-3 rounded-xl hover:bg-accent/60 transition-colors"
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
        {landmark.extract && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{landmark.extract}</p>
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
    </button>
  );
}

export function ExplorePanel({
  tab,
  landmarks,
  favoriteIds,
  savedLandmarks,
  isLoading,
  onSelect,
  onClose,
  onToggleFavorite,
  onRemoveSaved,
}: ExplorePanelProps) {
  const favoritedLandmarks = landmarks.filter(l => favoriteIds.has(l.pageId));

  const items = tab === 'explore'
    ? landmarks
    : tab === 'favorites'
    ? favoritedLandmarks
    : savedLandmarks;

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
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              {emptyIcon}
              <p className="text-xs text-muted-foreground text-center max-w-[180px] leading-relaxed">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {items.map(landmark => (
                <LandmarkCard
                  key={landmark.pageId}
                  landmark={landmark}
                  isFavorited={favoriteIds.has(landmark.pageId)}
                  isSaved={savedLandmarks.some(l => l.pageId === landmark.pageId)}
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
