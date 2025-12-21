/**
 * Player Store - Zustand store for music player state management
 * Manages current song, playback state, queue, history, and UI states
 * Updated: Force refresh
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAutoplayQueue } from '@/lib/youtube';
import { Song, AudioMetadata } from '@/types';
import { useSettingsStore } from './settingsStore';
export type { Song, AudioMetadata };

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
    // Current playback state
    currentSong: Song | null;
    isPlaying: boolean;
    volume: number;
    progress: number;
    shuffle: boolean;
    repeat: RepeatMode;
    audioMetadata: AudioMetadata | null;

    // Queue management
    queue: Song[];
    history: Song[];

    // UI state
    isSidebarOpen: boolean;
    isRightPanelOpen: boolean;
    isFullPlayer: boolean;
    isLoadingAutoplay: boolean;
    showQueueInFullPlayer: boolean;
    isBuffering: boolean;

    // Seeking state
    isSeeking: boolean;
    seekTime: number | null;

    // Actions - Playback Control
    playSong: (song: Song) => void;
    togglePlay: () => void;
    setIsPlaying: (playing: boolean) => void;
    nextSong: () => void;
    previousSong: () => void;
    setAudioMetadata: (metadata: AudioMetadata | null) => void;

    // Actions - Volume & Progress
    setVolume: (volume: number) => void;
    setProgress: (progress: number) => void;
    seekTo: (time: number) => void;
    resetSeek: () => void;
    setIsSeeking: (seeking: boolean) => void;

    // Actions - Playback Modes
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    toggleAutoplay: () => void;

    // Actions - Queue Management
    setQueue: (queue: Song[]) => void;
    addToQueue: (song: Song) => void;
    addToQueueNext: (song: Song) => void;
    removeFromQueue: (songId: string) => void;
    clearQueue: () => void;
    playFromList: (songs: Song[], startIndex: number) => void;

    // Actions - UI
    toggleSidebar: () => void;
    toggleRightPanel: () => void;
    toggleFullPlayer: () => void;
    openFullPlayerWithQueue: () => void;
    setShowQueueInFullPlayer: (show: boolean) => void;
    setIsBuffering: (buffering: boolean) => void;

    // Actions - History
    addToHistory: (song: Song) => void;
    clearHistory: () => void;
}

// Helper function to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            // Initial state
            currentSong: null,
            isPlaying: false,
            volume: 80,
            progress: 0,
            shuffle: false,
            repeat: 'off',
            audioMetadata: null,
            queue: [],
            history: [],
            isSidebarOpen: false,
            isRightPanelOpen: false,
            isFullPlayer: false,
            isLoadingAutoplay: false,
            showQueueInFullPlayer: false,
            isBuffering: false,
            isSeeking: false,
            seekTime: null,

            // Play a song
            playSong: (song) => {
                const { addToHistory, queue } = get();

                // Add to history
                addToHistory(song);

                // Add to queue if not already there
                if (!queue.find(s => s.id === song.id)) {
                    set({ queue: [...queue, song] });
                }

                set({
                    currentSong: song,
                    isPlaying: true,
                    progress: 0,
                    audioMetadata: null, // Reset for new song
                    isRightPanelOpen: window.innerWidth >= 1280 ? true : get().isRightPanelOpen,
                });
            },

            // Toggle play/pause
            togglePlay: () => {
                const { isPlaying, currentSong } = get();
                if (currentSong) {
                    set({ isPlaying: !isPlaying });
                }
            },

            // Set playing state
            setIsPlaying: (playing) => set({ isPlaying: playing }),

            // Next song
            nextSong: async () => {
                const { currentSong, queue, shuffle, repeat, addToHistory } = get();
                if (!currentSong) return;

                const currentIndex = queue.findIndex(s => s.id === currentSong.id);
                let nextIndex: number;

                if (shuffle) {
                    // Random next song (excluding current)
                    const availableIndices = queue.map((_, i) => i).filter(i => i !== currentIndex);
                    if (availableIndices.length === 0) {
                        // Only one song in queue
                        if (repeat !== 'off') {
                            set({ progress: 0 });
                            return;
                        }
                        set({ isPlaying: false });
                        return;
                    }
                    nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                } else {
                    nextIndex = currentIndex + 1;
                }

                if (nextIndex >= queue.length) {
                    if (repeat === 'all') {
                        nextIndex = 0;
                    } else if (repeat === 'one') {
                        set({ progress: 0 });
                        return;
                    } else {
                        // Check if autoplay is enabled in settings and fetch more songs
                        const { isLoadingAutoplay } = get();
                        const autoPlayEnabled = useSettingsStore.getState().autoPlay;

                        if (!isLoadingAutoplay && autoPlayEnabled) {
                            set({ isLoadingAutoplay: true });
                            try {
                                const autoplayVideos = await getAutoplayQueue(currentSong.id, 20);
                                if (autoplayVideos && autoplayVideos.length > 0) {
                                    const newSongs: Song[] = autoplayVideos.map(v => ({
                                        id: v.id,
                                        title: v.title,
                                        artist: v.channelTitle || '',
                                        channelId: v.channelId,
                                        thumbnail: v.thumbnail || '',
                                        duration: v.duration || '0:00',
                                        durationSeconds: v.durationSeconds || 0,
                                    }));

                                    const existingIds = new Set(queue.map(s => s.id));
                                    const uniqueNewSongs = newSongs.filter(s => !existingIds.has(s.id));

                                    if (uniqueNewSongs.length > 0) {
                                        const newQueue = [...queue, ...uniqueNewSongs];
                                        set({ queue: newQueue, isLoadingAutoplay: false });

                                        // Play the first new song
                                        const firstNewSong = uniqueNewSongs[0];
                                        addToHistory(firstNewSong);
                                        set({
                                            currentSong: firstNewSong,
                                            isPlaying: true,
                                            progress: 0,
                                        });
                                        return;
                                    }
                                }
                            } catch (e) {
                                console.error('[Autoplay] Failed to fetch:', e);
                            }
                            set({ isLoadingAutoplay: false });
                        }

                        // No more songs
                        set({ isPlaying: false });
                        return;
                    }
                }

                const nextSong = queue[nextIndex];
                if (nextSong) {
                    addToHistory(nextSong);
                    set({
                        currentSong: nextSong,
                        isPlaying: true,
                        progress: 0,
                    });
                }
            },

            // Previous song
            previousSong: () => {
                const { currentSong, queue, progress, addToHistory } = get();
                if (!currentSong) return;

                // If more than 3 seconds in, restart current song
                if (progress > 3) {
                    set({ progress: 0, seekTime: 0 });
                    return;
                }

                const currentIndex = queue.findIndex(s => s.id === currentSong.id);
                let prevIndex = currentIndex - 1;

                if (prevIndex < 0) {
                    prevIndex = queue.length - 1;
                }

                const prevSong = queue[prevIndex];
                if (prevSong) {
                    addToHistory(prevSong);
                    set({
                        currentSong: prevSong,
                        isPlaying: true,
                        progress: 0,
                    });
                }
            },

            // Set audio metadata and sync to current song record
            setAudioMetadata: (metadata) => {
                const { currentSong, queue, history } = get();
                if (!currentSong || !metadata) {
                    set({ audioMetadata: metadata });
                    return;
                }

                // Update metadata in store
                set({ audioMetadata: metadata });

                // Sync metadata to current song object
                const updatedSong = { ...currentSong, quality: metadata };

                // Update in queue
                const updatedQueue = queue.map(s => s.id === currentSong.id ? updatedSong : s);

                // Update in history
                const updatedHistory = history.map(s => s.id === currentSong.id ? updatedSong : s);

                set({
                    currentSong: updatedSong,
                    queue: updatedQueue,
                    history: updatedHistory
                });
            },

            // Volume control
            setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),

            // Progress control
            setProgress: (progress) => set({ progress }),

            // Seek to specific time
            seekTo: (time) => {
                set({ seekTime: time, progress: time, isSeeking: false });
            },

            // Reset seek
            resetSeek: () => set({ seekTime: null }),

            // Set seeking state
            setIsSeeking: (seeking) => set({ isSeeking: seeking }),

            // Toggle shuffle
            toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

            // Toggle repeat mode: off -> all -> one -> off
            toggleRepeat: () =>
                set((state) => ({
                    repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
                })),

            // Toggle autoplay - updates settings store
            toggleAutoplay: () => {
                const settingsStore = useSettingsStore.getState();
                settingsStore.setSetting('autoPlay', !settingsStore.autoPlay);
            },

            // Queue management
            setQueue: (queue) => set({ queue }),

            addToQueue: (song) => {
                const { queue } = get();
                if (!queue.find(s => s.id === song.id)) {
                    set({ queue: [...queue, song] });
                }
            },

            addToQueueNext: (song) => {
                const { queue, currentSong } = get();
                if (queue.find(s => s.id === song.id)) return;

                if (!currentSong) {
                    set({ queue: [song, ...queue] });
                    return;
                }

                const currentIndex = queue.findIndex(s => s.id === currentSong.id);
                const newQueue = [...queue];
                newQueue.splice(currentIndex + 1, 0, song);
                set({ queue: newQueue });
            },

            removeFromQueue: (songId) => {
                const { queue, currentSong } = get();
                const isCurrentSong = currentSong?.id === songId;
                const newQueue = queue.filter(s => s.id !== songId);

                if (isCurrentSong && newQueue.length > 0) {
                    // If removing current song, play next
                    set({
                        queue: newQueue,
                        currentSong: newQueue[0],
                        progress: 0,
                    });
                } else {
                    set({ queue: newQueue });
                }
            },

            clearQueue: () => set({ queue: [], currentSong: null, isPlaying: false }),

            // Play from a list of songs starting at index
            playFromList: (songs, startIndex) => {
                const { shuffle, addToHistory } = get();

                let orderedSongs = [...songs];
                let songToPlay = orderedSongs[startIndex];

                if (shuffle) {
                    // Keep the starting song at the beginning, shuffle the rest
                    const restOfSongs = orderedSongs.filter((_, i) => i !== startIndex);
                    const shuffledRest = shuffleArray(restOfSongs);
                    orderedSongs = [songToPlay, ...shuffledRest];
                } else {
                    // Reorder so starting song is first
                    orderedSongs = [...orderedSongs.slice(startIndex), ...orderedSongs.slice(0, startIndex)];
                    songToPlay = orderedSongs[0];
                }

                addToHistory(songToPlay);
                set({
                    queue: orderedSongs,
                    currentSong: songToPlay,
                    isPlaying: true,
                    progress: 0,
                });
            },

            // UI toggles
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
            toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
            toggleFullPlayer: () => set((state) => ({ isFullPlayer: !state.isFullPlayer, showQueueInFullPlayer: false })),
            openFullPlayerWithQueue: () => set({ isFullPlayer: true, showQueueInFullPlayer: true }),
            setShowQueueInFullPlayer: (show) => set({ showQueueInFullPlayer: show }),
            setIsBuffering: (buffering) => set({ isBuffering: buffering }),

            // History management
            addToHistory: (song) => {
                const { history } = get();
                // Remove if already exists (to move to front)
                const filteredHistory = history.filter(s => s.id !== song.id);
                const songWithTimestamp = { ...song, playedAt: new Date().toISOString() };
                // Keep only last 100 songs
                const newHistory = [songWithTimestamp, ...filteredHistory].slice(0, 100);
                set({ history: newHistory });
            },

            clearHistory: () => set({ history: [] }),
        }),
        {
            name: 'supersonic-player',
            partialize: (state) => ({
                volume: state.volume,
                shuffle: state.shuffle,
                repeat: state.repeat,
                history: state.history.slice(0, 50), // Only persist last 50 history items
                queue: state.queue.slice(0, 100), // Limit persisted queue
            }),
        }
    )
);
