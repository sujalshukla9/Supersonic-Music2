
import { GenreCard } from '@/components/cards/GenreCard';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { SongCard } from '@/components/cards/SongCard';
import { genres, playlists, trendingSongs } from '@/data/mockData';
import { durationToSeconds } from '@/lib/youtube';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Flame, Loader2, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Song } from '@/types';
import { BACKEND_URL } from '@/config/api';

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface VideoResponse {
  id: string;
  title: string;
  artist?: string;
  channelTitle?: string;
  channelId?: string;
  thumbnail: string;
  duration?: string;
  durationSeconds?: number;
}

const Explore = () => {
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetchedRef = useRef(false);
  const retryCountRef = useRef(0);

  const fetchNewReleases = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingReleases(true);
    }

    try {
      let releases: VideoResponse[] = [];

      // Strategy 1: Try dedicated new releases endpoint or search
      try {
        console.log('[Explore] Fetching new releases...');
        const response = await fetch(`${BACKEND_URL}/search?q=new+bollywood+songs+2024+official+video&maxResults=10`);

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            releases = data.results;
            console.log('[Explore] Got new releases:', releases.length);
          }
        }
      } catch (e) {
        console.warn('[Explore] New releases search failed:', e);
      }

      // Strategy 2: Try home sections for new releases
      if (releases.length === 0) {
        try {
          console.log('[Explore] Trying home sections...');
          const homeResponse = await fetch(`${BACKEND_URL}/home/sections`);

          if (homeResponse.ok) {
            const homeData = await homeResponse.json();
            if (homeData.sections && homeData.sections.length > 0) {
              // Look for a section that might contain new releases
              const newReleasesSection = homeData.sections.find((s: any) =>
                s.title?.toLowerCase().includes('new') ||
                s.title?.toLowerCase().includes('release') ||
                s.title?.toLowerCase().includes('latest')
              ) || homeData.sections[0];

              if (newReleasesSection?.items?.length > 0) {
                releases = newReleasesSection.items.slice(0, 10);
                console.log('[Explore] Got from home sections:', releases.length);
              }
            }
          }
        } catch (e) {
          console.warn('[Explore] Home sections failed:', e);
        }
      }

      // Strategy 3: Fall back to trending
      if (releases.length === 0) {
        try {
          console.log('[Explore] Falling back to trending...');
          const trendingResponse = await fetch(`${BACKEND_URL}/trending?maxResults=10`);

          if (trendingResponse.ok) {
            const trendingData = await trendingResponse.json();
            if (trendingData.results && trendingData.results.length > 0) {
              releases = trendingData.results;
              console.log('[Explore] Got from trending:', releases.length);
            }
          }
        } catch (e) {
          console.warn('[Explore] Trending failed:', e);
        }
      }

      // Process releases
      if (releases.length > 0) {
        const formattedSongs: Song[] = releases.map((video) => ({
          id: video.id,
          title: video.title,
          artist: video.artist || video.channelTitle || '',
          artistId: video.channelId || video.channelTitle,
          channelId: video.channelId,
          thumbnail: video.thumbnail,
          duration: video.duration || '3:30',
          durationSeconds: video.durationSeconds || (video.duration ? durationToSeconds(video.duration) : 210),
        }));
        setNewReleases(formattedSongs);
        setLastUpdated(new Date());
        retryCountRef.current = 0;
      } else {
        // Final fallback to mock data
        console.log('[Explore] Using mock data fallback');
        setNewReleases(trendingSongs.slice(0, 10));
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('[Explore] Failed to fetch new releases:', error);

      // Auto-retry once
      if (retryCountRef.current < 1) {
        retryCountRef.current++;
        console.log('[Explore] Auto-retrying...');
        setTimeout(() => fetchNewReleases(false), 1000);
        return;
      }

      // Fallback to mock data on error
      setNewReleases(trendingSongs.slice(0, 10));
      setLastUpdated(new Date());
    } finally {
      setIsLoadingReleases(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNewReleases();
    }
  }, [fetchNewReleases]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchNewReleases(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchNewReleases]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    return date.toLocaleTimeString();
  };

  return (
    <>
      <Helmet>
        <title>Explore - Supersonic Music</title>
        <meta name="description" content="Explore new music, genres, and playlists on Supersonic Music. Discover your next favorite song." />
      </Helmet>

      <div className="space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-2">Explore</h1>
          <p className="text-muted-foreground text-lg">
            Discover new music and artists
          </p>
        </motion.div>

        {/* Genres */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-accent/10">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-2xl font-bold">Browse by Genre</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {genres.map((genre, index) => (
              <GenreCard key={genre.id} genre={genre} index={index} />
            ))}
          </div>
        </section>

        {/* New Releases - Now Dynamic */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">New Releases</h2>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground">
                    Updated {formatLastUpdated(lastUpdated)} • Auto-refreshes every 5 min
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchNewReleases(true)}
              disabled={isRefreshing || isLoadingReleases}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>

          <div className="glass-card p-4 relative overflow-hidden">
            {/* Loading Overlay */}
            <AnimatePresence>
              {isLoadingReleases && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Refreshing Indicator */}
            {isRefreshing && !isLoadingReleases && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium z-10"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating...
              </motion.div>
            )}

            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {newReleases.map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SongCard song={song} index={index} playlist={newReleases} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Hot Playlists */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold">Hot Playlists</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {playlists.map((playlist, index) => (
              <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Explore;
