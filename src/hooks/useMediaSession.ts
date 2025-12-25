/**
 * Media Session API Hook
 * Enables rich media controls on Android lock screen, notification panel, 
 * and Bluetooth devices (like YouTube Music's media card with thumbnail)
 * 
 * REQUIREMENTS FOR ANDROID RICH MEDIA CARD:
 * ✅ Media Session API is used
 * ✅ Artwork size ≥ 512×512 (HTTPS required)
 * ✅ Audio is actively playing
 * ✅ Play / Pause / Next / Previous handlers exist
 * ✅ Metadata is updated when song changes
 */

import { useEffect, useCallback, useRef } from 'react';
import { Song } from '@/types';

interface UseMediaSessionProps {
    currentSong: Song | null;
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
    onNextTrack: () => void;
    onPreviousTrack: () => void;
    onSeekTo?: (time: number) => void;
    onSeekForward?: (seconds: number) => void;
    onSeekBackward?: (seconds: number) => void;
    duration?: number;
    currentTime?: number;
}

/**
 * Converts a YouTube thumbnail URL to a high-quality 512px or higher version
 * Android requires images ≥ 512×512 for rich media cards
 */
const getHighQualityArtwork = (thumbnail: string, videoId?: string): string => {
    if (!thumbnail && videoId) {
        // Use maxresdefault (1280x720) for best quality, fallback to sddefault (640x480)
        return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    }

    if (!thumbnail) return '';

    // YouTube thumbnail URL patterns:
    // - default.jpg (120x90)
    // - mqdefault.jpg (320x180)
    // - hqdefault.jpg (480x360)
    // - sddefault.jpg (640x480)
    // - maxresdefault.jpg (1280x720) - Best for media session

    // Upgrade any YouTube thumbnail to maxresdefault
    if (thumbnail.includes('ytimg.com') || thumbnail.includes('youtube.com')) {
        return thumbnail
            .replace(/\/default\.jpg/, '/maxresdefault.jpg')
            .replace(/\/mqdefault\.jpg/, '/maxresdefault.jpg')
            .replace(/\/hqdefault\.jpg/, '/maxresdefault.jpg')
            .replace(/\/sddefault\.jpg/, '/maxresdefault.jpg');
    }

    return thumbnail;
};

export const useMediaSession = ({
    currentSong,
    isPlaying,
    onPlay,
    onPause,
    onNextTrack,
    onPreviousTrack,
    onSeekTo,
    onSeekForward,
    onSeekBackward,
    duration = 0,
    currentTime = 0,
}: UseMediaSessionProps) => {
    const lastSongIdRef = useRef<string | null>(null);

    /**
     * Update Media Session metadata (title, artist, album, artwork)
     * This is what creates the rich thumbnail in Android notifications
     */
    const updateMediaSessionMetadata = useCallback((song: Song) => {
        if (!('mediaSession' in navigator)) {
            console.log('[MediaSession] API not supported in this browser');
            return;
        }

        const artworkUrl = getHighQualityArtwork(song.thumbnail, song.id);

        console.log('[MediaSession] Updating metadata:', {
            title: song.title,
            artist: song.artist,
            artworkUrl: artworkUrl.substring(0, 60) + '...',
        });

        // Create MediaMetadata with multiple artwork sizes
        // Android picks the best size automatically
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: song.album || 'Supersonic Music',
            artwork: [
                {
                    src: artworkUrl,
                    sizes: '512x512',
                    type: 'image/jpeg',
                },
                {
                    src: artworkUrl,
                    sizes: '1024x1024',
                    type: 'image/jpeg',
                },
            ],
        });
    }, []);

    /**
     * Update playback position state
     * Enables seek bar in Android notification
     */
    const updatePositionState = useCallback(() => {
        if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) {
            return;
        }

        if (duration > 0 && Number.isFinite(duration) && Number.isFinite(currentTime)) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: duration,
                    playbackRate: 1,
                    position: Math.min(currentTime, duration),
                });
            } catch (e) {
                // Position state can fail if values are invalid
                console.warn('[MediaSession] Failed to update position state:', e);
            }
        }
    }, [duration, currentTime]);

    /**
     * Set up all media session action handlers
     * These enable the ⏮ ⏯ ⏭ buttons in Android
     */
    useEffect(() => {
        if (!('mediaSession' in navigator)) {
            console.log('[MediaSession] API not available');
            return;
        }

        console.log('[MediaSession] Setting up action handlers');

        // Play handler (required for rich media card)
        navigator.mediaSession.setActionHandler('play', () => {
            console.log('[MediaSession] Play action triggered');
            onPlay();
        });

        // Pause handler (required for rich media card)
        navigator.mediaSession.setActionHandler('pause', () => {
            console.log('[MediaSession] Pause action triggered');
            onPause();
        });

        // Next track handler (required for ⏭ button)
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            console.log('[MediaSession] Next track action triggered');
            onNextTrack();
        });

        // Previous track handler (required for ⏮ button)
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            console.log('[MediaSession] Previous track action triggered');
            onPreviousTrack();
        });

        // Seek to specific time (optional - enables seek bar)
        if (onSeekTo) {
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime !== undefined) {
                    console.log('[MediaSession] Seek to:', details.seekTime);
                    onSeekTo(details.seekTime);
                }
            });
        }

        // Seek forward 10 seconds (optional)
        if (onSeekForward) {
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                const skipTime = details.seekOffset || 10;
                console.log('[MediaSession] Seek forward:', skipTime);
                onSeekForward(skipTime);
            });
        }

        // Seek backward 10 seconds (optional)
        if (onSeekBackward) {
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                const skipTime = details.seekOffset || 10;
                console.log('[MediaSession] Seek backward:', skipTime);
                onSeekBackward(skipTime);
            });
        }

        // Stop handler (optional)
        navigator.mediaSession.setActionHandler('stop', () => {
            console.log('[MediaSession] Stop action triggered');
            onPause();
        });

        // Cleanup
        return () => {
            if ('mediaSession' in navigator) {
                try {
                    navigator.mediaSession.setActionHandler('play', null);
                    navigator.mediaSession.setActionHandler('pause', null);
                    navigator.mediaSession.setActionHandler('nexttrack', null);
                    navigator.mediaSession.setActionHandler('previoustrack', null);
                    navigator.mediaSession.setActionHandler('seekto', null);
                    navigator.mediaSession.setActionHandler('seekforward', null);
                    navigator.mediaSession.setActionHandler('seekbackward', null);
                    navigator.mediaSession.setActionHandler('stop', null);
                } catch (e) {
                    // Some handlers might not exist
                }
            }
        };
    }, [onPlay, onPause, onNextTrack, onPreviousTrack, onSeekTo, onSeekForward, onSeekBackward]);

    /**
     * Update metadata when song changes
     * CRITICAL: Must update metadata on every song change for thumbnail to show
     */
    useEffect(() => {
        if (currentSong && currentSong.id !== lastSongIdRef.current) {
            console.log('[MediaSession] Song changed, updating metadata');
            lastSongIdRef.current = currentSong.id;
            updateMediaSessionMetadata(currentSong);
        }
    }, [currentSong, updateMediaSessionMetadata]);

    /**
     * Update playback state (playing/paused)
     * This controls the play/pause icon in the notification
     */
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        if (currentSong) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
            console.log('[MediaSession] Playback state:', isPlaying ? 'playing' : 'paused');
        }
    }, [isPlaying, currentSong]);

    /**
     * Update position state periodically for seek bar
     */
    useEffect(() => {
        updatePositionState();
    }, [updatePositionState]);

    return {
        updateMediaSessionMetadata,
        updatePositionState,
    };
};

export default useMediaSession;
