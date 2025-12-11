import { ChevronRight, History, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore, Song } from '@/store/playerStore';

export const RecentlyPlayedSection = () => {
    const { history, playSong } = usePlayerStore();

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
                <motion.button
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    See all
                    <ChevronRight className="w-4 h-4" />
                </motion.button>
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
                        <div className="relative mb-2 sm:mb-3 rounded-lg sm:rounded-xl overflow-hidden shadow-lg">
                            <img
                                src={song.thumbnail}
                                alt={song.title}
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                            />
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
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            {song.artist}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};
