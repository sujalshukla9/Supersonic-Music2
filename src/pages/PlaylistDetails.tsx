import { useParams, useNavigate } from 'react-router-dom';
import { SongCard } from '@/components/cards/SongCard';
import { usePlaylistStore } from '@/store/playlistStore';
import { usePlayerStore } from '@/store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Shuffle, ListMusic, Trash2, Edit2, X, Clock, Music, MoreVertical } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Song } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PlaylistDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getPlaylist, removeSongFromPlaylist, renamePlaylist, updateDescription, deletePlaylist } = usePlaylistStore();
    const { setQueue, playSong } = usePlayerStore();

    const playlist = getPlaylist(id || '');

    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState(playlist?.name || '');
    const [editDesc, setEditDesc] = useState(playlist?.description || '');
    const [confirmDeleteSong, setConfirmDeleteSong] = useState<string | null>(null);

    if (!playlist) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <ListMusic className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Playlist not found</h2>
                <p className="text-muted-foreground mb-4">This playlist may have been deleted</p>
                <button
                    onClick={() => navigate('/playlists')}
                    className="text-primary hover:underline"
                >
                    Back to Playlists
                </button>
            </div>
        );
    }

    const handlePlayAll = () => {
        if (playlist.songs.length > 0) {
            setQueue(playlist.songs);
            playSong(playlist.songs[0]);
        }
    };

    const handleShuffle = () => {
        if (playlist.songs.length > 0) {
            const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
            setQueue(shuffled);
            playSong(shuffled[0]);
        }
    };

    const handleRemoveSong = (songId: string) => {
        removeSongFromPlaylist(playlist.id, songId);
        setConfirmDeleteSong(null);
    };

    const handleSaveEdit = () => {
        if (editName.trim()) {
            renamePlaylist(playlist.id, editName);
            updateDescription(playlist.id, editDesc);
            setShowEditModal(false);
        }
    };

    const handleDeletePlaylist = () => {
        deletePlaylist(playlist.id);
        navigate('/playlists');
    };

    const totalDuration = playlist.songs.reduce((acc, song) => acc + (song.durationSeconds || 0), 0);
    const formatTotalDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours} hr ${minutes} min`;
        }
        return `${minutes} min`;
    };

    return (
        <>
            <Helmet>
                <title>{playlist.name} - Supersonic Music</title>
                <meta name="description" content={playlist.description || `Playlist with ${playlist.songs.length} songs`} />
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
                        {/* Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${playlist.gradient || 'from-primary/30 to-accent/30'}`} />
                        {playlist.thumbnail && (
                            <img
                                src={playlist.thumbnail}
                                alt="Background"
                                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />

                        <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-8">
                            {/* Playlist Cover */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`w-40 h-40 md:w-56 md:h-56 rounded-2xl overflow-hidden ring-4 ring-primary/30 shadow-glow flex-shrink-0 bg-gradient-to-br ${playlist.gradient || 'from-primary/50 to-accent/50'} flex items-center justify-center`}
                            >
                                {playlist.thumbnail || playlist.songs[0]?.thumbnail ? (
                                    <img
                                        src={playlist.thumbnail || playlist.songs[0]?.thumbnail}
                                        alt={playlist.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ListMusic className="w-20 h-20 text-white/50" />
                                )}
                            </motion.div>

                            {/* Playlist Info */}
                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-primary uppercase tracking-wider">Playlist</span>
                                    <h1 className="text-4xl md:text-6xl font-bold">{playlist.name}</h1>
                                </div>

                                {playlist.description && (
                                    <p className="text-muted-foreground max-w-lg">{playlist.description}</p>
                                )}

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground text-sm">
                                    <div className="flex items-center gap-1">
                                        <Music className="w-4 h-4" />
                                        <span>{playlist.songs.length} songs</span>
                                    </div>
                                    {totalDuration > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatTotalDuration(totalDuration)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-4 justify-center md:justify-start pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handlePlayAll}
                                        disabled={playlist.songs.length === 0}
                                        className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary disabled:opacity-50"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        Play All
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleShuffle}
                                        disabled={playlist.songs.length === 0}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50"
                                    >
                                        <Shuffle className="w-5 h-5" />
                                        Shuffle
                                    </motion.button>

                                    {/* More Options */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="p-3 rounded-full border border-border/50 hover:bg-secondary/50 transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </motion.button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                                                <Edit2 className="w-4 h-4 mr-2" />
                                                Edit Playlist
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={handleDeletePlaylist}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete Playlist
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Song List */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Music className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">Songs</h2>
                    </div>

                    {playlist.songs.length > 0 ? (
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="space-y-1">
                                {playlist.songs.map((song, index) => (
                                    <div key={song.id} className="group flex items-center">
                                        <div className="flex-1">
                                            <SongCard
                                                song={song}
                                                index={index}
                                                showIndex
                                                playlist={playlist.songs}
                                            />
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setConfirmDeleteSong(song.id)}
                                            className="p-2 rounded-full opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all mr-2"
                                            title="Remove from playlist"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card p-10 rounded-2xl text-center">
                            <div className="p-6 rounded-full bg-secondary/50 inline-block mb-4">
                                <Music className="w-12 h-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No songs yet</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Add songs to this playlist by clicking the menu button on any song and selecting "Add to Playlist"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Edit Playlist</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
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
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Description</label>
                                    <textarea
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        placeholder="Add a description..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-border/50 font-medium hover:bg-secondary/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={!editName.trim()}
                                    className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Remove Song Confirmation */}
                {confirmDeleteSong && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setConfirmDeleteSong(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold mb-2">Remove Song?</h2>
                            <p className="text-muted-foreground mb-6">
                                Remove this song from the playlist?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDeleteSong(null)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-border/50 font-medium hover:bg-secondary/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleRemoveSong(confirmDeleteSong)}
                                    className="flex-1 px-4 py-3 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity"
                                >
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PlaylistDetails;
