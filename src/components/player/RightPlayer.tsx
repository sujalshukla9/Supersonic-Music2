import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ChevronDown, MoreHorizontal, Heart, ListMusic, Radio, Volume2, VolumeX, Music, Share2, Download, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import { Song } from '../../types';
import { useLikesStore } from '../../store/likesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useDownloadsStore } from '../../store/downloadsStore';
import { Slider } from '@/components/ui/slider';
import { BACKEND_URL } from '@/config/api';
import { getHighQualityThumbnail } from '@/lib/youtube';
import { useMediaSession } from '@/hooks/useMediaSession';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Like button component
const LikeButton = () => {
  const { currentSong } = usePlayerStore();
  const { isLiked, toggleLike } = useLikesStore();

  if (!currentSong) return null;

  const songIsLiked = isLiked(currentSong.id);

  return (
    <motion.button
      className={`p-2 -ml-2 transition-colors ${songIsLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
      onClick={() => toggleLike(currentSong)}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
    >
      <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${songIsLiked ? 'fill-current' : ''}`} />
    </motion.button>
  );
};

// Queue Item component
const QueueItem = ({ song, index, isPlaying }: { song: Song; index: number; isPlaying: boolean }) => {
  const { playSong, removeFromQueue } = usePlayerStore();
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group ${isPlaying ? 'bg-primary/10' : ''}`}
      onClick={() => playSong(song)}
    >
      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
        {song.thumbnail && !imageError ? (
          <img
            src={getHighQualityThumbnail(song.thumbnail, song.id)}
            alt={song.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Music className="w-5 h-5 text-muted-foreground" />
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-background/60 dark:bg-black/50 flex items-center justify-center">
            <div className="flex gap-0.5">
              <span className="w-0.5 h-3 bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-3 bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-3 bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium line-clamp-1 ${isPlaying ? 'text-primary' : 'text-foreground'}`}>
          {song.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">{song.artist}</p>
      </div>
      <span className="text-xs text-muted-foreground">{song.duration}</span>
    </motion.div>
  );
};

export const RightPlayer = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    shuffle,
    repeat,
    queue,
    isRightPanelOpen,
    isLoadingAutoplay,
    isBuffering,
    togglePlay,
    nextSong,
    previousSong,
    setVolume,
    setProgress,
    toggleShuffle,
    toggleRepeat,
    toggleAutoplay,
    toggleRightPanel,
    setIsPlaying,
    setIsBuffering,
    seekTo,
    seekTime,
    resetSeek,
    isSeeking,
    setIsSeeking,
    addToQueue,
    addToQueueNext,
    audioMetadata,
    setAudioMetadata
  } = usePlayerStore();

  const { autoPlay, audioQuality, crossfade, normalizeVolume, bassBoost, dataSaver } = useSettingsStore();
  const { isDownloaded, getDownloadedAudio, downloadSong, getDownloadProgress } = useDownloadsStore();

  const [streamOffset, setStreamOffset] = useState(0);

  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const bassBoostNodeRef = useRef<BiquadFilterNode | null>(null);

  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(80);
  const [coverImageError, setCoverImageError] = useState(false);

  // Crossfade state
  const [isCrossfading, setIsCrossfading] = useState(false);
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredCrossfade = useRef(false);

  // Play tracking for recommendations
  const hasTrackedPlay = useRef(false);

  // ============================================
  // MEDIA SESSION API - Android Rich Media Controls
  // This enables:
  // ✅ Rich thumbnail in notification & lock screen
  // ✅ Play/Pause/Next/Previous buttons
  // ✅ Bluetooth headset button support
  // ✅ Seek bar in notification (Android 10+)
  // ============================================
  const handleSeekFromMediaSession = useCallback((time: number) => {
    if (audioRef.current && Number.isFinite(time)) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, [setProgress]);

  const handleSeekForward = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration || 0);
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  }, [setProgress]);

  const handleSeekBackward = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  }, [setProgress]);

  // Initialize Media Session with all handlers
  useMediaSession({
    currentSong,
    isPlaying,
    onPlay: togglePlay,
    onPause: togglePlay,
    onNextTrack: nextSong,
    onPreviousTrack: previousSong,
    onSeekTo: handleSeekFromMediaSession,
    onSeekForward: handleSeekForward,
    onSeekBackward: handleSeekBackward,
    duration,
    currentTime: progress,
  });

  // Track song play to backend for personalized recommendations
  const trackPlayToBackend = useCallback(async (song: Song) => {
    try {
      await fetch(`${BACKEND_URL}/track/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song: {
            id: song.id,
            title: song.title,
            artist: song.artist,
            channelId: song.channelId || song.artistId,
            thumbnail: song.thumbnail
          }
        })
      });
      console.log('[Player] Tracked play for recommendations:', song.title);
    } catch (e) {
      console.warn('[Player] Failed to track play:', e);
    }
  }, []);

  // Prefetch upcoming songs in queue for faster loading
  const prefetchedSongs = useRef<Set<string>>(new Set());

  const prefetchUpcomingSongs = useCallback(async () => {
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1) return;

    // Get next 3 songs that haven't been prefetched
    const upcomingSongs = queue
      .slice(currentIndex + 1, currentIndex + 4)
      .filter(s => !prefetchedSongs.current.has(s.id));

    if (upcomingSongs.length === 0) return;

    const videoIds = upcomingSongs.map(s => s.id);
    console.log('[Prefetch] Prefetching upcoming songs:', videoIds);

    // Mark as prefetching to avoid duplicate requests
    videoIds.forEach(id => prefetchedSongs.current.add(id));

    try {
      await fetch(`${BACKEND_URL}/prefetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds })
      });
      console.log('[Prefetch] ✅ Prefetch request sent for', videoIds.length, 'songs');
    } catch (e) {
      console.warn('[Prefetch] Failed to prefetch:', e);
      // Remove from prefetched set so it can be retried
      videoIds.forEach(id => prefetchedSongs.current.delete(id));
    }
  }, [currentSong, queue]);

  // Trigger prefetch when song changes or queue updates
  useEffect(() => {
    if (currentSong && isPlaying) {
      // Small delay to let current song load first
      const prefetchTimeout = setTimeout(() => {
        prefetchUpcomingSongs();
      }, 2000);

      return () => clearTimeout(prefetchTimeout);
    }
  }, [currentSong?.id, isPlaying, prefetchUpcomingSongs]);

  // Initialize Web Audio API
  useEffect(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioRef.current);
      const gain = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      const bassFilter = ctx.createBiquadFilter();

      // Configure Compressor for normalization-like effect
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Configure Bass Boost Filter (lowshelf at 200Hz)
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200; // Boost frequencies below 200Hz
      bassFilter.gain.value = 0; // Start with no boost

      // Connect nodes: Source -> BassFilter -> Compressor -> Gain -> Destination
      source.connect(bassFilter);
      bassFilter.connect(compressor);
      compressor.connect(gain);
      gain.connect(ctx.destination);

      audioContextRef.current = ctx;
      sourceNodeRef.current = source;
      gainNodeRef.current = gain;
      compressorNodeRef.current = compressor;
      bassBoostNodeRef.current = bassFilter;
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }, []);

  // Handle Normalization (bypass/enable compressor)
  useEffect(() => {
    if (!audioContextRef.current || !sourceNodeRef.current || !gainNodeRef.current || !compressorNodeRef.current) return;

    // Re-routing based on normalization setting
    // We disconnect and reconnect to toggle the compressor
    // Simplification: Just effectively "bypass" it?
    // Actually, dynamic compressor is always on in the chain above. 
    // Let's adjust threshold to "disable" it if needed or disconnect.

    // Better approach:
    // If normalized: threshold -24 (active)
    // If not: threshold 0 (inactive/transparent)
    if (normalizeVolume) {
      compressorNodeRef.current.threshold.value = -24;
      compressorNodeRef.current.ratio.value = 12; // High ratio for limiting
    } else {
      compressorNodeRef.current.threshold.value = 0; // Effectively disabled for music
      compressorNodeRef.current.ratio.value = 1;
    }

  }, [normalizeVolume]);

  // Bass Boost Control
  useEffect(() => {
    if (!bassBoostNodeRef.current || !audioContextRef.current) return;

    // Convert 0-100 slider to dB gain (0-15dB range for bass boost)
    const boostDb = (bassBoost / 100) * 15;

    // Smooth transition to prevent clicks
    bassBoostNodeRef.current.gain.setTargetAtTime(
      boostDb,
      audioContextRef.current.currentTime,
      0.05
    );

    console.log(`[Audio] Bass boost set to ${bassBoost}% (${boostDb.toFixed(1)}dB)`);
  }, [bassBoost]);

  // Volume Control via Gain Node (better quality)
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const targetVolume = volume / 100;
      // Smooth transition to prevent clicks (0.1s de-zipper)
      gainNodeRef.current.gain.setTargetAtTime(targetVolume, audioContextRef.current.currentTime, 0.05);
    } else if (audioRef.current) {
      // Fallback
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Handle Play/Pause with Crossfade (Fade In / Fade Out)
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Resume Audio Context if suspended (browser requirement)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // FADE IN - Only apply during crossfade transitions (when isCrossfading was just reset)
      // Don't fade in on normal play - that makes songs seem slow to start
      // The crossfade fade-in is handled in the song change effect when coming from a crossfade
      // For normal playback, ensure volume is at target level
      if (gainNodeRef.current && audioContextRef.current && !isCrossfading) {
        const ctx = audioContextRef.current;
        // Set to target volume immediately for normal playback
        gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(volume / 100, ctx.currentTime);
      }

      // Only play if not already playing and has a valid source
      if (audio.paused && audio.src) {
        playPromiseRef.current = audio.play();
        if (playPromiseRef.current !== undefined) {
          playPromiseRef.current.catch(e => {
            // Only log non-abort errors - AbortError is expected when switching songs
            if (e.name !== 'AbortError') {
              console.warn('Playback failed:', e);
              setIsPlaying(false);
            }
          }).finally(() => {
            playPromiseRef.current = null;
          });
        }
      }
    } else {
      // Wait for play promise to resolve before pausing to prevent AbortError
      if (playPromiseRef.current) {
        playPromiseRef.current.then(() => {
          audio.pause();
        }).catch(() => {
          // Ignore errors, just pause
          audio.pause();
        });
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, setIsPlaying, volume, isCrossfading]); // Removed crossfade dep to prevent re-triggering on setting change

  // Reset states when song changes
  useEffect(() => {
    setCoverImageError(false);

    // Reset crossfade state when song changes
    hasTriggeredCrossfade.current = false;
    setIsCrossfading(false);

    // Clear any pending crossfade timeout
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }

    // Reset gain to full volume for new song
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
      gainNodeRef.current.gain.setValueAtTime(volume / 100, audioContextRef.current.currentTime);
    }

    // Track play for recommendations (only if there's a current song)
    if (currentSong && !hasTrackedPlay.current) {
      hasTrackedPlay.current = true;
      trackPlayToBackend(currentSong);
    }

    // Reset tracking flag when song changes
    return () => {
      hasTrackedPlay.current = false;
    };
  }, [currentSong?.id, volume, currentSong, trackPlayToBackend]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setAudioError(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      const currentTime = audioRef.current.currentTime + streamOffset;
      setProgress(currentTime);

      // Crossfade logic: Start fading out before the song ends
      if (crossfade > 0 && duration > 0 && !hasTriggeredCrossfade.current && repeat !== 'one') {
        const timeRemaining = duration - currentTime;

        // Start crossfade when we're within the crossfade duration of the end
        if (timeRemaining <= crossfade && timeRemaining > 0 && !isCrossfading) {
          console.log(`[Crossfade] Starting fade out with ${timeRemaining.toFixed(1)}s remaining`);
          hasTriggeredCrossfade.current = true;
          setIsCrossfading(true);

          // Start fade out on current track
          if (gainNodeRef.current && audioContextRef.current) {
            const ctx = audioContextRef.current;
            gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
            gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, ctx.currentTime);
            gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + timeRemaining);
          }

          // Schedule the next song to start (slightly before current ends for overlap)
          crossfadeTimeoutRef.current = setTimeout(() => {
            console.log('[Crossfade] Triggering next song');
            nextSong();
            setIsCrossfading(false);
          }, (timeRemaining - 0.1) * 1000); // Trigger slightly before end
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      // Use audio duration if valid, otherwise fall back to song metadata
      if (audioDuration && Number.isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      } else if (currentSong?.durationSeconds) {
        setDuration(currentSong.durationSeconds);
      }

      // Reset crossfade trigger for new song
      hasTriggeredCrossfade.current = false;
    }
  };

  const handleEnded = () => {
    // If crossfade already handled the transition, don't do anything
    if (isCrossfading) {
      setIsCrossfading(false);
      return;
    }

    // Reset crossfade state
    hasTriggeredCrossfade.current = false;

    if (repeat === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      nextSong();
    }
  };

  const handleSeek = (value: number[]) => {
    // Update visual progress while dragging
    setIsSeeking(true);
    setProgress(value[0]);
  };

  const handleSeekCommit = (value: number[]) => {
    const seekValue = value[0];
    const audio = audioRef.current;

    if (!audio) {
      setIsSeeking(false);
      return;
    }



    // Direct URL seeking
    if (seekValue >= 0 && Number.isFinite(seekValue)) {
      console.log(`[Audio] Seeking to ${seekValue}s`);
      try {
        audio.currentTime = seekValue;
        setProgress(seekValue);
      } catch (e) {
        console.warn('[Audio] Seek error:', e);
      }
    }
    setIsSeeking(false);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  useEffect(() => {
    let isCancelled = false;
    let abortController: AbortController | null = null;

    const loadAudio = async () => {
      if (!currentSong) return;

      // Set loading state BEFORE pausing to prevent onPause from resetting isPlaying
      setIsBuffering(true);
      setAudioError(false);
      setStreamOffset(0);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }

      const tryLoadFromUrl = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
          if (!audioRef.current || isCancelled) {
            resolve(false);
            return;
          }

          const audio = audioRef.current;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          let cleanupExecuted = false;

          const cleanup = () => {
            if (cleanupExecuted) return;
            cleanupExecuted = true;
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            if (timeoutId) clearTimeout(timeoutId);
          };

          const onCanPlay = () => {
            cleanup();
            if (!isCancelled) {
              console.log('[Audio] Can play - stream ready');
              setIsBuffering(false);

              // Auto-play: Read current state from store (not stale closure value)
              // This is critical for autoplay when nextSong() sets isPlaying: true
              const currentIsPlaying = usePlayerStore.getState().isPlaying;
              if (currentIsPlaying && audio) {
                console.log('[Audio] Auto-starting playback');
                audio.play().catch(e => {
                  console.warn('[Audio] Auto-play failed:', e);
                });
              }
            }
            resolve(true);
          };

          const onError = (e: Event) => {
            cleanup();
            console.error('[Audio] Load error for URL:', url, e);
            resolve(false);
          };

          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('canplaythrough', onCanPlay, { once: true });
          audio.addEventListener('error', onError, { once: true });

          console.log(`[Audio] Setting source: ${url}`);
          audio.src = url;
          audio.load();

          timeoutId = setTimeout(() => {
            if (!isCancelled) {
              console.log('[Audio] Load timeout');
              cleanup();
              resolve(false);
            }
          }, 15000); // 15s timeout for loading (reduced from 25s)
        });
      };

      try {
        console.log(`[Audio] Resolving audio for: ${currentSong.id} (quality: ${audioQuality})`);

        // If song already has quality info (from cache/history), set it immediately
        if (currentSong.quality) {
          setAudioMetadata(currentSong.quality);
        }

        abortController = new AbortController();

        // Check if song is downloaded for offline playback
        if (isDownloaded(currentSong.id)) {
          console.log('[Audio] 📱 Playing from offline storage...');
          const offlineBlob = await getDownloadedAudio(currentSong.id);

          if (offlineBlob && !isCancelled) {
            const offlineUrl = URL.createObjectURL(offlineBlob);
            const loaded = await tryLoadFromUrl(offlineUrl);

            if (loaded) {
              console.log('[Audio] ✅ Playing from downloaded storage');
              setAudioMetadata({ format: 'OFFLINE', bitrate: 320, hz: 48000 });
              setIsBuffering(false);
              return;
            }
            // If offline load fails, fall through to network
            URL.revokeObjectURL(offlineUrl);
            console.log('[Audio] Offline playback failed, trying network...');
          }
        }

        // Use new /extract endpoint that returns direct audio URL
        // Quality mapping: low=96kbps, normal=160kbps, high=320kbps, lossless=best
        const qualityParam = dataSaver ? 'low' : audioQuality;
        const extractUrl = `${BACKEND_URL}/extract/${currentSong.id}?quality=${qualityParam}`;
        console.log('[Audio] Fetching audio URL from:', extractUrl);

        // Fetch the direct audio URL from extract endpoint
        const response = await fetch(extractUrl, { signal: abortController.signal });

        if (!response.ok) {
          throw new Error(`Extract failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.url) {
          throw new Error('No audio URL returned from extract');
        }

        if (isCancelled) return;

        console.log('[Audio] Got direct audio URL:', data.url.substring(0, 80) + '...');
        console.log('[Audio] Format:', data.format, 'Bitrate:', data.bitrate, 'kbps', 'Hz:', data.hz);

        // Update store with audio metadata (converting to kbps if it looks like bits/s)
        const displayBitrate = data.bitrate > 1000 ? Math.round(data.bitrate / 1000) : data.bitrate;

        setAudioMetadata({
          bitrate: displayBitrate,
          hz: data.hz || 48000,
          format: data.format || 'unknown'
        });

        // Load audio element with the direct URL
        const success = await tryLoadFromUrl(data.url);

        if (!success) {
          throw new Error('Failed to load audio resource');
        }

      } catch (e: unknown) {
        const error = e as Error & { name?: string };
        if (error.name !== 'AbortError' && !isCancelled) {
          console.error('[Audio] Error:', error.message);
          setIsBuffering(false);
          setAudioError(true);
        }
      }
    };

    loadAudio();

    return () => {
      isCancelled = true;
      if (abortController) abortController.abort();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Cleanup crossfade timeout
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
    };
  }, [currentSong?.id, retryCount, setIsPlaying, audioQuality, dataSaver]);

  // Note: Play/pause is handled by the main isPlaying useEffect above (lines 206-246)
  // This duplicate was removed to prevent conflicts

  // Handle external seek requests
  useEffect(() => {
    if (seekTime !== null && audioRef.current && Number.isFinite(seekTime)) {
      const audio = audioRef.current;

      console.log(`[Audio] Processing external seek to ${seekTime}s`);

      // Try to seek regardless of stream type
      try {
        audio.currentTime = seekTime;
        setProgress(seekTime);
        console.log(`[Audio] Seek successful to ${seekTime}s`);
      } catch (e) {
        console.warn('[Audio] Seek failed:', e);
        // Reset to actual position if seek fails
        setProgress(audio.currentTime);
      }

      resetSeek();
      setIsSeeking(false);
    }
  }, [seekTime, resetSeek, setIsSeeking]);

  // Note: Volume is now handled via Web Audio API GainNode (lines 194-203)
  // This duplicate was removed to prevent audio clicks/conflicts



  const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);

  if (!currentSong) {
    if (!isRightPanelOpen) return null;

    return (
      <aside className="hidden xl:flex fixed right-0 top-0 h-screen w-[380px] bg-background/50 backdrop-blur-3xl border-l border-border flex-col items-center justify-center z-30">
        <div className="text-center p-8 space-y-4">
          <div className="w-24 h-24 rounded-full bg-secondary/30 flex items-center justify-center mx-auto ring-1 ring-border">
            <ListMusic className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-xl mb-2 text-foreground">No song playing</h3>
            <p className="text-sm text-muted-foreground">Select a track from the library</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => {
          if (!isBuffering) setIsPlaying(true);
        }}
        onPause={() => {
          if (!isBuffering) {
            setIsPlaying(false);
          }
        }}
        onCanPlay={() => setIsBuffering(false)}
        onCanPlayThrough={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onError={(e) => {
          console.error('[Audio] Audio element error:', e);
          setIsBuffering(false);
          setAudioError(true);
        }}
      />

      <AnimatePresence>
        {isRightPanelOpen && (
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-full sm:w-[380px] bg-background/95 text-foreground shadow-2xl z-50 overflow-hidden flex flex-col font-outfit safe-area-inset"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
              <div
                className="absolute inset-0 opacity-40 blur-3xl scale-150 transition-colors duration-1000"
                style={{ background: `radial-gradient(circle at center, ${currentSong.color || 'hsl(var(--primary))'} 0%, transparent 70%)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/90" />
            </div>

            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 z-10 border-b border-border">
              <button
                onClick={toggleRightPanel}
                className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Now Playing
              </span>

              <div className="flex gap-1">
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-2 rounded-full transition-colors ${showQueue ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}`}
                >
                  <ListMusic className="w-5 h-5" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background border-border">
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/track/${currentSong.id}`);
                      }}
                      className="cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 flex flex-col px-4 sm:px-6 pb-4 min-h-0 z-10 overflow-y-auto">
              <AnimatePresence mode="wait">
                {showQueue ? (
                  /* Queue View */
                  <motion.div
                    key="queue"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Up Next</h3>
                      <div className="flex items-center gap-2">
                        {isLoadingAutoplay && (
                          <span className="text-xs text-primary">Loading more...</span>
                        )}
                        <button
                          onClick={toggleAutoplay}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${autoPlay ? 'bg-primary/20 text-primary' : 'bg-secondary/50 text-muted-foreground'
                            }`}
                        >
                          <Radio className="w-3 h-3" />
                          Autoplay
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
                      {queue.slice(currentIndex + 1, currentIndex + 21).map((song, idx) => (
                        <QueueItem
                          key={song.id}
                          song={song}
                          index={idx}
                          isPlaying={false}
                        />
                      ))}
                      {queue.length <= currentIndex + 1 && (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          {autoPlay ? 'More songs will be added automatically' : 'Queue is empty'}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* Player View */
                  <motion.div
                    key="player"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* Album Art & Quality Info */}
                    <div className="flex-shrink-0 w-full flex flex-col items-center justify-center py-2 sm:py-4">
                      <motion.div
                        className="relative w-full aspect-square max-w-[200px] sm:max-w-[260px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-secondary flex items-center justify-center"
                        whileHover={{ scale: 1.02 }}
                      >
                        {currentSong.thumbnail && !coverImageError ? (
                          <img
                            src={getHighQualityThumbnail(currentSong.thumbnail, currentSong.id)}
                            alt={currentSong.title}
                            className="w-full h-full object-cover"
                            onError={() => setCoverImageError(true)}
                          />
                        ) : (
                          <Music className="w-24 h-24 text-muted-foreground" />
                        )}
                        {isBuffering && (
                          <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                            <div className="w-10 h-10 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
                          </div>
                        )}
                        {audioError && (
                          <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center p-4 text-center backdrop-blur-sm">
                            <p className="text-xs text-destructive font-medium mb-2">Playback Error</p>
                            <button onClick={handleRetry} className="text-xs bg-foreground text-background px-3 py-1 rounded-full uppercase font-bold tracking-wider">Retry</button>
                          </div>
                        )}
                      </motion.div>

                      {/* Audio Quality Info (Interactive) */}
                      {audioMetadata && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="mt-4 sm:mt-6 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-xl flex items-center gap-1.5 sm:gap-2 hover:bg-primary/20 transition-colors group"
                            >
                              <span className="text-[10px] font-black text-primary tracking-widest uppercase">
                                {audioMetadata.format}
                              </span>
                              <div className="w-[1px] h-3 bg-primary/20" />
                              <span className="text-[10px] font-bold text-foreground/80">
                                {audioMetadata.bitrate} kbps
                              </span>
                              <div className="w-[1px] h-3 bg-primary/20" />
                              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                {(audioMetadata.hz / 1000).toFixed(1)} kHz
                              </span>
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-48 bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl">
                            <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Quality</div>
                            {[
                              { id: 'low', label: 'Low (Data Saver)', bit: '64 kbps' },
                              { id: 'normal', label: 'Normal', bit: '128 kbps' },
                              { id: 'high', label: 'High', bit: '320 kbps' },
                              { id: 'lossless', label: 'Highest (Lossless)', bit: 'OPUS/FLAC' },
                            ].map((q) => (
                              <DropdownMenuItem
                                key={q.id}
                                onClick={() => {
                                  const settingsStore = useSettingsStore.getState();
                                  settingsStore.setSetting('audioQuality', q.id);
                                }}
                                className={`flex items-center justify-between p-2.5 cursor-pointer transition-all ${audioQuality === q.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/5'
                                  }`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold">{q.label}</span>
                                  <span className="text-[10px] opacity-50">{q.bit}</span>
                                </div>
                                {audioQuality === q.id && (
                                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Title & Artist */}
                    <div className="flex-shrink-0 flex items-center justify-between mb-2 sm:mb-3 w-full gap-2 sm:gap-4">
                      <LikeButton />
                      <div className="flex-1 min-w-0 px-1 sm:px-2 text-center">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground leading-tight line-clamp-1 mb-0.5 tracking-tight">
                          {currentSong.title}
                        </h2>
                        <span
                          onClick={() => {
                            if (currentSong.channelId) {
                              toggleRightPanel();
                              navigate(`/artist/${currentSong.channelId}`);
                            }
                          }}
                          className="text-sm text-muted-foreground font-medium line-clamp-1 hover:text-primary cursor-pointer transition-colors"
                        >
                          {currentSong.artist}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors outline-none">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-background border-border">
                          <DropdownMenuItem
                            onClick={() => addToQueueNext(currentSong)}
                            className="cursor-pointer"
                          >
                            <ListMusic className="w-4 h-4 mr-2" />
                            Play Next
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => addToQueue(currentSong)}
                            className="cursor-pointer"
                          >
                            <ListMusic className="w-4 h-4 mr-2" />
                            Add to Queue
                          </DropdownMenuItem>
                          {currentSong.channelId && (
                            <DropdownMenuItem
                              onClick={() => {
                                toggleRightPanel();
                                navigate(`/artist/${currentSong.channelId}`);
                              }}
                              className="cursor-pointer"
                            >
                              <Music className="w-4 h-4 mr-2" />
                              Go to Artist
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/track/${currentSong.id}`);
                              // Show toast?
                            }}
                            className="cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          {/* Download for Offline */}
                          <DropdownMenuItem
                            onClick={() => {
                              if (!isDownloaded(currentSong.id) && !getDownloadProgress(currentSong.id)) {
                                downloadSong(currentSong);
                              }
                            }}
                            className={`cursor-pointer ${isDownloaded(currentSong.id) ? 'text-green-500' : ''}`}
                            disabled={isDownloaded(currentSong.id)}
                          >
                            {isDownloaded(currentSong.id) ? (
                              <Check className="w-4 h-4 mr-2" />
                            ) : getDownloadProgress(currentSong.id) ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            {isDownloaded(currentSong.id) ? 'Downloaded' : getDownloadProgress(currentSong.id) ? 'Downloading...' : 'Download Offline'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-shrink-0 w-full mb-2 sm:mb-3 group">
                      <Slider
                        value={[progress]}
                        max={duration || currentSong.durationSeconds || 1}
                        step={1}
                        onValueChange={handleSeek}
                        onValueCommit={handleSeekCommit}
                        onPointerDown={handleSeekStart}
                        className="cursor-pointer"
                      />
                      <div className="flex justify-between mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors font-mono">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration || currentSong.durationSeconds)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex-shrink-0 flex items-center justify-between w-full mb-3 sm:mb-4 px-2 sm:px-0">
                      <button
                        onClick={toggleShuffle}
                        className={`p-1.5 sm:p-2 transition-colors ${shuffle ? 'text-primary relative' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                        {shuffle && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
                      </button>

                      <button
                        onClick={previousSong}
                        className="p-1.5 sm:p-2 text-foreground/80 hover:text-foreground transition-transform hover:scale-110 active:scale-95"
                      >
                        <SkipBack className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
                      </button>

                      <button
                        onClick={togglePlay}
                        className="p-3 sm:p-4 bg-primary text-primary-foreground rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        onClick={nextSong}
                        className="p-1.5 sm:p-2 text-foreground/80 hover:text-foreground transition-transform hover:scale-110 active:scale-95"
                      >
                        <SkipForward className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
                      </button>

                      <button
                        onClick={toggleRepeat}
                        className={`p-1.5 sm:p-2 transition-colors ${repeat !== 'off' ? 'text-primary relative' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {repeat === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {repeat !== 'off' && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
                      </button>
                    </div>

                    {/* Volume */}
                    <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 w-full px-1 sm:px-2 pb-2">
                      <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors">
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={(v) => {
                          setVolume(v[0]);
                          if (v[0] > 0) setIsMuted(false);
                        }}
                        className="flex-1"
                      />
                      <span className="text-[10px] sm:text-xs text-muted-foreground w-7 sm:w-8 text-right">{volume}%</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
