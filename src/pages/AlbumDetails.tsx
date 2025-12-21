import { useParams, useNavigate } from 'react-router-dom';
import { SongCard } from '@/components/cards/SongCard';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Play, Shuffle, Disc3, Clock, Calendar, Music } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { Song } from '@/types';
import { BACKEND_URL } from '@/config/api';

interface AlbumData {
    id: string;
    browseId: string;
    title: string;
    artist: string;
    artistId: string;
    thumbnail: string;
    year: string;
    trackCount: number;
    duration: string;
    description: string;
    type: string;
}

interface TrackData {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    thumbnail: string;
    duration: string;
    durationSeconds: number;
    trackNumber: number;
    isExplicit: boolean;
    album: string;
    albumId: string;
}

const durationToSeconds = (duration: string): number => {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
};

const AlbumDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [album, setAlbum] = useState<AlbumData | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const { playFromList } = usePlayerStore();

    useEffect(() => {
        const fetchAlbum = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                const response = await fetch(`${BACKEND_URL}/album/${id}`);
                const data = await response.json();

                if (data && data.album) {
                    setAlbum(data.album);

                    const formattedSongs: Song[] = data.tracks.map((track: TrackData) => ({
                        id: track.id,
                        title: track.title,
                        artist: track.artist || data.album.artist,
                        artistId: track.artistId || data.album.artistId,
                        thumbnail: track.thumbnail || data.album.thumbnail,
                        duration: track.duration || '3:30',
                        durationSeconds: track.durationSeconds || durationToSeconds(track.duration || '3:30'),
                        album: data.album.title,
                        albumId: id,
                    }));
                    setSongs(formattedSongs);
                }
            } catch (error) {
                console.error('Album fetch error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAlbum();
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

    if (!album) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <Disc3 className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Album not found</h2>
                <button
                    onClick={() => navigate('/albums')}
                    className="text-primary hover:underline mt-4"
                >
                    Back to Albums
                </button>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{album.title} - Supersonic Music</title>
                <meta name="description" content={`Listen to ${album.title} by ${album.artist} on Supersonic Music.`} />
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
                        {/* Background Blur */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                        {!imageError && album.thumbnail && (
                            <img
                                src={album.thumbnail}
                                alt="Background"
                                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />

                        <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-8">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-40 h-40 md:w-56 md:h-56 rounded-2xl overflow-hidden ring-4 ring-primary/30 shadow-glow flex-shrink-0"
                            >
                                {imageError ? (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <Disc3 className="w-16 h-16 text-muted-foreground" />
                                    </div>
                                ) : (
                                    <img
                                        src={album.thumbnail}
                                        alt={album.title}
                                        className="w-full h-full object-cover"
                                        onError={() => setImageError(true)}
                                    />
                                )}
                            </motion.div>

                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-primary uppercase tracking-wider">{album.type || 'Album'}</span>
                                    <h1 className="text-4xl md:text-6xl font-bold">{album.title}</h1>
                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground">
                                    <span className="font-medium text-foreground">{album.artist}</span>
                                    {album.year && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{album.year}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Music className="w-4 h-4" />
                                        <span>{album.trackCount || songs.length} songs</span>
                                    </div>
                                    {album.duration && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{album.duration}</span>
                                        </div>
                                    )}
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
                                        Play All
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

                {/* Track List */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Music className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">Tracks</h2>
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
                        <div className="text-center py-10">
                            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No tracks available.</p>
                        </div>
                    )}
                </div>

                {/* About Section */}
                {album.description && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-accent/10">
                                <Disc3 className="w-5 h-5 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold">About</h2>
                        </div>

                        <div className="glass-card p-6 rounded-2xl">
                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                {album.description}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AlbumDetails;
