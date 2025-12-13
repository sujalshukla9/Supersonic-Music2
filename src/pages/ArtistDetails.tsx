
import { useParams, useNavigate } from 'react-router-dom';
import { SongCard } from '@/components/cards/SongCard';
import { getArtistDetails, durationToSeconds } from '@/lib/youtube';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Play, Shuffle, Mic2, Users, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Song, usePlayerStore } from '@/store/playerStore';

interface ArtistData {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    banner?: string;
    subscriberCount: string;
    verified: boolean;
}

const ArtistDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [artist, setArtist] = useState<ArtistData | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { playFromList } = usePlayerStore();

    useEffect(() => {
        const fetchArtist = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                const data = await getArtistDetails(id);

                if (data && data.artist) {
                    setArtist(data.artist);

                    const formattedSongs: Song[] = data.topTracks.map((video) => ({
                        id: video.id,
                        title: video.title,
                        artist: video.channelTitle,
                        artistId: video.channelId || id,
                        thumbnail: video.thumbnail,
                        duration: video.duration || '3:30',
                        durationSeconds: video.durationSeconds || durationToSeconds(video.duration || '3:30'),
                    }));
                    setSongs(formattedSongs);
                }
            } catch (error) {
                console.error('Artist fetch error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchArtist();
    }, [id]);

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!artist) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <Mic2 className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Artist not found</h2>
                <button
                    onClick={() => navigate('/artists')}
                    className="text-primary hover:underline mt-4"
                >
                    Back to Artists
                </button>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{artist.name} - Supersonic Music</title>
                <meta name="description" content={`Listen to music by ${artist.name} on Supersonic Music.`} />
            </Helmet>

            <div className="space-y-8 pb-10">
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

                    <div className="glass-card overflow-hidden rounded-3xl relative">
                        {/* Background Banner */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                        {artist.banner && (
                            <img
                                src={artist.banner}
                                alt="Banner"
                                className="absolute inset-0 w-full h-full object-cover opacity-30"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />

                        <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-8">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-glow flex-shrink-0"
                            >
                                <img
                                    src={artist.thumbnail}
                                    alt={artist.name}
                                    className="w-full h-full object-cover"
                                />
                            </motion.div>

                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4">
                                    <h1 className="text-4xl md:text-6xl font-bold">{artist.name}</h1>
                                    {artist.verified && (
                                        <div title="Verified Artist" className="mt-2 md:mt-4">
                                            <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-primary fill-current" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-center md:justify-start gap-6 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>{artist.subscriberCount} subscribers</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-4 justify-center md:justify-start pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handlePlayAll}
                                        disabled={songs.length === 0}
                                        className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary disabled:opacity-50"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        Play Popular
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleShuffle}
                                        disabled={songs.length === 0}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50"
                                    >
                                        <Shuffle className="w-5 h-5" />
                                        Shuffle
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Songs List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Mic2 className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Popular Songs</h2>
                        </div>

                        {songs.length > 0 ? (
                            <div className="glass-card p-4 rounded-2xl">
                                <div className="space-y-1">
                                    {songs.map((song, index) => (
                                        <SongCard key={song.id} song={song} index={index} showIndex />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-10">No songs available.</p>
                        )}
                    </div>

                    {/* About */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-accent/10">
                                <Users className="w-5 h-5 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold">About</h2>
                        </div>

                        <div className="glass-card p-6 rounded-2xl">
                            {artist.description ? (
                                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {artist.description}
                                </p>
                            ) : (
                                <p className="text-muted-foreground italic">No description available.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ArtistDetails;
