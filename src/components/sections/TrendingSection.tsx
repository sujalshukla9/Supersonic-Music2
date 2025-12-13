import { ChevronRight, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongCard } from '@/components/cards/SongCard';
import { usePlayerStore, Song } from '@/store/playerStore';
import { useEffect, useState, useCallback } from 'react';
import { trendingSongs as mockSongs } from '@/data/mockData';
import { Link } from 'react-router-dom';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const TrendingSection = () => {
  const { setQueue } = usePlayerStore();
  const [songs, setSongs] = useState<Song[]>(mockSongs);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTrending = useCallback(async (showRefresh = false) => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    if (showRefresh) setIsRefreshing(true);

    try {
      // Try backend API first (uses yt-dlp, no quota limits)
      const response = await fetch(`${BACKEND_URL}/trending?maxResults=15`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          console.log('[Trending] Fetched from backend');
          const formattedSongs: Song[] = data.results.map((video: any) => ({
            id: video.id,
            title: video.title,
            artist: video.artist,
            artistId: video.artist,
            thumbnail: video.thumbnail,
            duration: video.duration || '3:30',
            durationSeconds: 210,
          }));
          setSongs(formattedSongs);
          setQueue(formattedSongs);
          setLastUpdated(new Date());
          return;
        }
      }
    } catch (error) {
      console.log('[Trending] Backend failed, using mock data');
    }

    // Fallback to mock data
    setSongs(mockSongs);
    setQueue(mockSongs);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [setQueue]);

  useEffect(() => {
    fetchTrending().finally(() => setIsLoading(false));

    // Auto-refresh every 10 minutes
    const intervalId = setInterval(() => {
      fetchTrending(true).finally(() => setIsRefreshing(false));
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchTrending]);

  const handleRefresh = () => {
    fetchTrending(true).finally(() => setIsRefreshing(false));
  };

  const getTimeSinceUpdate = () => {
    const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
    if (mins < 1) return 'Updated just now';
    if (mins === 1) return 'Updated 1 min ago';
    return `Updated ${mins} mins ago`;
  };

  return (
    <section className="py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Trending Now</h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">{getTimeSinceUpdate()}</span>
              {isRefreshing && (
                <span className="flex items-center gap-1 text-primary">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="text-xs">Updating...</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
          <Link to="/explore">
            <motion.button
              whileHover={{ x: 5 }}
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="glass-card p-3 sm:p-4 relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="songs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              {songs.slice(0, 10).map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SongCard song={song} index={index} showIndex />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refreshing overlay */}
        {isRefreshing && !isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Updating trending...</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

