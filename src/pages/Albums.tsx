import { MainLayout } from '@/components/layout/MainLayout';
import { trendingSongs, topArtists } from '@/data/mockData';
import { motion } from 'framer-motion';
import { Disc3, Play, Clock, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { usePlayerStore } from '@/store/playerStore';

// Generate albums from mock data
const albums = [
    {
        id: 'album-1',
        name: 'Brahmastra OST',
        artist: 'Arijit Singh',
        image: 'https://i.ytimg.com/vi/vGJTaP6anOU/hqdefault.jpg',
        year: '2022',
        songs: 8,
    },
    {
        id: 'album-2',
        name: 'Shershaah OST',
        artist: 'Jubin Nautiyal',
        image: 'https://i.ytimg.com/vi/gvyUuxdRdR4/hqdefault.jpg',
        year: '2021',
        songs: 6,
    },
    {
        id: 'album-3',
        name: 'Coke Studio Season 14',
        artist: 'Various Artists',
        image: 'https://i.ytimg.com/vi/4Oi9pMBTjOs/hqdefault.jpg',
        year: '2022',
        songs: 12,
    },
    {
        id: 'album-4',
        name: 'Aashiqui 2 OST',
        artist: 'Arijit Singh',
        image: 'https://i.ytimg.com/vi/cYOxnNHg3ko/hqdefault.jpg',
        year: '2013',
        songs: 10,
    },
    {
        id: 'album-5',
        name: 'Jawan OST',
        artist: 'Arijit Singh & Shilpa Rao',
        image: 'https://i.ytimg.com/vi/caXgPO5803A/hqdefault.jpg',
        year: '2023',
        songs: 5,
    },
    {
        id: 'album-6',
        name: 'Bhediya OST',
        artist: 'Arijit Singh',
        image: 'https://i.ytimg.com/vi/ntWGH1dtxK0/hqdefault.jpg',
        year: '2022',
        songs: 4,
    },
    {
        id: 'album-7',
        name: 'Kabir Singh OST',
        artist: 'Tulsi Kumar & Akhil Sachdeva',
        image: 'https://i.ytimg.com/vi/oDNVbcz_cQo/hqdefault.jpg',
        year: '2019',
        songs: 7,
    },
    {
        id: 'album-8',
        name: 'Mercury - Act 1',
        artist: 'Imagine Dragons',
        image: 'https://i.ytimg.com/vi/K4DyBUG242c/hqdefault.jpg',
        year: '2021',
        songs: 13,
    },
];

const AlbumCard = ({ album, index }: { album: typeof albums[0]; index: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03 }}
            className="group cursor-pointer"
        >
            <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden mb-3 shadow-lg">
                <img
                    src={album.image}
                    alt={album.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Play Button */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    className="absolute bottom-3 right-3 p-3 sm:p-4 rounded-full bg-primary text-primary-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                >
                    <Play className="w-5 h-5 ml-0.5" />
                </motion.button>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{album.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{album.artist} • {album.year}</p>
        </motion.div>
    );
};

const Albums = () => {
    const featuredAlbum = albums[0];

    return (
        <>
            <Helmet>
                <title>Albums - Supersonic Music</title>
                <meta name="description" content="Browse albums from your favorite artists on Supersonic Music." />
            </Helmet>
            <MainLayout>
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
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Featured Album</h2>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row gap-6 md:gap-8 items-center glass-card p-6 md:p-8 rounded-3xl cursor-pointer group"
                        >
                            <div className="w-52 h-52 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-glow flex-shrink-0">
                                <img
                                    src={featuredAlbum.image}
                                    alt={featuredAlbum.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Featured Album</p>
                                <h3 className="text-3xl md:text-4xl font-bold mb-2">{featuredAlbum.name}</h3>
                                <p className="text-muted-foreground mb-1">{featuredAlbum.artist}</p>
                                <p className="text-sm text-muted-foreground mb-6">{featuredAlbum.year} • {featuredAlbum.songs} songs</p>
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
                    </section>

                    {/* New Releases */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-accent/10">
                                <Clock className="w-5 h-5 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold">New Releases</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {albums.slice(0, 5).map((album, index) => (
                                <AlbumCard key={album.id} album={album} index={index} />
                            ))}
                        </div>
                    </section>

                    {/* All Albums */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-purple-500/10">
                                <Disc3 className="w-5 h-5 text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold">All Albums</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                            {albums.map((album, index) => (
                                <AlbumCard key={album.id} album={album} index={index} />
                            ))}
                        </div>
                    </section>
                </div>
            </MainLayout>
        </>
    );
};

export default Albums;
