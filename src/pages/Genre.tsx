
import { useParams, useNavigate } from 'react-router-dom';
import { SongCard } from '@/components/cards/SongCard';
import { genres, trendingSongs } from '@/data/mockData';
import { searchYouTube, durationToSeconds } from '@/lib/youtube';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Play, Shuffle, Music } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { Song } from '@/types';

const Genre = () => {
    const { genreName } = useParams<{ genreName: string }>();
    const navigate = useNavigate();
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { playFromList } = usePlayerStore();

    // Find the genre data from mock data
    const genre = genres.find(
        (g) => g.name.toLowerCase() === decodeURIComponent(genreName || '')
    );

    // Build search queries based on genre
    const getSearchQueries = (genreName: string): string[] => {
        const queries: { [key: string]: string[] } = {
            bollywood: ['bollywood songs 2024', 'hindi songs new', 'bollywood hits'],
            punjabi: ['punjabi songs 2024', 'punjabi hits', 'punjabi music'],
            indie: ['indian indie music', 'indie pop hindi', 'coke studio'],
            'hip-hop': ['indian hip hop', 'desi hip hop', 'rap songs hindi'],
            'lo-fi': ['lofi hindi songs', 'lofi bollywood', 'chill hindi music'],
            devotional: ['bhajan songs', 'devotional songs hindi', 'aarti songs'],
            classical: ['indian classical music', 'hindustani classical', 'carnatic music'],
            romantic: ['romantic hindi songs', 'love songs bollywood', 'romantic songs 2024'],
        };
        return queries[genreName.toLowerCase()] || [`${genreName} songs`, `${genreName} music`];
    };

    useEffect(() => {
        const fetchGenreSongs = async () => {
            if (!genreName) return;

            setIsLoading(true);
            try {
                // Get search queries for this genre
                const queries = getSearchQueries(genreName);

                // Search using the first query
                const results = await searchYouTube(queries[0], 20);

                const formattedSongs: Song[] = results.map((video) => ({
                    id: video.id,
                    title: video.title,
                    artist: video.channelTitle,
                    artistId: video.channelId || video.channelTitle,
                    channelId: video.channelId,
                    thumbnail: video.thumbnail,
                    duration: video.duration || '3:30',
                    durationSeconds: video.duration ? durationToSeconds(video.duration) : 210,
                    color: genre?.color?.split(' ')[0]?.replace('from-', '') || undefined,
                }));

                setSongs(formattedSongs);
            } catch (error) {
                console.error('Genre search error:', error);
                // Fallback to mock data
                setSongs(trendingSongs.slice(0, 10));
            } finally {
                setIsLoading(false);
            }
        };

        fetchGenreSongs();
    }, [genreName, genre?.color]);

    const handlePlayAll = () => {
        if (songs.length > 0) {
            playFromList(songs, 0);
        }
    };

    const handleShuffle = () => {
        if (songs.length > 0) {
            const shuffled = [...songs].sort(() => Math.random() - 0.5);
            playFromList(shuffled, 0);
        }
    };

    const displayName = genre?.name || decodeURIComponent(genreName || 'Genre');
    const gradientClass = genre?.color || 'from-primary to-accent';

    return (
        <>
            <Helmet>
                <title>{displayName} - Supersonic Music</title>
                <meta name="description" content={`Listen to the best ${displayName} music on Supersonic Music.`} />
            </Helmet>

            <div className="space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Back</span>
                    </button>

                    {/* Genre Hero */}
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
                        {/* Genre Icon */}
                        <div className={`w-48 h-48 md:w-56 md:h-56 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-glow relative overflow-hidden`}>
                            {genre?.image && (
                                <img
                                    src={genre.image}
                                    alt={displayName}
                                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
                                />
                            )}
                            <Music className="w-20 h-20 md:w-24 md:h-24 text-white/90 drop-shadow-lg" />
                        </div>

                        {/* Genre Info */}
                        <div className="flex-1 text-center md:text-left">
                            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
                                Genre
                            </p>
                            <h1 className="text-4xl md:text-6xl font-bold mb-4">{displayName}</h1>
                            <p className="text-muted-foreground mb-6">
                                {isLoading ? 'Loading songs...' : `${songs.length} songs`}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-4 justify-center md:justify-start">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handlePlayAll}
                                    disabled={isLoading || songs.length === 0}
                                    className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Play className="w-5 h-5" />
                                    Play All
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleShuffle}
                                    disabled={isLoading || songs.length === 0}
                                    className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Shuffle className="w-5 h-5" />
                                    Shuffle
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Songs List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : songs.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-4"
                    >
                        <div className="space-y-1">
                            {songs.map((song, index) => (
                                <SongCard key={song.id} song={song} index={index} showIndex />
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="p-6 rounded-full bg-secondary/50 mb-6">
                            <Music className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No songs found</h2>
                        <p className="text-muted-foreground max-w-md">
                            We couldn't find any songs for this genre. Try browsing another genre.
                        </p>
                    </motion.div>
                )}
            </div>
        </>
    );
};

export default Genre;
