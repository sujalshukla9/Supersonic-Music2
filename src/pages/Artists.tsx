import { MainLayout } from '@/components/layout/MainLayout';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { topArtists, trendingSongs } from '@/data/mockData';
import { SongCard } from '@/components/cards/SongCard';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Mic2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const Artists = () => {
    // Get featured artist (first one)
    const featuredArtist = topArtists[0];
    // Get songs by featured artist
    const featuredArtistSongs = trendingSongs.filter(song => song.artistId === featuredArtist.id);

    return (
        <>
            <Helmet>
                <title>Artists - Supersonic Music</title>
                <meta name="description" content="Discover top artists and their music on Supersonic Music." />
            </Helmet>
            <MainLayout>
                <div className="space-y-10">
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
                                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-glow flex-shrink-0">
                                    <img
                                        src={featuredArtist.image}
                                        alt={featuredArtist.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Featured Artist</p>
                                    <h3 className="text-3xl md:text-4xl font-bold mb-2">{featuredArtist.name}</h3>
                                    <p className="text-muted-foreground mb-4">{featuredArtist.followers} followers</p>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary"
                                    >
                                        Follow
                                    </motion.button>
                                </div>
                            </div>
                            {featuredArtistSongs.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="font-semibold text-lg mb-4">Popular Songs</h4>
                                    <div className="space-y-1">
                                        {featuredArtistSongs.slice(0, 4).map((song, index) => (
                                            <SongCard key={song.id} song={song} index={index} showIndex />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </section>

                    {/* Top Artists */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-accent/10">
                                <TrendingUp className="w-5 h-5 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold">Top Artists</h2>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {topArtists.map((artist, index) => (
                                <ArtistCard key={artist.id} artist={artist} index={index} />
                            ))}
                        </div>
                    </section>

                    {/* All Artists */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-purple-500/10">
                                <Users className="w-5 h-5 text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold">All Artists</h2>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
                            {[...topArtists, ...topArtists].map((artist, index) => (
                                <ArtistCard key={`${artist.id}-${index}`} artist={artist} index={index} />
                            ))}
                        </div>
                    </section>
                </div>
            </MainLayout>
        </>
    );
};

export default Artists;
