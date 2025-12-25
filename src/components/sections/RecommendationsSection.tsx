import { ChevronRight, Sparkles, Loader2, RefreshCw, AlertCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongCard } from '@/components/cards/SongCard';
import { usePlayerStore } from '@/store/playerStore';
import { Song } from '@/types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getAutoplayQueue, getTrendingMusic, YouTubeVideo } from '@/lib/youtube';
import { Link } from 'react-router-dom';
import { BACKEND_URL } from '@/config/api';

// Default seed songs for new users (popular diverse songs)
const DEFAULT_SEEDS = [
    { id: 'vGJTaP6anOU', title: 'Kesariya' },
    { id: 'JkEXTs9_Vf0', title: 'Guli Mata' },
    { id: 'F6LgALhz1Xw', title: 'Tere Hawaale' },
    { id: 'lJaPKpMNmQQ', title: 'Naatu Naatu' },
    { id: 'QZ3pKPKG8Cg', title: 'Saree Ke Fall Sa' },
    { id: 'csxMtZJU-PE', title: 'Main Rang Sharbaton Ka' },
];

export const RecommendationsSection = () => {
    const { history, playSong, setQueue } = usePlayerStore();
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [seedTitle, setSeedTitle] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const hasFetchedRef = useRef(false);
    const retryCountRef = useRef(0);

    const fetchRecommendations = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        try {
            let recommendations: YouTubeVideo[] = [];
            let usedSeedTitle = '';

            // Strategy 1: Use personalized recommendations from backend (uses user habits)
            if (history.length >= 3) {
                try {
                    console.log('[QuickPicks] Trying personalized recommendations...');
                    const response = await fetch(`${BACKEND_URL}/recommendations/for-you?limit=12`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.results && data.results.length > 0) {
                            recommendations = data.results;
                            usedSeedTitle = data.basedOn?.message || 'Your listening habits';
                            console.log('[QuickPicks] Got personalized:', recommendations.length);
                        }
                    }
                } catch (e) {
                    console.warn('[QuickPicks] Personalized failed:', e);
                }
            }

            // Strategy 2: Use autoplay queue with recent history as seed
            if (recommendations.length === 0 && history.length > 0) {
                // Pick a random recent song for variety (from top 5)
                const recentSongs = history.slice(0, Math.min(5, history.length));
                const randomIndex = Math.floor(Math.random() * recentSongs.length);
                const seedSong = recentSongs[randomIndex];

                console.log('[QuickPicks] Using history seed:', seedSong.title);
                recommendations = await getAutoplayQueue(seedSong.id, 12);
                usedSeedTitle = seedSong.title;
            }

            // Strategy 3: Use default seed songs for new users
            if (recommendations.length === 0) {
                // Pick a random default seed for variety
                const randomSeed = DEFAULT_SEEDS[Math.floor(Math.random() * DEFAULT_SEEDS.length)];
                console.log('[QuickPicks] Using default seed:', randomSeed.title);
                recommendations = await getAutoplayQueue(randomSeed.id, 12);
                usedSeedTitle = 'Popular tracks';
            }

            // Strategy 4: Fallback to trending
            if (recommendations.length === 0) {
                console.log('[QuickPicks] All strategies failed, using trending...');
                const trending = await getTrendingMusic(12);
                recommendations = trending;
                usedSeedTitle = 'Trending now';
            }

            if (recommendations && recommendations.length > 0) {
                const formattedSongs: Song[] = recommendations.map((video: YouTubeVideo) => ({
                    id: video.id,
                    title: video.title,
                    artist: video.artist || video.channelTitle || '',
                    artistId: video.channelId || video.artist,
                    channelId: video.channelId,
                    thumbnail: video.thumbnail,
                    duration: video.duration || '3:30',
                    durationSeconds: video.durationSeconds || 210,
                    moods: video.moods,
                    source: video.source
                }));
                setSongs(formattedSongs);
                setSeedTitle(usedSeedTitle);
                retryCountRef.current = 0;
                console.log('[QuickPicks] Loaded', formattedSongs.length, 'songs based on:', usedSeedTitle);
            } else {
                throw new Error('No recommendations available');
            }
        } catch (error) {
            console.error('[QuickPicks] Error:', error);

            // Auto-retry once
            if (retryCountRef.current < 1) {
                retryCountRef.current++;
                console.log('[QuickPicks] Auto-retrying...');
                setTimeout(() => fetchRecommendations(false), 1000);
                return;
            }

            setError('Unable to load recommendations');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [history]);

    useEffect(() => {
        // Only fetch once on mount to prevent infinite loops
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchRecommendations();
        }
    }, [fetchRecommendations]);

    const handleRefresh = () => {
        retryCountRef.current = 0;
        fetchRecommendations(true);
    };

    const handlePlayAll = () => {
        if (songs.length > 0) {
            setQueue(songs);
            playSong(songs[0]);
        }
    };

    return (
        <section className="py-6 sm:py-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-accent/10">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">Quick Picks</h2>
                        {seedTitle && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                Based on "{seedTitle}"
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {songs.length > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlayAll}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent/20 text-accent rounded-full hover:bg-accent/30 transition-colors"
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
                            className="hidden sm:flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
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
                                className="px-4 py-2 text-sm bg-primary/20 text-primary rounded-full"
                            >
                                Try Again
                            </motion.button>
                        </motion.div>
                    ) : songs.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <Sparkles className="w-10 h-10 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">No recommendations yet</p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleRefresh}
                                className="mt-3 px-4 py-2 text-sm bg-primary/20 text-primary rounded-full"
                            >
                                Refresh
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="songs"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-1"
                        >
                            {songs.slice(0, 8).map((song, index) => (
                                <motion.div
                                    key={song.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <SongCard song={song} index={index} playlist={songs} />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {isRefreshing && !isLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <div className="flex items-center gap-2 text-primary">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Finding new picks...</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
