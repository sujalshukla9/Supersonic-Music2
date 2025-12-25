import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '@/types';
import { BACKEND_URL } from '@/config/api';

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    songs: Song[];
    thumbnail?: string;
    gradient?: string;
    createdAt: string;
    updatedAt: string;
    isLocal: boolean; // true if only in localStorage, false if synced to backend
}

interface PlaylistStore {
    playlists: Playlist[];
    isLoading: boolean;

    // Actions
    createPlaylist: (name: string, description?: string) => Playlist;
    deletePlaylist: (playlistId: string) => void;
    renamePlaylist: (playlistId: string, newName: string) => void;
    updateDescription: (playlistId: string, description: string) => void;

    // Song management
    addSongToPlaylist: (playlistId: string, song: Song) => void;
    removeSongFromPlaylist: (playlistId: string, songId: string) => void;
    moveSongInPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => void;

    // Getters
    getPlaylist: (playlistId: string) => Playlist | undefined;
    getPlaylistsWithSong: (songId: string) => Playlist[];
    isSongInPlaylist: (playlistId: string, songId: string) => boolean;

    // Sync
    syncWithBackend: () => Promise<void>;
}

// Generate a unique ID for new playlists
const generateId = () => `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Generate a gradient for new playlists
const gradients = [
    'from-purple-600 to-blue-500',
    'from-pink-500 to-orange-400',
    'from-yellow-500 to-red-500',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-teal-400',
    'from-green-500 to-emerald-400',
    'from-violet-500 to-purple-600',
    'from-indigo-500 to-blue-600',
    'from-amber-500 to-orange-500',
    'from-fuchsia-500 to-pink-500',
];

const getRandomGradient = () => gradients[Math.floor(Math.random() * gradients.length)];

export const usePlaylistStore = create<PlaylistStore>()(
    persist(
        (set, get) => ({
            playlists: [],
            isLoading: false,

            createPlaylist: (name, description) => {
                const now = new Date().toISOString();
                const newPlaylist: Playlist = {
                    id: generateId(),
                    name: name.trim(),
                    description: description?.trim() || undefined,
                    songs: [],
                    gradient: getRandomGradient(),
                    createdAt: now,
                    updatedAt: now,
                    isLocal: true,
                };

                set((state) => ({
                    playlists: [newPlaylist, ...state.playlists],
                }));

                // Try to sync with backend (non-blocking)
                get().syncWithBackend().catch(console.error);

                console.log('[Playlist] Created:', newPlaylist.name);
                return newPlaylist;
            },

            deletePlaylist: (playlistId) => {
                set((state) => ({
                    playlists: state.playlists.filter((p) => p.id !== playlistId),
                }));

                // Sync deletion with backend
                fetch(`${BACKEND_URL}/playlists/${playlistId}`, {
                    method: 'DELETE',
                }).catch(console.error);

                console.log('[Playlist] Deleted:', playlistId);
            },

            renamePlaylist: (playlistId, newName) => {
                set((state) => ({
                    playlists: state.playlists.map((p) =>
                        p.id === playlistId
                            ? { ...p, name: newName.trim(), updatedAt: new Date().toISOString() }
                            : p
                    ),
                }));
                get().syncWithBackend().catch(console.error);
            },

            updateDescription: (playlistId, description) => {
                set((state) => ({
                    playlists: state.playlists.map((p) =>
                        p.id === playlistId
                            ? { ...p, description: description.trim(), updatedAt: new Date().toISOString() }
                            : p
                    ),
                }));
                get().syncWithBackend().catch(console.error);
            },

            addSongToPlaylist: (playlistId, song) => {
                set((state) => ({
                    playlists: state.playlists.map((p) => {
                        if (p.id !== playlistId) return p;

                        // Don't add duplicates
                        if (p.songs.some((s) => s.id === song.id)) {
                            console.log('[Playlist] Song already in playlist');
                            return p;
                        }

                        const updatedPlaylist = {
                            ...p,
                            songs: [...p.songs, song],
                            // Use first song's thumbnail as playlist thumbnail
                            thumbnail: p.songs.length === 0 ? song.thumbnail : p.thumbnail,
                            updatedAt: new Date().toISOString(),
                        };

                        console.log('[Playlist] Added song to', p.name, ':', song.title);
                        return updatedPlaylist;
                    }),
                }));
                get().syncWithBackend().catch(console.error);
            },

            removeSongFromPlaylist: (playlistId, songId) => {
                set((state) => ({
                    playlists: state.playlists.map((p) => {
                        if (p.id !== playlistId) return p;

                        const updatedSongs = p.songs.filter((s) => s.id !== songId);
                        return {
                            ...p,
                            songs: updatedSongs,
                            // Update thumbnail if we removed the first song
                            thumbnail: updatedSongs[0]?.thumbnail || p.thumbnail,
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                }));
                get().syncWithBackend().catch(console.error);
            },

            moveSongInPlaylist: (playlistId, fromIndex, toIndex) => {
                set((state) => ({
                    playlists: state.playlists.map((p) => {
                        if (p.id !== playlistId) return p;

                        const songs = [...p.songs];
                        const [removed] = songs.splice(fromIndex, 1);
                        songs.splice(toIndex, 0, removed);

                        return {
                            ...p,
                            songs,
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                }));
            },

            getPlaylist: (playlistId) => {
                return get().playlists.find((p) => p.id === playlistId);
            },

            getPlaylistsWithSong: (songId) => {
                return get().playlists.filter((p) => p.songs.some((s) => s.id === songId));
            },

            isSongInPlaylist: (playlistId, songId) => {
                const playlist = get().getPlaylist(playlistId);
                return playlist ? playlist.songs.some((s) => s.id === songId) : false;
            },

            syncWithBackend: async () => {
                const { playlists } = get();

                try {
                    await fetch(`${BACKEND_URL}/playlists/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playlists }),
                    });

                    // Mark all as synced
                    set((state) => ({
                        playlists: state.playlists.map((p) => ({ ...p, isLocal: false })),
                    }));
                } catch (error) {
                    console.warn('[Playlist] Sync failed, keeping local:', error);
                }
            },
        }),
        {
            name: 'supersonic-playlists',
            version: 1,
        }
    )
);

// Export a hook to get playlists for a song (for "Add to Playlist" UI)
export const usePlaylistsForSong = (songId: string) => {
    return usePlaylistStore((state) =>
        state.playlists.map((p) => ({
            ...p,
            hasSong: p.songs.some((s) => s.id === songId),
        }))
    );
};
