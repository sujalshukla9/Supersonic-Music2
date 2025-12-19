import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '@/types';
import { BACKEND_URL } from '@/config/api';

// Extended Song type with likedAt timestamp
export interface LikedSong extends Song {
    likedAt?: string;
}

interface LikesState {
    likedSongs: LikedSong[];
    isLoading: boolean;

    // Actions
    likeSong: (song: Song) => void;
    unlikeSong: (songId: string) => void;
    toggleLike: (song: Song) => void;
    isLiked: (songId: string) => boolean;
    clearLikedSongs: () => void;
    syncWithBackend: () => Promise<void>;
}

// Helper to sync with backend
async function syncToggleLike(song: Song): Promise<boolean> {
    try {
        const response = await fetch(`${BACKEND_URL}/favorites/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song })
        });
        if (response.ok) {
            const data = await response.json();
            return data.liked;
        }
    } catch (e) {
        console.log('[Likes] Sync failed:', e);
    }
    return false;
}

export const useLikesStore = create<LikesState>()(
    persist(
        (set, get) => ({
            likedSongs: [],
            isLoading: false,

            likeSong: (song) => {
                const { likedSongs } = get();
                if (!likedSongs.find(s => s.id === song.id)) {
                    set({ likedSongs: [{ ...song, likedAt: new Date().toISOString() }, ...likedSongs] });
                    // Sync to backend
                    syncToggleLike(song);
                }
            },

            unlikeSong: (songId) => {
                const { likedSongs } = get();
                const song = likedSongs.find(s => s.id === songId);
                set({ likedSongs: likedSongs.filter(s => s.id !== songId) });
                // Sync to backend
                if (song) syncToggleLike(song);
            },

            toggleLike: (song) => {
                const { likedSongs } = get();
                const isCurrentlyLiked = likedSongs.some(s => s.id === song.id);

                if (isCurrentlyLiked) {
                    set({ likedSongs: likedSongs.filter(s => s.id !== song.id) });
                } else {
                    set({ likedSongs: [{ ...song, likedAt: new Date().toISOString() }, ...likedSongs] });
                }

                // Sync to backend (toggle endpoint handles both like/unlike)
                syncToggleLike(song);
            },

            isLiked: (songId) => {
                const { likedSongs } = get();
                return likedSongs.some(s => s.id === songId);
            },

            clearLikedSongs: () => {
                set({ likedSongs: [] });
            },

            syncWithBackend: async () => {
                set({ isLoading: true });
                try {
                    const response = await fetch(`${BACKEND_URL}/favorites`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.favorites && Array.isArray(data.favorites)) {
                            // Merge backend favorites with local
                            const { likedSongs } = get();
                            const merged = [...data.favorites];

                            // Add local songs not in backend
                            for (const local of likedSongs) {
                                if (!merged.find((s: LikedSong) => s.id === local.id)) {
                                    merged.push(local);
                                    // Sync to backend
                                    syncToggleLike(local);
                                }
                            }

                            set({ likedSongs: merged });
                        }
                    }
                } catch (e) {
                    console.log('[Likes] Backend sync failed:', e);
                } finally {
                    set({ isLoading: false });
                }
            }
        }),
        {
            name: 'supersonic-liked-songs',
        }
    )
);
