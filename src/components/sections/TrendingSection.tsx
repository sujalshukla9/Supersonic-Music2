import { ChevronRight, TrendingUp, Loader2, RefreshCw, Play, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongCard } from '@/components/cards/SongCard';
import { usePlayerStore } from '@/store/playerStore';
import { Song } from '@/types';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BACKEND_URL } from '@/config/api';

interface VideoResponse {
  id: string;
  title: string;
  artist?: string;
  channelTitle?: string;
  channelId?: string;
  thumbnail: string;
  duration?: string;
  durationSeconds?: number;
  rank?: number;
  views?: string;
}

// Fallback trending songs for when API fails
const FALLBACK_TRENDING: Song[] = [
  { id: 'vGJTaP6anOU', title: 'Kesariya', artist: 'Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/vGJTaP6anOU/hqdefault.jpg', duration: '4:28', durationSeconds: 268 },
  { id: 'JkEXTs9_Vf0', title: 'Guli Mata', artist: 'Saad Lamjarred', thumbnail: 'https://i.ytimg.com/vi/JkEXTs9_Vf0/hqdefault.jpg', duration: '3:35', durationSeconds: 215 },
  { id: 'lJaPKpMNmQQ', title: 'Naatu Naatu', artist: 'Rahul Sipligunj', thumbnail: 'https://i.ytimg.com/vi/lJaPKpMNmQQ/hqdefault.jpg', duration: '4:06', durationSeconds: 246 },
  { id: 'F6LgALhz1Xw', title: 'Tere Hawaale', artist: 'Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/F6LgALhz1Xw/hqdefault.jpg', duration: '5:17', durationSeconds: 317 },
  { id: 'QZ3pKPKG8Cg', title: 'Saree Ke Fall Sa', artist: 'Nakash Aziz', thumbnail: 'https://i.ytimg.com/vi/QZ3pKPKG8Cg/hqdefault.jpg', duration: '4:18', durationSeconds: 258 },
];

export const TrendingSection = () => {
  const { setQueue, playSong } = usePlayerStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const hasFetchedRef = useRef(false);
  const retryCountRef = useRef(0);

  const fetchTrending = useCallback(async (showRefresh = false, forceRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      // Force refresh clears backend cache
      if (forceRefresh) {
        console.log('[Trending] Force refreshing cache...');
        try {
          await fetch(`${BACKEND_URL}/trending/refresh`, { method: 'POST' });
        } catch (e) {
          console.warn('[Trending] Cache refresh failed, continuing...');
        }
      }

      let foundSongs: VideoResponse[] = [];
      let source = '';

      // Strategy 1: Fetch trending from main endpoint
      try {
        console.log('[Trending] Fetching from YouTube Music...');
        const response = await fetch(`${BACKEND_URL}/trending?maxResults=15`);

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            console.log('[Trending] Got:', data.results.length, 'songs from', data.source);
            foundSongs = data.results;
            source = data.source || 'ytmusic';

            if (data.lastUpdated) {
              setLastUpdated(new Date(data.lastUpdated));
            } else {
              setLastUpdated(new Date());
            }
          }
        }
      } catch (e) {
        console.warn('[Trending] Main endpoint failed:', e);
      }

      // Strategy 2: Try charts endpoint
      if (foundSongs.length === 0) {
        try {
          console.log('[Trending] Trying charts endpoint...');
          const chartsResponse = await fetch(`${BACKEND_URL}/charts?country=IN`);

          if (chartsResponse.ok) {
            const chartsData = await chartsResponse.json();
            if (chartsData.charts?.topSongs && chartsData.charts.topSongs.length > 0) {
              foundSongs = chartsData.charts.topSongs.slice(0, 15);
              source = 'charts';
              console.log('[Trending] Got from charts:', foundSongs.length);
            } else if (chartsData.charts?.trending && chartsData.charts.trending.length > 0) {
              foundSongs = chartsData.charts.trending.slice(0, 15);
              source = 'charts_trending';
              console.log('[Trending] Got from charts trending:', foundSongs.length);
            }
          }
        } catch (e) {
          console.warn('[Trending] Charts endpoint failed:', e);
        }
      }

      // Strategy 3: Try search for trending songs
      if (foundSongs.length === 0) {
        try {
          console.log('[Trending] Trying search for trending...');
          const searchResponse = await fetch(`${BACKEND_URL}/search?q=trending+hindi+songs+2024&maxResults=15`);

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.results && searchData.results.length > 0) {
              foundSongs = searchData.results;
              source = 'search_trending';
              console.log('[Trending] Got from search:', foundSongs.length);
            }
          }
        } catch (e) {
          console.warn('[Trending] Search failed:', e);
        }
      }

      // Process found songs
      if (foundSongs.length > 0) {
        const formattedSongs: Song[] = foundSongs.map((video: VideoResponse) => ({
          id: video.id,
          title: video.title,
          artist: video.artist || video.channelTitle || '',
          artistId: video.channelId || video.channelTitle,
          channelId: video.channelId,
          thumbnail: video.thumbnail,
          duration: video.duration || '3:30',
          durationSeconds: video.durationSeconds || 210,
        }));
        setSongs(formattedSongs);
        setDataSource(source);
        retryCountRef.current = 0;
      } else {
        // Use fallback songs
        console.log('[Trending] All strategies failed, using fallback songs');
        setSongs(FALLBACK_TRENDING);
        setDataSource('fallback');
        retryCountRef.current = 0;
      }
    } catch (error) {
      console.log('[Trending] Error:', error);

      // Auto-retry once
      if (retryCountRef.current < 1) {
        retryCountRef.current++;
        console.log('[Trending] Auto-retrying...');
        setTimeout(() => fetchTrending(false), 1000);
        return;
      }

      // Use fallback as last resort
      if (FALLBACK_TRENDING.length > 0) {
        setSongs(FALLBACK_TRENDING);
        setDataSource('fallback');
        setError(null);
      } else {
        setError('Unable to load trending songs');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchTrending();
    }
  }, [fetchTrending]);

  const handleRefresh = () => {
    retryCountRef.current = 0;
    setIsRefreshing(true);
    fetchTrending(true, true);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  const getTimeSinceUpdate = () => {
    const now = Date.now();
    const updated = lastUpdated.getTime();
    const diffMs = now - updated;

    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return 'Updated just now';
    if (mins < 60) return `Updated ${mins} min${mins > 1 ? 's' : ''} ago`;
    if (hours < 24) return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `Updated ${days} day${days > 1 ? 's' : ''} ago`;
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
              {dataSource === 'fallback' && (
                <span className="text-xs text-amber-500">(Offline mode)</span>
              )}
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
          {songs.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              Play All
            </motion.button>
          )}
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

      <div className="glass-card p-3 sm:p-4 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

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
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="px-4 py-2 text-sm bg-red-500/20 text-red-500 rounded-full"
              >
                Try Again
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="songs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1 relative z-10"
            >
              {songs.slice(0, 10).map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SongCard song={song} index={index} showIndex playlist={songs} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refreshing overlay */}
        {isRefreshing && !isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
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
