import { useGetLandmarkDetail, getGetLandmarkDetailQueryKey } from '@workspace/api-client-react';
import type { Landmark } from '@workspace/api-client-react';
import { X, ExternalLink, Heart, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LandmarkSidebarProps {
  pageId: number;
  onClose: () => void;
  isFavorite: boolean;
  isSaved: boolean;
  onToggleFavorite: (pageId: number) => void;
  onSave: (landmark: Landmark) => void;
  onRemoveSaved: (pageId: number) => void;
}

export function LandmarkSidebar({
  pageId,
  onClose,
  isFavorite,
  isSaved,
  onToggleFavorite,
  onSave,
  onRemoveSaved,
}: LandmarkSidebarProps) {
  const { data: landmark, isLoading } = useGetLandmarkDetail(pageId, {
    query: {
      enabled: !!pageId,
      queryKey: getGetLandmarkDetailQueryKey(pageId),
    },
  });

  return (
    <div className="w-80 md:w-96 h-full bg-card border-l border-border shadow-2xl flex flex-col relative z-[500] shrink-0 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-start shrink-0 bg-card">
        <h2 className="font-semibold text-base text-foreground pr-3 leading-snug">
          {isLoading ? <Skeleton className="h-5 w-44" /> : landmark?.title}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0 -mt-0.5 -mr-1">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : landmark ? (
          <div>
            {landmark.thumbnailUrl && (
              <div className="relative">
                <img
                  src={landmark.thumbnailUrl}
                  alt={landmark.title}
                  className="w-full h-52 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}

            {/* Action buttons */}
            <div className="px-4 py-3 flex gap-2 border-b border-border">
              <button
                onClick={() => onToggleFavorite(pageId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  isFavorite
                    ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-400'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>
              <button
                onClick={() => isSaved ? onRemoveSaved(pageId) : onSave(landmark)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  isSaved
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {landmark.extract ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{landmark.extract}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description available.</p>
              )}

              <Button asChild className="w-full" variant="default" size="sm">
                <a
                  href={landmark.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  Read on Wikipedia
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center mt-10 px-4">Could not load details.</p>
        )}
      </ScrollArea>
    </div>
  );
}
