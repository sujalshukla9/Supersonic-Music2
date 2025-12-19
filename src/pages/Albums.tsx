
import { motion } from 'framer-motion';
import { Disc3, Play, Clock, Sparkles, Loader2, Music } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { usePlayerStore } from '@/store/playerStore';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '@/config/api';

interface Album {
    id: string;
    title: string;
    artist: string;
    artistId?: string;
    thumbnail: string;
    year: string;
    type?: string;
    isExplicit?: boolean;
}

const AlbumCard = ({ album, index }: { album: Album; index: number }) => {
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);

    const handleClick = () => {
        navigate(`/album/${album.id}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03 }}
            className="group cursor-pointer"
            onClick={handleClick}
        >
            <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden mb-3 shadow-lg">
                {imageError ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Disc3 className="w-12 h-12 text-muted-foreground" />
                    </div>
                ) : (
                    <img
                        src={album.thumbnail}
                        alt={album.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImageError(true)}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Play Button */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    className="absolute bottom-3 right-3 p-3 sm:p-4 rounded-full bg-primary text-primary-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClick();
                    }}
                >
                    <Play className="w-5 h-5 ml-0.5" />
                </motion.button>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{album.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{album.artist} • {album.year || 'Album'}</p>
        </motion.div>
    );
};

const Albums = () => {
    const [newReleases, setNewReleases] = useState<Album[]>([]);
    const [searchedAlbums, setSearchedAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAlbums = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch new releases
                const newReleasesRes = await fetch(`${BACKEND_URL}/albums/new?maxResults=10`);
                const newReleasesData = await newReleasesRes.json();

                if (newReleasesData.albums) {
                    setNewReleases(newReleasesData.albums);
                }

                // Search for popular albums
                const popularRes = await fetch(`${BACKEND_URL}/albums/search?q=best albums india&maxResults=16`);
                const popularData = await popularRes.json();

                if (popularData.albums) {
                    setSearchedAlbums(popularData.albums);
                }
            } catch (err) {
                console.error('Error fetching albums:', err);
                setError('Failed to load albums');
            } finally {
                setLoading(false);
            }
        };

        fetchAlbums();
    }, []);

    const featuredAlbum = newReleases[0];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading albums...</p>
                </div>
            </div>
        );
    }

    if (error && newReleases.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Disc3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Albums - Supersonic Music</title>
                <meta name="description" content="Browse albums from your favorite artists on Supersonic Music." />
            </Helmet>

            <div className="space-y-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl font-bold mb-2">Albums</h1>
                    <p className="text-muted-foreground text-lg">
                        Full albums from top artists
                    </p>
                </motion.div>

                {/* Featured Album */}
                {featuredAlbum && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Featured Album</h2>
                        </div>
                        <Link to={`/album/${featuredAlbum.id}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col md:flex-row gap-6 md:gap-8 items-center glass-card p-6 md:p-8 rounded-3xl cursor-pointer group"
                            >
                                <div className="w-52 h-52 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-glow flex-shrink-0">
                                    <img
                                        src={featuredAlbum.thumbnail}
                                        alt={featuredAlbum.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Featured Album</p>
                                    <h3 className="text-3xl md:text-4xl font-bold mb-2">{featuredAlbum.title}</h3>
                                    <p className="text-muted-foreground mb-1">{featuredAlbum.artist}</p>
                                    <p className="text-sm text-muted-foreground mb-6">{featuredAlbum.year || 'Album'}</p>
                                    <div className="flex items-center gap-4 justify-center md:justify-start">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary"
                                        >
                                            <Play className="w-5 h-5" />
                                            Play
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    </section>
                )}

                {/* New Releases */}
                {newReleases.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-accent/10">
                                <Clock className="w-5 h-5 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold">New Releases</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {newReleases.slice(0, 5).map((album, index) => (
                                <AlbumCard key={album.id} album={album} index={index} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Albums */}
                {searchedAlbums.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-purple-500/10">
                                <Disc3 className="w-5 h-5 text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold">Popular Albums</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                            {searchedAlbums.map((album, index) => (
                                <AlbumCard key={album.id} album={album} index={index} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {newReleases.length === 0 && searchedAlbums.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                        <Music className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Albums Found</h3>
                        <p className="text-muted-foreground">Try searching for your favorite albums</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default Albums;
