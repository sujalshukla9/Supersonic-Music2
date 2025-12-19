
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { playlists as mockPlaylists } from '@/data/mockData';
import { getUserPlaylists, createPlaylist } from '@/lib/youtube';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Plus, Sparkles, Loader2, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '@/store/playerStore';

interface UserPlaylist {
    id: string;
    name: string;
    description?: string;
    items: any[];
    createdAt: string;
    thumbnail?: string;
}

const Playlists = () => {
    const { playFromList } = usePlayerStore();
    const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchPlaylists = useCallback(async () => {
        setIsLoading(true);
        try {
            const playlists = await getUserPlaylists();
            setUserPlaylists(playlists);
        } catch (error) {
            console.error('[Playlists] Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlaylists();
    }, [fetchPlaylists]);

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;

        setIsCreating(true);
        try {
            const playlist = await createPlaylist(newPlaylistName, newPlaylistDesc);
            if (playlist) {
                setUserPlaylists(prev => [playlist, ...prev]);
                setShowCreateModal(false);
                setNewPlaylistName('');
                setNewPlaylistDesc('');
            }
        } catch (error) {
            console.error('[Create Playlist] Error:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Playlists - Supersonic Music</title>
                <meta name="description" content="Browse and manage your playlists on Supersonic Music." />
            </Helmet>

            <div className="space-y-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Your Playlists</h1>
                        <p className="text-muted-foreground text-lg">
                            {userPlaylists.length + mockPlaylists.length} playlists • Curated just for you
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary"
                    >
                        <Plus className="w-5 h-5" />
                        New Playlist
                    </motion.button>
                </motion.div>

                {/* User Playlists */}
                {userPlaylists.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <ListMusic className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Your Library</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {userPlaylists.map((playlist, index) => (
                                <motion.div
                                    key={playlist.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group cursor-pointer"
                                    onClick={() => {
                                        if (playlist.items && playlist.items.length > 0) {
                                            playFromList(playlist.items, 0);
                                        }
                                    }}
                                >
                                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 mb-3 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                                        {playlist.items?.[0]?.thumbnail ? (
                                            <img
                                                src={playlist.items[0].thumbnail}
                                                alt={playlist.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <ListMusic className="w-12 h-12 text-primary/50" />
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                whileHover={{ opacity: 1, scale: 1 }}
                                                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </motion.div>
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                        {playlist.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {playlist.items?.length || 0} songs
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Featured Playlist */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">Featured</h2>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-3xl overflow-hidden h-64 cursor-pointer group"
                    >
                        <img
                            src={mockPlaylists[0].thumbnail}
                            alt={mockPlaylists[0].name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-r ${mockPlaylists[0].gradient} opacity-70`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Featured Playlist</p>
                            <h3 className="text-4xl font-bold mb-2">{mockPlaylists[0].name}</h3>
                            <p className="text-muted-foreground">{mockPlaylists[0].description}</p>
                        </div>
                    </motion.div>
                </section>

                {/* All Playlists */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-accent/10">
                            <ListMusic className="w-5 h-5 text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold">Discover Playlists</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {mockPlaylists.map((playlist, index) => (
                            <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
                        ))}
                    </div>
                </section>
            </div>

            {/* Create Playlist Modal */}
            <AnimatePresence>
                {
                    showCreateModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                            onClick={() => setShowCreateModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-background rounded-2xl p-6 w-full max-w-md shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold">Create Playlist</h2>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Name</label>
                                        <input
                                            type="text"
                                            value={newPlaylistName}
                                            onChange={(e) => setNewPlaylistName(e.target.value)}
                                            placeholder="My Awesome Playlist"
                                            className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description (optional)</label>
                                        <textarea
                                            value={newPlaylistDesc}
                                            onChange={(e) => setNewPlaylistDesc(e.target.value)}
                                            placeholder="Add a description..."
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-3 rounded-lg border border-border/50 font-medium hover:bg-secondary/50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreatePlaylist}
                                        disabled={!newPlaylistName.trim() || isCreating}
                                        className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </>
    );
};

export default Playlists;
