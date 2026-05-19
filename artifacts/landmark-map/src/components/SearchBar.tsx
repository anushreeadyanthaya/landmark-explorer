import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import { useMap } from 'react-leaflet';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

function FlyToController({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 14, { duration: 1.4 });
    }
  }, [map, target]);
  return null;
}

interface SearchBarProps {
  flyTarget: { lat: number; lng: number } | null;
  onFlyTo: (target: { lat: number; lng: number }) => void;
}

export function SearchBarController({ flyTarget }: { flyTarget: { lat: number; lng: number } | null }) {
  return <FlyToController target={flyTarget} />;
}

export function SearchBar({ onFlyTo }: { onFlyTo: (t: { lat: number; lng: number }) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (r: NominatimResult) => {
    onFlyTo({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setQuery(r.display_name.split(',')[0]);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
        {loading ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
        ) : (
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search any city or place..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
        />
        {query && (
          <button onClick={handleClear} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => handleSelect(r)}
              className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate font-medium">
                  {r.display_name.split(',')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {r.display_name.split(',').slice(1, 3).join(',').trim()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
