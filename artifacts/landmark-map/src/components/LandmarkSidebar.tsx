import { useGetLandmarkDetail, getGetLandmarkDetailQueryKey } from '@workspace/api-client-react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export function LandmarkSidebar({ pageId, onClose }: { pageId: number; onClose: () => void }) {
  const { data: landmark, isLoading } = useGetLandmarkDetail(pageId, {
    query: {
      enabled: !!pageId,
      queryKey: getGetLandmarkDetailQueryKey(pageId)
    }
  });

  return (
    <div className="w-80 md:w-96 h-full bg-card border-l border-border shadow-xl flex flex-col relative z-[500] shrink-0 animate-in slide-in-from-right-full duration-300">
      <div className="p-4 border-b border-border flex justify-between items-start shrink-0 sticky top-0 bg-card z-10">
        <h2 className="font-serif text-xl font-bold text-foreground pr-4 leading-tight">
          {isLoading ? <Skeleton className="h-6 w-48" /> : landmark?.title}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 -mt-1 -mr-2">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-md" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : landmark ? (
          <div className="space-y-6">
            {landmark.thumbnailUrl && (
              <div className="rounded-md overflow-hidden border border-border shadow-sm">
                <img 
                  src={landmark.thumbnailUrl} 
                  alt={landmark.title} 
                  className="w-full h-auto object-cover max-h-64"
                />
              </div>
            )}
            
            {landmark.extract && (
              <div className="prose prose-sm dark:prose-invert">
                <p className="text-muted-foreground leading-relaxed font-sans">{landmark.extract}</p>
              </div>
            )}

            {!landmark.extract && !landmark.thumbnailUrl && (
              <p className="text-sm text-muted-foreground italic">No additional details available.</p>
            )}

            <div className="pt-4 pb-8">
              <Button asChild className="w-full font-medium" variant="default">
                <a href={landmark.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  Read Full Article
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center mt-8">Could not load details.</p>
        )}
      </ScrollArea>
    </div>
  );
}
