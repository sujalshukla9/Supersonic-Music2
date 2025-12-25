import { Download, Trash2, Music, HardDrive, Wifi, WifiOff, Settings, ChevronRight, Database, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDownloadsStore, DownloadedSong } from '@/store/downloadsStore';
import { usePlayerStore } from '@/store/playerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SongCard } from '@/components/cards/SongCard';
import { useState, useEffect } from 'react';

// Enhanced Storage detection
interface StorageInfo {
    available: number; // bytes - available for this origin
    used: number; // bytes - used by this origin
    quota: number; // bytes - total quota for this origin
    deviceTotal: number; // bytes - estimated total device storage
    deviceFree: number; // bytes - estimated free device storage
    isPersisted: boolean; // whether storage is persisted
    supported: boolean;
}

const getStorageInfo = async (): Promise<StorageInfo> => {
    let info: StorageInfo = {
        available: 500 * 1024 * 1024,
        used: 0,
        quota: 500 * 1024 * 1024,
        deviceTotal: 0,
        deviceFree: 0,
        isPersisted: false,
        supported: false
    };

    // Check if Storage API is supported
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();

            info.used = estimate.usage || 0;
            info.quota = estimate.quota || 0;
            info.available = info.quota - info.used;
            info.supported = true;

            // The quota is typically ~60% of available disk space
            // So we can estimate device storage from this
            if (info.quota > 0) {
                // Browsers typically give 50-60% of free disk space as quota
                // We estimate total device free space by reversing this
                info.deviceFree = Math.round(info.quota / 0.5); // ~2x quota
                info.deviceTotal = info.deviceFree + info.used;
            }

            console.log('[Storage] Quota:', formatBytesInternal(info.quota));
            console.log('[Storage] Used:', formatBytesInternal(info.used));
            console.log('[Storage] Estimated device free:', formatBytesInternal(info.deviceFree));

        } catch (e) {
            console.warn('Storage API error:', e);
        }
    }

    // Check if storage is persisted (won't be auto-cleared by browser)
    if ('storage' in navigator && 'persisted' in navigator.storage) {
        try {
            info.isPersisted = await navigator.storage.persisted();
        } catch (e) {
            console.warn('Persist check error:', e);
        }
    }

    return info;
};

// Request persistent storage so browser doesn't auto-delete downloads
const requestPersistentStorage = async (): Promise<boolean> => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
            const granted = await navigator.storage.persist();
            console.log('[Storage] Persistent storage:', granted ? 'granted' : 'denied');
            return granted;
        } catch (e) {
            console.warn('Persist request error:', e);
        }
    }
    return false;
};

// Helper for internal use
const formatBytesInternal = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const STORAGE_PRESETS = [
    { label: '500 MB', value: 500, description: 'About 50 songs' },
    { label: '1 GB', value: 1024, description: 'About 100 songs' },
    { label: '2 GB', value: 2048, description: 'About 200 songs' },
    { label: '5 GB', value: 5120, description: 'About 500 songs' },
    { label: '10 GB', value: 10240, description: 'About 1000 songs' },
];

export const DownloadsPage = () => {
    const { downloads, totalStorageUsed, clearAllDownloads, removeDownload } = useDownloadsStore();
    const { playSong, setQueue } = usePlayerStore();
    const { downloadStorageLimit, setSetting } = useSettingsStore();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    const [showSetupDialog, setShowSetupDialog] = useState(false);
    const [selectedLimit, setSelectedLimit] = useState<number>(1024); // Default 1GB
    const [customLimit, setCustomLimit] = useState<string>('');
    const [isDetecting, setIsDetecting] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Detect storage on mount and request persistence
    useEffect(() => {
        const detectStorage = async () => {
            setIsDetecting(true);

            // Request persistent storage first
            await requestPersistentStorage();

            // Then get storage info
            const info = await getStorageInfo();
            setStorageInfo(info);
            setIsDetecting(false);

            // Show setup dialog if not configured yet
            if (downloadStorageLimit === 0) {
                setShowSetupDialog(true);
            }
        };
        detectStorage();

    }, [downloadStorageLimit]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handlePlayAll = () => {
        if (downloads.length > 0) {
            setQueue(downloads);
            playSong(downloads[0]);
        }
    };

    const handlePlaySong = (song: DownloadedSong) => {
        setQueue(downloads);
        playSong(song);
    };

    const handleSaveStorageLimit = () => {
        const limit = customLimit ? parseInt(customLimit, 10) : selectedLimit;
        if (limit > 0) {
            setSetting('downloadStorageLimit', limit);
            setShowSetupDialog(false);
        }
    };

    const storageLimitBytes = downloadStorageLimit * 1024 * 1024;
    const storagePercentUsed = storageLimitBytes > 0 ? (totalStorageUsed / storageLimitBytes) * 100 : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-32">
            {/* Storage Setup Dialog */}
            <AnimatePresence>
                {showSetupDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && downloadStorageLimit > 0 && setShowSetupDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-background border border-white/10 rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-green-500 flex-shrink-0">
                                    <HardDrive className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg sm:text-xl font-bold truncate">Set Up Offline Storage</h2>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Choose how much storage to use
                                    </p>
                                </div>
                            </div>

                            {/* Device Storage Info */}
                            {storageInfo && (
                                <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-white/5 space-y-4">
                                    {/* Detection Status */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium">Device Storage</span>
                                        </div>
                                        {storageInfo.supported ? (
                                            <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                Detected
                                            </span>
                                        ) : (
                                            <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                Estimated
                                            </span>
                                        )}
                                    </div>

                                    {/* Device Free Space (estimated from browser quota) */}
                                    {storageInfo.deviceFree > 0 && (
                                        <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                                            <span className="text-xs text-muted-foreground">Est. Device Free Space</span>
                                            <span className="text-sm font-bold text-primary">{formatBytes(storageInfo.deviceFree)}</span>
                                        </div>
                                    )}

                                    {/* Browser Quota */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Browser Quota</span>
                                            <span className="font-medium">{formatBytes(storageInfo.quota)}</span>
                                        </div>
                                        <div className="h-2 bg-background rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                                style={{ width: `${(storageInfo.used / storageInfo.quota) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                            <span>Used by website: {formatBytes(storageInfo.used)}</span>
                                            <span>Available: {formatBytes(storageInfo.available)}</span>
                                        </div>
                                    </div>

                                    {/* Persistence Status */}
                                    <div className={`flex items-center gap-2 p-2 rounded-lg ${storageInfo.isPersisted
                                        ? 'bg-green-500/10 border border-green-500/20'
                                        : 'bg-amber-500/10 border border-amber-500/20'
                                        }`}>
                                        <Shield className={`w-4 h-4 ${storageInfo.isPersisted ? 'text-green-500' : 'text-amber-500'}`} />
                                        <div className="flex-1">
                                            <span className={`text-xs font-medium ${storageInfo.isPersisted ? 'text-green-500' : 'text-amber-500'}`}>
                                                {storageInfo.isPersisted ? 'Storage Protected' : 'Storage Not Protected'}
                                            </span>
                                            <p className="text-[10px] text-muted-foreground">
                                                {storageInfo.isPersisted
                                                    ? 'Your downloads won\'t be auto-deleted'
                                                    : 'Browser may clear data when storage is low'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isDetecting ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <span className="ml-3 text-muted-foreground">Detecting storage...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Storage Presets */}
                                    <div className="space-y-2 mb-4 sm:mb-6">
                                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                                            Select storage limit for offline songs
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {STORAGE_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.value}
                                                    onClick={() => {
                                                        setSelectedLimit(preset.value);
                                                        setCustomLimit('');
                                                    }}
                                                    className={`p-2 sm:p-3 rounded-xl border transition-all text-left ${selectedLimit === preset.value && !customLimit
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-white/10 hover:border-white/20 hover:bg-secondary/50'
                                                        }`}
                                                >
                                                    <div className="font-bold text-xs sm:text-sm">{preset.label}</div>
                                                    <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                                                        {preset.description}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Input */}
                                    <div className="mb-4 sm:mb-6">
                                        <label className="text-xs sm:text-sm font-medium text-muted-foreground block mb-2">
                                            Or enter custom limit (MB)
                                        </label>
                                        <input
                                            type="number"
                                            value={customLimit}
                                            onChange={(e) => setCustomLimit(e.target.value)}
                                            placeholder="e.g., 3000"
                                            min="100"
                                            max="50000"
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-secondary/50 border border-white/10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        />
                                    </div>

                                    {/* Info */}
                                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-4 sm:mb-6">
                                        Songs are stored in your browser's IndexedDB. You can change this limit later in Settings.
                                    </p>

                                    {/* Save Button */}
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                                        {downloadStorageLimit > 0 && (
                                            <button
                                                onClick={() => setShowSetupDialog(false)}
                                                className="flex-1 py-2.5 sm:py-3 rounded-xl border border-white/10 hover:bg-secondary/50 transition-colors font-medium text-sm"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSaveStorageLimit}
                                            className="flex-1 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-primary to-green-500 text-white font-bold text-sm"
                                        >
                                            Save & Continue
                                        </motion.button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
                {/* Title Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                            <Download className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Downloads</h1>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                                {downloads.length} songs • {formatBytes(totalStorageUsed)}
                                {downloadStorageLimit > 0 && ` / ${formatBytes(storageLimitBytes)}`}
                            </p>
                        </div>
                    </div>

                    {/* Settings Button - Always visible */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSetupDialog(true)}
                        className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
                        title="Storage settings"
                    >
                        <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Online/Offline Status */}
                    <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium ${isOnline
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                        {isOnline ? (
                            <>
                                <Wifi className="w-3 h-3" />
                                <span className="hidden xs:inline">Online</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3" />
                                <span className="hidden xs:inline">Offline</span>
                            </>
                        )}
                    </div>

                    <div className="flex-1" />

                    {downloads.length > 0 && (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePlayAll}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-full font-semibold text-xs sm:text-sm"
                            >
                                Play All
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={clearAllDownloads}
                                className="p-1.5 sm:p-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                title="Clear all downloads"
                            >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </motion.button>
                        </>
                    )}
                </div>
            </div>

            {/* Storage Info - Always show if configured */}
            {downloadStorageLimit > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-xl bg-secondary/50 border border-white/5"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <HardDrive className="w-5 h-5 text-primary" />
                            <span className="font-semibold">Offline Storage</span>
                        </div>
                        <button
                            onClick={() => setShowSetupDialog(true)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            Change <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${storagePercentUsed > 90
                                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                : storagePercentUsed > 70
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                    : 'bg-gradient-to-r from-primary to-green-500'
                                }`}
                            style={{ width: `${Math.min(storagePercentUsed, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">
                            {formatBytes(totalStorageUsed)} of {formatBytes(storageLimitBytes)} used
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatBytes(storageLimitBytes - totalStorageUsed)} remaining
                        </p>
                    </div>
                    {storagePercentUsed > 90 && (
                        <p className="text-xs text-amber-500 mt-2">
                            ⚠️ Storage almost full. Consider removing some songs or increasing the limit.
                        </p>
                    )}
                </motion.div>
            )}

            {/* Downloads List */}
            {downloads.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                >
                    <div className="p-6 rounded-full bg-secondary/50 mb-6">
                        <Music className="w-16 h-16 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No Downloads Yet</h2>
                    <p className="text-muted-foreground max-w-md">
                        Download songs to listen offline. Tap the download icon on any song to save it to your device's browser storage.
                    </p>
                    {downloadStorageLimit > 0 && (
                        <p className="text-sm text-primary mt-4">
                            You have {formatBytes(storageLimitBytes)} allocated for offline music
                        </p>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {downloads.map((song, index) => (
                            <motion.div
                                key={song.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                className="group flex items-center gap-2 pr-2 rounded-xl hover:bg-secondary/30 transition-colors"
                            >
                                {/* Song Card - takes most space */}
                                <div className="flex-1 min-w-0" onClick={() => handlePlaySong(song)}>
                                    <SongCard song={song} index={index} showIndex playlist={downloads} />
                                </div>

                                {/* Size & Remove button - always visible on right */}
                                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                    <span className="text-[10px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded">
                                        {formatBytes(song.size)}
                                    </span>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeDownload(song.id);
                                        }}
                                        className="p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove download"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default DownloadsPage;
