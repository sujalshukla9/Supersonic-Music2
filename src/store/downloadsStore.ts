/**
 * Downloads Store - Manages offline song storage using IndexedDB
 * Songs are stored in the browser, not downloaded to device files
 * Similar to Spotify/YouTube Music offline mode
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '@/types';
import { BACKEND_URL } from '@/config/api';

const DB_NAME = 'supersonic-downloads';
const DB_VERSION = 1;
const AUDIO_STORE = 'audio-blobs';
const META_STORE = 'song-metadata';

export interface DownloadedSong extends Song {
    downloadedAt: string;
    size: number; // bytes
    audioFormat: string;
}

interface DownloadProgress {
    songId: string;
    progress: number; // 0-100
    status: 'pending' | 'downloading' | 'complete' | 'error';
}

interface DownloadsState {
    downloads: DownloadedSong[];
    downloadQueue: string[];
    activeDownloads: Map<string, DownloadProgress>;
    totalStorageUsed: number;

    // Actions
    downloadSong: (song: Song) => Promise<void>;
    removeDownload: (songId: string) => Promise<void>;
    isDownloaded: (songId: string) => boolean;
    getDownloadedAudio: (songId: string) => Promise<Blob | null>;
    clearAllDownloads: () => Promise<void>;
    getDownloadProgress: (songId: string) => DownloadProgress | null;
    syncFromIndexedDB: () => Promise<void>;
}

// IndexedDB helper functions
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Store for audio blob data
            if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
            }

            // Store for song metadata
            if (!db.objectStoreNames.contains(META_STORE)) {
                const metaStore = db.createObjectStore(META_STORE, { keyPath: 'id' });
                metaStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
            }
        };
    });
}

async function storeAudioBlob(songId: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_STORE], 'readwrite');
        const store = transaction.objectStore(AUDIO_STORE);
        const request = store.put({ id: songId, blob, timestamp: Date.now() });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAudioBlob(songId: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_STORE], 'readonly');
        const store = transaction.objectStore(AUDIO_STORE);
        const request = store.get(songId);

        request.onsuccess = () => resolve(request.result?.blob || null);
        request.onerror = () => reject(request.error);
    });
}

async function deleteAudioBlob(songId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_STORE], 'readwrite');
        const store = transaction.objectStore(AUDIO_STORE);
        const request = store.delete(songId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function clearAllAudioBlobs(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
        transaction.objectStore(AUDIO_STORE).clear();
        transaction.objectStore(META_STORE).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export const useDownloadsStore = create<DownloadsState>()(
    persist(
        (set, get) => ({
            downloads: [],
            downloadQueue: [],
            activeDownloads: new Map(),
            totalStorageUsed: 0,

            downloadSong: async (song: Song) => {
                const { downloads, activeDownloads, totalStorageUsed } = get();

                // Check if already downloaded
                if (downloads.find(d => d.id === song.id)) {
                    console.log('[Downloads] Song already downloaded:', song.title);
                    return;
                }

                // Check if already downloading
                if (activeDownloads.has(song.id)) {
                    console.log('[Downloads] Song already downloading:', song.title);
                    return;
                }

                // Check storage limit (import dynamically to avoid circular deps)
                const { useSettingsStore } = await import('./settingsStore');
                const storageLimit = useSettingsStore.getState().downloadStorageLimit;
                const storageLimitBytes = storageLimit * 1024 * 1024;

                // Estimate song size (~10MB average for high quality)
                const estimatedSongSize = 10 * 1024 * 1024;

                if (storageLimit > 0 && totalStorageUsed + estimatedSongSize > storageLimitBytes) {
                    console.warn('[Downloads] Storage limit reached!');
                    alert('Storage limit reached! Please remove some downloads or increase your storage limit in the Downloads page.');
                    return;
                }

                // Set initial progress
                const newActiveDownloads = new Map(activeDownloads);
                newActiveDownloads.set(song.id, {
                    songId: song.id,
                    progress: 0,
                    status: 'downloading'
                });
                set({ activeDownloads: newActiveDownloads });

                try {
                    console.log('[Downloads] Starting download:', song.title);

                    // Get the stream URL from backend (uses centralized BACKEND_URL)
                    const streamUrl = `${BACKEND_URL}/stream/${song.id}?quality=high`;

                    // Fetch the audio with progress tracking
                    const response = await fetch(streamUrl);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch audio: ${response.status}`);
                    }

                    const contentLength = response.headers.get('content-length');
                    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

                    const reader = response.body?.getReader();
                    if (!reader) throw new Error('No response body');

                    const chunks: Uint8Array[] = [];
                    let receivedLength = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        chunks.push(value);
                        receivedLength += value.length;

                        // Update progress
                        const progress = totalSize > 0
                            ? Math.round((receivedLength / totalSize) * 100)
                            : 50; // If no content-length, show 50%

                        const updatedDownloads = new Map(get().activeDownloads);
                        updatedDownloads.set(song.id, {
                            songId: song.id,
                            progress,
                            status: 'downloading'
                        });
                        set({ activeDownloads: updatedDownloads });
                    }

                    // Combine chunks into blob
                    const blob = new Blob(chunks as BlobPart[], { type: 'audio/webm' });

                    // Store in IndexedDB
                    await storeAudioBlob(song.id, blob);

                    // Create downloaded song entry
                    const downloadedSong: DownloadedSong = {
                        ...song,
                        downloadedAt: new Date().toISOString(),
                        size: blob.size,
                        audioFormat: 'webm'
                    };

                    // Update state
                    const currentDownloads = get().downloads;
                    const currentStorage = get().totalStorageUsed;
                    const finalActiveDownloads = new Map(get().activeDownloads);
                    finalActiveDownloads.delete(song.id);

                    set({
                        downloads: [...currentDownloads, downloadedSong],
                        activeDownloads: finalActiveDownloads,
                        totalStorageUsed: currentStorage + blob.size
                    });

                    console.log('[Downloads] ✅ Downloaded:', song.title, `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

                } catch (error) {
                    console.error('[Downloads] ❌ Failed to download:', song.title, error);

                    const errorActiveDownloads = new Map(get().activeDownloads);
                    errorActiveDownloads.set(song.id, {
                        songId: song.id,
                        progress: 0,
                        status: 'error'
                    });
                    set({ activeDownloads: errorActiveDownloads });

                    // Remove error state after 3 seconds
                    setTimeout(() => {
                        const cleanupDownloads = new Map(get().activeDownloads);
                        cleanupDownloads.delete(song.id);
                        set({ activeDownloads: cleanupDownloads });
                    }, 3000);
                }
            },

            removeDownload: async (songId: string) => {
                const { downloads, totalStorageUsed } = get();
                const song = downloads.find(d => d.id === songId);

                if (!song) return;

                try {
                    await deleteAudioBlob(songId);

                    set({
                        downloads: downloads.filter(d => d.id !== songId),
                        totalStorageUsed: Math.max(0, totalStorageUsed - song.size)
                    });

                    console.log('[Downloads] Removed:', song.title);
                } catch (error) {
                    console.error('[Downloads] Failed to remove:', error);
                }
            },

            isDownloaded: (songId: string) => {
                return get().downloads.some(d => d.id === songId);
            },

            getDownloadedAudio: async (songId: string) => {
                return await getAudioBlob(songId);
            },

            clearAllDownloads: async () => {
                try {
                    await clearAllAudioBlobs();
                    set({
                        downloads: [],
                        totalStorageUsed: 0,
                        activeDownloads: new Map(),
                        downloadQueue: []
                    });
                    console.log('[Downloads] Cleared all downloads');
                } catch (error) {
                    console.error('[Downloads] Failed to clear:', error);
                }
            },

            getDownloadProgress: (songId: string) => {
                return get().activeDownloads.get(songId) || null;
            },

            syncFromIndexedDB: async () => {
                // Sync metadata from IndexedDB on app load
                // This ensures state is consistent with what's actually stored
                try {
                    const db = await openDB();
                    const transaction = db.transaction([AUDIO_STORE], 'readonly');
                    const store = transaction.objectStore(AUDIO_STORE);
                    const request = store.getAllKeys();

                    request.onsuccess = () => {
                        const storedIds = new Set(request.result as string[]);
                        const { downloads } = get();

                        // Remove any downloads that aren't actually in IndexedDB
                        const validDownloads = downloads.filter(d => storedIds.has(d.id));
                        if (validDownloads.length !== downloads.length) {
                            set({ downloads: validDownloads });
                        }
                    };
                } catch (error) {
                    console.error('[Downloads] Sync failed:', error);
                }
            }
        }),
        {
            name: 'supersonic-downloads',
            partialize: (state) => ({
                downloads: state.downloads,
                totalStorageUsed: state.totalStorageUsed
            })
        }
    )
);

// Sync on load
if (typeof window !== 'undefined') {
    useDownloadsStore.getState().syncFromIndexedDB();
}
