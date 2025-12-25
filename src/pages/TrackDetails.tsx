import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Play, Pause, Heart, Share2, ListPlus, Clock, User, ArrowLeft, Loader2, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import { useLikesStore } from '@/store/likesStore';
import { getVideoDetails } from '@/lib/youtube';
import { Song } from '@/types';
import { SongCard } from '@/components/cards/SongCard';
import { BACKEND_URL } from '@/config/api';

const TrackDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { playSong, currentSong, isPlaying, togglePlay, addToQueue, addToQueueNext } = usePlayerStore();
    const { isLiked, toggleLike } = useLikesStore();

    const [track, setTrack] = useState<Song | null>(null);
    const [relatedTracks, setRelatedTracks] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        const fetchTrackDetails = async () => {
            if (!id) return;

            setIsLoading(true);
            setError(null);

            try {
                // Fetch track details
                const videoData = await getVideoDetails(id);

                if (videoData) {
                    const songData: Song = {
                        id: videoData.id,
                        title: videoData.title,
                        artist: videoData.channelTitle,
                        artistId: videoData.channelId,
                        channelId: videoData.channelId,
                        thumbnail: videoData.thumbnail,
                        duration: videoData.duration || '0:00',
                        durationSeconds: videoData.durationSeconds || 0,
                    };
                    setTrack(songData);

                    // Fetch related tracks
                    try {
                        const response = await fetch(`${BACKEND_URL}/related/${id}?maxResults=10`);
                        if (response.ok) {
                            const data = await response.json();
                            const related = (data.results || []).map((item: any) => ({
                                id: item.id,
                                title: item.title,
                                artist: item.artist || item.channelTitle,
                                artistId: item.channelId,
                                channelId: item.channelId,
                                thumbnail: item.thumbnail,
                                duration: item.duration || '0:00',
                                durationSeconds: item.durationSeconds || 0,
                            }));
                            setRelatedTracks(related);
                        }
                    } catch (e) {
                        console.warn('[TrackDetails] Failed to fetch related:', e);
                    }
                } else {
                    setError('Track not found');
                }
            } catch (e) {
                console.error('[TrackDetails] Error:', e);
                setError('Failed to load track');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrackDetails();
    }, [id]);

    const isCurrentTrack = currentSong?.id === id;
    const trackIsLiked = track ? isLiked(track.id) : false;

    const handlePlay = () => {
        if (!track) return;

        if (isCurrentTrack) {
            togglePlay();
        } else {
            playSong(track);
        }
    };

    const handleShare = async () => {
        if (!track) return;

        const shareUrl = `${window.location.origin}/track/${track.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: track.title,
                    text: `Listen to ${track.title} by ${track.artist}`,
                    url: shareUrl,
                });
            } catch (e) {
                // User cancelled or error
            }
        } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(shareUrl);
            alert('Link copied to clipboard!');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !track) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Music className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Track Not Found</h2>
                <p className="text-muted-foreground mb-4">{error || "The track you're looking for doesn't exist."}</p>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{track.title} - {track.artist} | Supersonic Music</title>
                <meta name="description" content={`Listen to ${track.title} by ${track.artist} on Supersonic Music`} />
            </Helmet>

            <div className="space-y-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>

                {/* Track Hero */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                    {/* Album Art */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full md:w-72 aspect-square rounded-2xl overflow-hidden shadow-2xl bg-secondary flex-shrink-0"
                    >
                        {track.thumbnail && !imageError ? (
                            <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="w-full h-full object-cover"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Music className="w-24 h-24 text-muted-foreground" />
                            </div>
                        )}
                    </motion.div>

                    {/* Track Info */}
                    <div className="flex flex-col justify-end space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground uppercase tracking-wider">Song</p>
                            <h1 className="text-3xl md:text-5xl font-bold mt-2">{track.title}</h1>
                        </div>

                        <div className="flex items-center gap-4 text-muted-foreground">
                            <button
                                onClick={() => track.channelId && navigate(`/artist/${track.channelId}`)}
                                className="flex items-center gap-2 hover:text-foreground transition-colors"
                            >
                                <User className="w-4 h-4" />
                                <span className="font-medium">{track.artist}</span>
                            </button>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {track.duration}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-4">
                            <motion.button
                                onClick={handlePlay}
                                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold shadow-lg shadow-primary/25"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isCurrentTrack && isPlaying ? (
                                    <>
                                        <Pause className="w-5 h-5 fill-current" />
                                        Pause
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 fill-current" />
                                        Play
                                    </>
                                )}
                            </motion.button>

                            <motion.button
                                onClick={() => track && toggleLike(track)}
                                className={`p-3 rounded-full border transition-colors ${trackIsLiked
                                    ? 'bg-red-500/20 border-red-500/50 text-red-500'
                                    : 'border-border hover:bg-secondary/50'
                                    }`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Heart className={`w-5 h-5 ${trackIsLiked ? 'fill-current' : ''}`} />
                            </motion.button>

                            <motion.button
                                onClick={() => track && addToQueueNext(track)}
                                className="p-3 rounded-full border border-border hover:bg-secondary/50 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Add to Queue"
                            >
                                <ListPlus className="w-5 h-5" />
                            </motion.button>

                            <motion.button
                                onClick={handleShare}
                                className="p-3 rounded-full border border-border hover:bg-secondary/50 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Share"
                            >
                                <Share2 className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Related Tracks */}
                {relatedTracks.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold">Related Tracks</h2>
                        <div className="glass-card p-4 space-y-1">
                            {relatedTracks.map((song, index) => (
                                <SongCard key={song.id} song={song} index={index} showIndex playlist={relatedTracks} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
};

export default TrackDetails;
