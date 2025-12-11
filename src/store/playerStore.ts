import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  channelId?: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  color?: string;
  moods?: string[];
  source?: string;
}

interface PlayerState {
  // State
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  queue: Song[];
  history: Song[];
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  autoplay: boolean;
  isFullPlayer: boolean;
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isLoadingAutoplay: boolean;

  // Actions
  playSong: (song: Song) => void;
  playFromList: (songs: Song[], startIndex?: number) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  nextSong: () => void;
  previousSong: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  addToQueueNext: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
  clearQueue: () => void;
  toggleFullPlayer: () => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  loadAutoplayQueue: (seedVideoId: string) => Promise<void>;
  addToHistory: (song: Song) => void;
}

// Helper to sync with backend
async function syncHistoryToBackend(song: Song) {
  try {
    await fetch(`${BACKEND_URL}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song })
    });
  } catch (e) {
    console.log('[History] Sync failed:', e);
  }
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      volume: 80,
      progress: 0,
      queue: [],
      history: [],
      shuffle: false,
      repeat: 'off',
      autoplay: true,
      isFullPlayer: false,
      isSidebarOpen: false,
      isRightPanelOpen: true,
      isLoadingAutoplay: false,

      playSong: (song) => {
        const { queue, history, addToHistory } = get();
        const existingIndex = queue.findIndex(s => s.id === song.id);

        // Add to history
        addToHistory(song);

        if (existingIndex === -1) {
          set({
            currentSong: song,
            isPlaying: true,
            progress: 0,
            isRightPanelOpen: true,
            queue: [...queue, song]
          });
        } else {
          set({
            currentSong: song,
            isPlaying: true,
            progress: 0,
            isRightPanelOpen: true
          });
        }
      },

      playFromList: (songs, startIndex = 0) => {
        if (songs.length === 0) return;
        const songToPlay = songs[startIndex] || songs[0];
        const { addToHistory } = get();

        addToHistory(songToPlay);

        set({
          queue: songs,
          currentSong: songToPlay,
          isPlaying: true,
          progress: 0,
          isRightPanelOpen: true
        });
      },

      togglePlay: () => {
        set((state) => ({ isPlaying: !state.isPlaying }));
      },

      setIsPlaying: (isPlaying) => {
        set({ isPlaying });
      },

      setVolume: (volume) => {
        set({ volume });
      },

      setProgress: (progress) => {
        set({ progress });
      },

      nextSong: async () => {
        const { queue, currentSong, shuffle, repeat, autoplay, loadAutoplayQueue, addToHistory } = get();
        if (queue.length === 0) return;

        const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
        let nextIndex: number;

        if (shuffle) {
          // Don't repeat the current song when shuffling
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * queue.length);
          } while (randomIndex === currentIndex && queue.length > 1);
          nextIndex = randomIndex;
        } else if (currentIndex === queue.length - 1) {
          // At end of queue
          if (repeat === 'all') {
            nextIndex = 0;
          } else if (autoplay && currentSong) {
            // Load more songs via autoplay
            await loadAutoplayQueue(currentSong.id);
            const newQueue = get().queue;
            if (newQueue.length > currentIndex + 1) {
              const nextSong = newQueue[currentIndex + 1];
              addToHistory(nextSong);
              set({ currentSong: nextSong, progress: 0, isPlaying: true });
              return;
            }
            set({ isPlaying: false });
            return;
          } else {
            set({ isPlaying: false });
            return;
          }
        } else {
          nextIndex = currentIndex + 1;
        }

        const nextSong = queue[nextIndex];
        addToHistory(nextSong);
        set({ currentSong: nextSong, progress: 0, isPlaying: true });
      },

      previousSong: () => {
        const { queue, currentSong, progress, history, addToHistory } = get();

        // If more than 3 seconds into the song, restart it
        if (progress > 3) {
          set({ progress: 0 });
          return;
        }

        if (queue.length === 0) return;

        const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
        const prevSong = queue[prevIndex];

        addToHistory(prevSong);
        set({ currentSong: prevSong, progress: 0, isPlaying: true });
      },

      toggleShuffle: () => {
        set((state) => ({ shuffle: !state.shuffle }));
      },

      toggleRepeat: () => {
        set((state) => ({
          repeat: state.repeat === 'off' ? 'one' : state.repeat === 'one' ? 'all' : 'off',
        }));
      },

      toggleAutoplay: () => {
        set((state) => ({ autoplay: !state.autoplay }));
      },

      setQueue: (songs) => {
        set({ queue: songs });
      },

      addToQueue: (song) => {
        const { queue } = get();
        if (!queue.find(s => s.id === song.id)) {
          set({ queue: [...queue, song] });
        }
      },

      addToQueueNext: (song) => {
        const { queue, currentSong } = get();
        if (queue.find(s => s.id === song.id)) return;

        const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
        const newQueue = [...queue];
        newQueue.splice(currentIndex + 1, 0, song);
        set({ queue: newQueue });
      },

      removeFromQueue: (songId) => {
        const { queue, currentSong } = get();
        if (currentSong?.id === songId) return; // Can't remove currently playing
        set({ queue: queue.filter(s => s.id !== songId) });
      },

      clearQueue: () => {
        set({ queue: [], currentSong: null, isPlaying: false, progress: 0 });
      },

      toggleFullPlayer: () => {
        set((state) => ({ isFullPlayer: !state.isFullPlayer }));
      },

      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      toggleRightPanel: () => {
        set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen }));
      },

      loadAutoplayQueue: async (seedVideoId: string) => {
        const { queue, isLoadingAutoplay } = get();
        if (isLoadingAutoplay) return;

        set({ isLoadingAutoplay: true });

        try {
          const response = await fetch(`${BACKEND_URL}/autoplay/${seedVideoId}?count=15`);
          if (response.ok) {
            const data = await response.json();
            if (data.queue && data.queue.length > 0) {
              // Add new songs to queue
              const newSongs = data.queue.filter((s: Song) => !queue.find(q => q.id === s.id));
              set({ queue: [...queue, ...newSongs] });
              console.log(`[Autoplay] Added ${newSongs.length} songs to queue`);
            }
          }
        } catch (error) {
          console.error('[Autoplay] Failed to load queue:', error);
        } finally {
          set({ isLoadingAutoplay: false });
        }
      },

      addToHistory: (song: Song) => {
        const { history } = get();
        const newHistory = [song, ...history.filter(s => s.id !== song.id)].slice(0, 50);
        set({ history: newHistory });

        // Sync to backend
        syncHistoryToBackend(song);
      },
    }),
    {
      name: 'supersonic-player',
      partialize: (state) => ({
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        autoplay: state.autoplay,
        history: state.history.slice(0, 20), // Only persist last 20
      }),
    }
  )
);
