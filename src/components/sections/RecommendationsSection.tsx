import { ChevronRight, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongCard } from '@/components/cards/SongCard';
import { usePlayerStore, Song } from '@/store/playerStore';
import { useEffect, useState, useCallback } from 'react';
import { getAutoplayQueue, YouTubeVideo } from '@/lib/youtube';
import { Link } from 'react-router-dom';

export const RecommendationsSection = () => {
    const { history, setQueue } = usePlayerStore();
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [seedTitle, setSeedTitle] = useState<string>('');

    const fetchRecommendations = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            // Use last played song as seed, or use a default
            const seedSong = history[0];
            const seedId = seedSong?.id || 'vGJTaP6anOU'; // Default to Kesariya

            setSeedTitle(seedSong?.title || 'Popular tracks');

            const recommendations = await getAutoplayQueue(seedId, 12);

            if (recommendations.length > 0) {
                const formattedSongs: Song[] = recommendations.map((video: YouTubeVideo) => ({
                    id: video.id,
                    title: video.title,
                    artist: video.artist || video.channelTitle,
                    artistId: video.channelId || video.artist,
                    thumbnail: video.thumbnail,
                    duration: video.duration || '3:30',
                    durationSeconds: video.durationSeconds || 210,
                    moods: video.moods,
                    source: video.source
                }));
                setSongs(formattedSongs);
                setQueue(formattedSongs);
            }
        } catch (error) {
            console.error('[Recommendations] Error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [history, setQueue]);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

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
                    <motion.button
                        whileHover={{ rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => fetchRecommendations(true)}
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
                                    <SongCard song={song} index={index} />
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
