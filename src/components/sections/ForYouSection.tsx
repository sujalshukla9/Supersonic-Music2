import { ChevronRight, Sparkles, Loader2, RefreshCw, AlertCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongCard } from '@/components/cards/SongCard';
import { usePlayerStore } from '@/store/playerStore';
import { Song } from '@/types';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BACKEND_URL } from '@/config/api';

interface RecommendationResponse {
    id: string;
    title: string;
    artist?: string;
    channelTitle?: string;
    thumbnail: string;
    duration?: string;
    durationSeconds?: number;
    channelId?: string;
}

interface BasedOnData {
    topArtists: string[];
    topMoods: string[];
    totalPlays: number;
    message?: string;
}

export const ForYouSection = () => {
    const { setQueue, playSong } = usePlayerStore();
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [basedOn, setBasedOn] = useState<BasedOnData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<string>('');
    const hasFetchedRef = useRef(false);

    const fetchRecommendations = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        setError(null);

        try {
            // Fetch personalized recommendations from ytmusicapi-powered endpoint
            const response = await fetch(`${BACKEND_URL}/recommendations/for-you?limit=10`);

            if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    console.log('[ForYou] Fetched recommendations:', data.results.length, 'songs, source:', data.source);
                    const formattedSongs: Song[] = data.results.map((video: RecommendationResponse) => ({
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
                    setSource(data.source || 'ytmusicapi');

                    if (data.basedOn) {
                        setBasedOn(data.basedOn);
                    }
                    return;
                }
            }

            // Fallback to home sections
            console.log('[ForYou] Primary endpoint failed, trying home sections...');
            const homeSectionsResponse = await fetch(`${BACKEND_URL}/home/sections`);

            if (homeSectionsResponse.ok) {
                const homeData = await homeSectionsResponse.json();
                if (homeData.sections && homeData.sections.length > 0) {
                    // Get songs from the first section with songs
                    const songsSection = homeData.sections.find((s: any) =>
                        s.items && s.items.length > 0 && s.items[0].id
                    );

                    if (songsSection) {
                        const formattedSongs: Song[] = songsSection.items.slice(0, 10).map((item: RecommendationResponse) => ({
                            id: item.id,
                            title: item.title,
                            artist: item.artist || '',
                            artistId: item.channelId,
                            channelId: item.channelId,
                            thumbnail: item.thumbnail,
                            duration: item.duration || '3:30',
                            durationSeconds: item.durationSeconds || 210,
                        }));
                        setSongs(formattedSongs);
                        setSource('ytmusic_home');
                        setBasedOn({ topArtists: [], topMoods: [], totalPlays: 0, message: songsSection.title });
                        return;
                    }
                }
            }

            // Ultimate fallback to trending
            console.log('[ForYou] Home sections failed, falling back to trending');
            const trendingResponse = await fetch(`${BACKEND_URL}/trending?maxResults=10`);

            if (trendingResponse.ok) {
                const trendingData = await trendingResponse.json();
                if (trendingData.results && trendingData.results.length > 0) {
                    const formattedSongs: Song[] = trendingData.results.map((video: RecommendationResponse) => ({
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
                    setSource('trending_fallback');
                    setBasedOn({ topArtists: [], topMoods: [], totalPlays: 0, message: 'Based on trending' });
                    return;
                }
            }

            // If all fails, set error
            setError('Unable to load recommendations');
        } catch (error) {
            console.log('[ForYou] Failed to fetch recommendations:', error);
            setError('Unable to load recommendations');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // Only fetch once on mount
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchRecommendations();
        }
    }, [fetchRecommendations]);

    const handleRefresh = () => {
        fetchRecommendations(true);
    };

    const handlePlayAll = () => {
        if (songs.length > 0) {
            setQueue(songs);
            playSong(songs[0]);
        }
    };

    // Don't render if no recommendations and no loading and no error
    if (!isLoading && songs.length === 0 && !error) {
        return null;
    }

    return (
        <section className="py-6 sm:py-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            For You
                        </h2>
                        {basedOn && basedOn.totalPlays > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Based on {basedOn.topArtists.length > 0 && `${basedOn.topArtists.slice(0, 2).join(', ')}`}
                                {basedOn.topMoods.length > 0 && basedOn.topArtists.length > 0 && ' & '}
                                {basedOn.topMoods.length > 0 && `${basedOn.topMoods[0]} vibes`}
                            </p>
                        )}
                        {basedOn && basedOn.totalPlays === 0 && !basedOn.message && (
                            <p className="text-xs text-muted-foreground">
                                Listen to more songs to personalize
                            </p>
                        )}
                        {basedOn && basedOn.message && (
                            <p className="text-xs text-muted-foreground">
                                {basedOn.message}
                            </p>
                        )}
                        {source && source !== 'personalized' && !basedOn?.message && (
                            <p className="text-xs text-muted-foreground opacity-60">
                                Powered by YouTube Music
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
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded-full hover:bg-purple-500/30 transition-colors"
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
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center py-12"
                        >
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
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
                                className="px-4 py-2 text-sm bg-purple-500/20 text-purple-400 rounded-full"
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
                            {songs.slice(0, 5).map((song, index) => (
                                <motion.div
                                    key={song.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                >
                                    <SongCard song={song} index={index} showIndex />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Refreshing overlay */}
                {isRefreshing && !isLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Finding new songs...</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
