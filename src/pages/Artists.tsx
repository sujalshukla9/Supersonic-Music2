
import { ArtistCard } from '@/components/cards/ArtistCard';
import { SongCard } from '@/components/cards/SongCard';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Mic2, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { searchArtists, getArtistDetails, durationToSeconds } from '@/lib/youtube';
import { Artist } from '@/data/mockData';
import { usePlayerStore } from '@/store/playerStore';
import { Song } from '@/types';
import { useNavigate } from 'react-router-dom';

const Artists = () => {
    const navigate = useNavigate();
    const [featuredArtist, setFeaturedArtist] = useState<Artist | null>(null);
    const [featuredSongs, setFeaturedSongs] = useState<Song[]>([]);
    const [topArtistsList, setTopArtistsList] = useState<Artist[]>([]);
    const [allArtistsList, setAllArtistsList] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { playFromList } = usePlayerStore();

    useEffect(() => {
        const fetchArtists = async () => {
            setIsLoading(true);
            try {
                // Fetch top artists (India/Global mix for variety)
                const [topResults, globalResults] = await Promise.all([
                    searchArtists('top music artists india', 8),
                    searchArtists('popular global singers', 12)
                ]);

                // Map to Artist interface - searchArtists returns { id, name, thumbnail, subscribers }
                const mapToArtist = (item: any): Artist => ({
                    id: item.id,
                    name: item.name,
                    image: item.thumbnail,
                    followers: item.subscribers || 'Popular',
                    verified: true
                });

                const topMapped = topResults.map(mapToArtist);
                const globalMapped = globalResults.map(mapToArtist);

                if (topMapped.length > 0) {
                    const featured = topMapped[0];
                    setFeaturedArtist(featured);
                    setTopArtistsList(topMapped.slice(1));

                    // Fetch details for featured artist to get songs and real follower count
                    const details = await getArtistDetails(featured.id);
                    if (details) {
                        if (details.artist) {
                            setFeaturedArtist({
                                ...featured,
                                followers: details.artist.subscriberCount || 'Popular',
                                image: details.artist.thumbnail || featured.image
                            });
                        }

                        if (details.topTracks) {
                            const songs: Song[] = details.topTracks.slice(0, 4).map(track => ({
                                id: track.id,
                                title: track.title,
                                artist: track.channelTitle,
                                artistId: track.channelId || featured.id,
                                thumbnail: track.thumbnail,
                                duration: track.duration || '0:00',
                                durationSeconds: track.durationSeconds || durationToSeconds(track.duration || '0:00')
                            }));
                            setFeaturedSongs(songs);
                        }
                    }
                }

                setAllArtistsList([...topMapped.slice(1), ...globalMapped]);

            } catch (error) {
                console.error('Error fetching artists:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchArtists();
    }, []);

    const handlePlayFeatured = (index: number) => {
        if (featuredSongs.length > 0) {
            playFromList(featuredSongs, index);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Artists - Supersonic Music</title>
                <meta name="description" content="Discover top artists and their music on Supersonic Music." />
            </Helmet>

            <div className="space-y-10 pb-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl font-bold mb-2">Artists</h1>
                    <p className="text-muted-foreground text-lg">
                        Your favorite artists in one place
                    </p>
                </motion.div>

                {/* Featured Artist */}
                {featuredArtist && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Mic2 className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Featured Artist</h2>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-6 md:p-8 rounded-3xl"
                        >
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                                <div
                                    onClick={() => navigate(`/artist/${featuredArtist.id}`)}
                                    className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-glow flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                >
                                    <img
                                        src={featuredArtist.image}
                                        alt={featuredArtist.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Featured Artist</p>
                                    <h3
                                        onClick={() => navigate(`/artist/${featuredArtist.id}`)}
                                        className="text-3xl md:text-4xl font-bold mb-2 cursor-pointer hover:text-primary transition-colors"
                                    >
                                        {featuredArtist.name}
                                    </h3>
                                    <p className="text-muted-foreground mb-4">{featuredArtist.followers} followers</p>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/artist/${featuredArtist.id}`)}
                                        className="px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary"
                                    >
                                        View Profile
                                    </motion.button>
                                </div>
                            </div>
                            {featuredSongs.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="font-semibold text-lg mb-4">Popular Songs</h4>
                                    <div className="space-y-1">
                                        {featuredSongs.map((song, index) => (
                                            <div key={song.id} onClick={() => handlePlayFeatured(index)}>
                                                <SongCard song={song} index={index} showIndex playlist={featuredSongs} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </section>
                )}

                {/* Top Artists */}
                {topArtistsList.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-accent/10">
                                <TrendingUp className="w-5 h-5 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold">Top Artists</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                            {topArtistsList.map((artist, index) => (
                                <ArtistCard key={artist.id} artist={artist} index={index} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Artists */}
                {allArtistsList.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-purple-500/10">
                                <Users className="w-5 h-5 text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold">Discover More</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                            {allArtistsList.map((artist, index) => (
                                <ArtistCard key={`${artist.id}-${index}`} artist={artist} index={index} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
};

export default Artists;
