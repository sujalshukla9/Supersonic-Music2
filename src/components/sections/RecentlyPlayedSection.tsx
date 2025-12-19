import { ChevronRight, History, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore, Song } from '@/store/playerStore';
import { Link } from 'react-router-dom';
import { useState } from 'react';

// Helper function to get a working thumbnail URL
const getThumbnailUrl = (song: Song, useHq: boolean = false): string => {
    if (useHq && song.id) {
        // Try high-quality YouTube thumbnail
        return `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
    }
    return song.thumbnail || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
};

export const RecentlyPlayedSection = () => {
    const { history, playSong } = usePlayerStore();
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const [useHqFallback, setUseHqFallback] = useState<Set<string>>(new Set());

    const handleImageError = (songId: string) => {
        if (!useHqFallback.has(songId)) {
            // First error: try HQ fallback
            setUseHqFallback(prev => new Set(prev).add(songId));
        } else {
            // Second error: mark as completely failed
            setImageErrors(prev => new Set(prev).add(songId));
        }
    };

    if (history.length === 0) {
        return null;
    }

    return (
        <section className="py-6 sm:py-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500/10">
                        <History className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold">Recently Played</h2>
                </div>
                <Link to="/history">
                    <motion.button
                        whileHover={{ x: 5 }}
                        className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        See all
                        <ChevronRight className="w-4 h-4" />
                    </motion.button>
                </Link>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {history.slice(0, 10).map((song, index) => (
                    <motion.div
                        key={`${song.id}-${index}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => playSong(song)}
                        className="flex-shrink-0 w-[140px] sm:w-[160px] cursor-pointer group"
                    >
                        <div className="relative mb-2 sm:mb-3 rounded-lg sm:rounded-xl overflow-hidden shadow-lg bg-secondary aspect-square">
                            {!imageErrors.has(song.id) ? (
                                <img
                                    src={getThumbnailUrl(song, useHqFallback.has(song.id))}
                                    alt={song.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={() => handleImageError(song.id)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
                                    <Music className="w-12 h-12 text-muted-foreground" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                    <svg className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {song.title}
                        </h3>
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {song.artist}
                            </p>
                            {song.quality && (
                                <span className="text-[9px] px-1 rounded bg-primary/10 text-primary font-bold border border-primary/20 uppercase whitespace-nowrap">
                                    {song.quality.format} {song.quality.bitrate}k
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};
