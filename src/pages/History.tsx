import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Clock, Play, Trash2, Music, MoreHorizontal } from 'lucide-react';
import { usePlayerStore, Song } from '@/store/playerStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const History = () => {
    const { history, playSong, playFromList, addToQueue, addToQueueNext, clearHistory } = usePlayerStore();
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    const handleImageError = (id: string) => {
        setImageErrors(prev => new Set(prev).add(id));
    };

    const formatPlayedAt = (playedAt?: string) => {
        if (!playedAt) return '';
        const date = new Date(playedAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const playAll = () => {
        if (history.length > 0) {
            playFromList(history, 0);
        }
    };

    const handleClearHistory = () => {
        if (confirm('Are you sure you want to clear your listening history?')) {
            clearHistory();
        }
    };

    return (
        <>
            <Helmet>
                <title>History - Supersonic Music</title>
                <meta name="description" content="Your recently played songs on Supersonic Music." />
            </Helmet>

            <div className="container max-w-4xl mx-auto pb-32 px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-6"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Clock className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold">History</h1>
                                <p className="text-muted-foreground">{history.length} songs</p>
                            </div>
                        </div>

                        {history.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleClearHistory}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 font-medium transition-colors"
                                    title="Clear history"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Clear</span>
                                </button>
                                <button
                                    onClick={playAll}
                                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Play All
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Song List */}
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
                                <Clock className="w-12 h-12 text-muted-foreground" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No listening history</h2>
                            <p className="text-muted-foreground max-w-md">
                                Songs you listen to will appear here. Start exploring and playing music!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((song: Song & { playedAt?: string }, index: number) => (
                                <motion.div
                                    key={`${song.id}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
                                    onClick={() => playSong(song)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
                                        {song.thumbnail && !imageErrors.has(song.id) ? (
                                            <img
                                                src={song.thumbnail}
                                                alt={song.title}
                                                className="w-full h-full object-cover"
                                                onError={() => handleImageError(song.id)}
                                            />
                                        ) : (
                                            <Music className="w-6 h-6 text-muted-foreground" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Play className="w-6 h-6 text-white fill-current" />
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                            {song.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {song.artist}
                                        </p>
                                    </div>

                                    {/* Time Ago */}
                                    <span className="text-xs text-muted-foreground hidden sm:block">
                                        {formatPlayedAt(song.playedAt)}
                                    </span>

                                    {/* Duration */}
                                    <span className="text-sm text-muted-foreground w-12 text-right">
                                        {song.duration}
                                    </span>

                                    {/* Actions */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => addToQueueNext(song)}>
                                                Play Next
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => addToQueue(song)}>
                                                Add to Queue
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </>
    );
};

export default History;
