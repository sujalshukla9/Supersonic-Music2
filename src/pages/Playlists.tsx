import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { SongCard } from '@/components/cards/SongCard';
import { playlists as mockPlaylists } from '@/data/mockData';
import { usePlaylistStore, Playlist } from '@/store/playlistStore';
import { usePlayerStore } from '@/store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Plus, Sparkles, X, Play, Shuffle, Trash2, Edit2, Music } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Playlists = () => {
    const { playlists, createPlaylist, deletePlaylist, renamePlaylist } = usePlaylistStore();
    const { setQueue, playSong } = usePlayerStore();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
    const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
    const [editName, setEditName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const handleCreatePlaylist = () => {
        if (!newPlaylistName.trim()) return;

        createPlaylist(newPlaylistName, newPlaylistDesc);
        setShowCreateModal(false);
        setNewPlaylistName('');
        setNewPlaylistDesc('');
    };

    const handlePlayPlaylist = (playlist: Playlist) => {
        if (playlist.songs.length > 0) {
            setQueue(playlist.songs);
            playSong(playlist.songs[0]);
        }
    };

    const handleShufflePlaylist = (playlist: Playlist) => {
        if (playlist.songs.length > 0) {
            const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
            setQueue(shuffled);
            playSong(shuffled[0]);
        }
    };

    const handleDeletePlaylist = (playlistId: string) => {
        deletePlaylist(playlistId);
        setConfirmDelete(null);
    };

    const handleRename = () => {
        if (editingPlaylist && editName.trim()) {
            renamePlaylist(editingPlaylist.id, editName);
            setEditingPlaylist(null);
            setEditName('');
        }
    };

    const startEditing = (playlist: Playlist) => {
        setEditingPlaylist(playlist);
        setEditName(playlist.name);
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
                            {playlists.length} custom playlists • {mockPlaylists.length} curated collections
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
                {playlists.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <ListMusic className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Your Library</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {playlists.map((playlist, index) => (
                                <motion.div
                                    key={playlist.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group"
                                >
                                    <div className="glass-card p-4 rounded-2xl">
                                        {/* Playlist Cover */}
                                        <Link to={`/playlist/${playlist.id}`}>
                                            <div className={`relative aspect-square rounded-xl overflow-hidden mb-4 bg-gradient-to-br ${playlist.gradient || 'from-primary/30 to-accent/30'} flex items-center justify-center cursor-pointer group-hover:scale-[1.02] transition-transform`}>
                                                {playlist.thumbnail || (playlist.songs[0]?.thumbnail) ? (
                                                    <img
                                                        src={playlist.thumbnail || playlist.songs[0]?.thumbnail}
                                                        alt={playlist.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <ListMusic className="w-16 h-16 text-white/50" />
                                                )}

                                                {/* Play overlay */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handlePlayPlaylist(playlist);
                                                        }}
                                                        className="p-3 rounded-full bg-primary text-primary-foreground shadow-lg"
                                                    >
                                                        <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleShufflePlaylist(playlist);
                                                        }}
                                                        className="p-3 rounded-full bg-secondary text-foreground shadow-lg"
                                                    >
                                                        <Shuffle className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Playlist Info */}
                                        <div className="flex items-start justify-between">
                                            <Link to={`/playlist/${playlist.id}`} className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm line-clamp-1 hover:text-primary transition-colors cursor-pointer">
                                                    {playlist.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {playlist.songs.length} songs
                                                </p>
                                            </Link>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditing(playlist)}
                                                    className="p-1.5 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                                                    title="Rename"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(playlist.id)}
                                                    className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {playlists.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-10 rounded-2xl text-center"
                    >
                        <div className="p-6 rounded-full bg-secondary/50 inline-block mb-4">
                            <Music className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No playlists yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Create your first playlist to organize your favorite songs
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCreateModal(true)}
                            className="px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold"
                        >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Create Playlist
                        </motion.button>
                    </motion.div>
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
                {showCreateModal && (
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
                            className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
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
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
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
                                    disabled={!newPlaylistName.trim()}
                                    className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Edit Playlist Modal */}
                {editingPlaylist && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setEditingPlaylist(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Rename Playlist</h2>
                                <button
                                    onClick={() => setEditingPlaylist(null)}
                                    className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingPlaylist(null)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-border/50 font-medium hover:bg-secondary/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRename}
                                    disabled={!editName.trim()}
                                    className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Delete Confirmation Modal */}
                {confirmDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setConfirmDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 rounded-full bg-destructive/10 inline-block mb-4">
                                <Trash2 className="w-8 h-8 text-destructive" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Delete Playlist?</h2>
                            <p className="text-muted-foreground mb-6">
                                This action cannot be undone. All songs in this playlist will be removed.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-border/50 font-medium hover:bg-secondary/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeletePlaylist(confirmDelete)}
                                    className="flex-1 px-4 py-3 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Playlists;
