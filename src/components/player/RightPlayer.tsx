import { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ChevronDown, MoreHorizontal, Heart, ListMusic, Radio, Volume2, VolumeX, Music, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import { useLikesStore } from '@/store/likesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Slider } from '@/components/ui/slider';

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
const QueueItem = ({ song, index, isPlaying }: { song: any; index: number; isPlaying: boolean }) => {
  const { playSong, removeFromQueue } = usePlayerStore();
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${isPlaying ? 'bg-primary/10' : ''}`}
      onClick={() => playSong(song)}
    >
      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
        {song.thumbnail && !imageError ? (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Music className="w-5 h-5 text-muted-foreground" />
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
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
    seekTo,
    seekTime,
    resetSeek,
    isSeeking,
    setIsSeeking,
    addToQueue,
    addToQueueNext,
  } = usePlayerStore();

  const { autoPlay, audioQuality, crossfade, normalizeVolume, dataSaver } = useSettingsStore();

  const [streamOffset, setStreamOffset] = useState(0);

  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(80);
  const [coverImageError, setCoverImageError] = useState(false);

  // Initialize Web Audio API
  useEffect(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioRef.current);
      const gain = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();

      // Configure Compressor for normalization-like effect
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Connect nodes: Source -> (Compressor?) -> Gain -> Destination
      source.connect(compressor); // Always connect through compressor chain structure
      compressor.connect(gain);
      gain.connect(ctx.destination);

      audioContextRef.current = ctx;
      sourceNodeRef.current = source;
      gainNodeRef.current = gain;
      compressorNodeRef.current = compressor;
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
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Resume Audio Context if suspended (browser requirement)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // FADE IN
      if (gainNodeRef.current && audioContextRef.current && crossfade > 0) {
        const ctx = audioContextRef.current;
        // Start from 0 (or current if fading)
        gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
        // Ramp to target volume
        gainNodeRef.current.gain.linearRampToValueAtTime(volume / 100, ctx.currentTime + crossfade);
      }

      const p = audio.play();
      if (p !== undefined) {
        p.catch(e => {
          console.warn('Playback failed:', e);
          setIsPlaying(false);
        });
      }
    } else {
      // FADE OUT logic could go here, but pause is usually immediate.
      // If we want fade out on pause:
      /*
      if (gainNodeRef.current && crossfade > 0) {
          const ctx = audioContextRef.current;
          gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); // fast fade out
          setTimeout(() => audio.pause(), 500);
          return;
      }
      */
      audio.pause();
    }
  }, [isPlaying, setIsPlaying, crossfade, volume]); // volume dep ensures we fade to correct level

  // Reset cover error when song changes
  useEffect(() => {
    setCoverImageError(false);
  }, [currentSong?.id]);

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
      setProgress(audioRef.current.currentTime + streamOffset);
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
    }
  };

  const handleEnded = () => {
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

    // Check if we're using proxy stream (doesn't support seeking)
    const isProxyStream = audio.src?.includes('/stream/') ?? false;

    if (isProxyStream) {
      console.log('[Audio] Proxy stream - attempting seek anyway');
      // Try to seek - it may work depending on how much is buffered
      try {
        audio.currentTime = seekValue;
        setProgress(seekValue);
      } catch (e) {
        console.log('[Audio] Seek failed, resetting to current time');
        setProgress(audio.currentTime);
      }
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

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    let isCancelled = false;
    let abortController: AbortController | null = null;
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadAudio = async () => {
      if (!currentSong) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }

      setIsLoading(true);
      setAudioError(false);
      setStreamOffset(0);

      const tryLoadFromUrl = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
          if (!audioRef.current || isCancelled) {
            resolve(false);
            return;
          }

          const audio = audioRef.current;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;

          const cleanup = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            if (timeoutId) clearTimeout(timeoutId);
          };

          const onCanPlay = () => {
            cleanup();
            if (!isCancelled) {
              console.log('[Audio] Can play - stream ready');
              setIsLoading(false);

              // Auto-play if isPlaying is true (song was clicked to play)
              if (isPlaying && audio) {
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
            console.error('[Audio] Load error:', e);
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
          }, 25000);
        });
      };

      try {
        console.log(`[Audio] Loading: ${currentSong.id}`);
        abortController = new AbortController();
        loadTimeoutId = setTimeout(() => {
          if (abortController) abortController.abort();
        }, 45000);

        // Calculate effective quality (Data Saver override)
        const effectiveQuality = dataSaver ? 'low' : audioQuality;

        // Use Proxy Stream (seeking not supported, always starts from beginning)
        console.log('[Audio] Loading via Proxy Stream...');
        const proxyUrl = `${BACKEND_URL}/stream/${currentSong.id}?quality=${effectiveQuality}`;

        const proxySuccess = await tryLoadFromUrl(proxyUrl);

        if (proxySuccess) {
          console.log('[Audio] Proxy Stream Success');
          return;
        }

        if (loadTimeoutId) clearTimeout(loadTimeoutId);
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.error('[Audio] Request timed out');
        } else {
          console.error('[Audio] Error:', e.message);
        }
      }

      if (!isCancelled) {
        setIsLoading(false);
        setAudioError(true);
      }
    };

    loadAudio();

    return () => {
      isCancelled = true;
      if (abortController) abortController.abort();
      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentSong?.id, BACKEND_URL, retryCount, setIsPlaying, audioQuality, dataSaver]);

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
    return (
      <aside className="hidden xl:flex fixed right-0 top-0 h-screen w-[380px] bg-background/50 backdrop-blur-3xl border-l border-white/5 flex-col items-center justify-center z-30">
        <div className="text-center p-8 space-y-4">
          <div className="w-24 h-24 rounded-full bg-secondary/30 flex items-center justify-center mx-auto ring-1 ring-white/10">
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
          if (!isLoading) setIsPlaying(true);
        }}
        onPause={() => {
          if (!isLoading) {
            setIsPlaying(false);
          }
        }}
        onCanPlay={() => setIsLoading(false)}
        onCanPlayThrough={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onError={(e) => {
          console.error('[Audio] Audio element error:', e);
          setIsLoading(false);
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
            className="fixed right-0 top-0 h-screen w-full sm:w-[380px] bg-background/95 text-foreground shadow-2xl z-50 overflow-hidden flex flex-col font-outfit"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
              <div
                className="absolute inset-0 opacity-40 blur-3xl scale-150 transition-colors duration-1000"
                style={{ background: `radial-gradient(circle at center, ${currentSong.color || 'hsl(var(--primary))'} 0%, transparent 70%)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/90" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 z-10">
              <button
                onClick={toggleRightPanel}
                className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-2 rounded-full transition-colors ${showQueue ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'}`}
                >
                  <ListMusic className="w-5 h-5" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col px-6 pb-4 min-h-0 z-10 overflow-hidden">
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
                    {/* Album Art */}
                    <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
                      <motion.div
                        className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-secondary flex items-center justify-center"
                        whileHover={{ scale: 1.02 }}
                      >
                        {currentSong.thumbnail && !coverImageError ? (
                          <img
                            src={currentSong.thumbnail}
                            alt={currentSong.title}
                            className="w-full h-full object-cover"
                            onError={() => setCoverImageError(true)}
                          />
                        ) : (
                          <Music className="w-24 h-24 text-muted-foreground" />
                        )}
                        {isLoading && (
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
                    </div>

                    {/* Title & Artist */}
                    <div className="flex-shrink-0 flex items-center justify-between mb-3 w-full gap-4">
                      <LikeButton />
                      <div className="flex-1 px-2 text-center">
                        <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight line-clamp-1 mb-0.5 tracking-tight">
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-shrink-0 w-full mb-3 group">
                      <Slider
                        value={[progress]}
                        max={duration || currentSong.durationSeconds || 1}
                        step={1}
                        onValueChange={handleSeek}
                        onValueCommit={handleSeekCommit}
                        onPointerDown={handleSeekStart}
                        className="cursor-pointer"
                      />
                      <div className="flex justify-between mt-1.5 text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors font-mono">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration || currentSong.durationSeconds)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex-shrink-0 flex items-center justify-between w-full mb-4">
                      <button
                        onClick={toggleShuffle}
                        className={`p-2 transition-colors ${shuffle ? 'text-primary relative' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                        {shuffle && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
                      </button>

                      <button
                        onClick={previousSong}
                        className="p-2 text-foreground/80 hover:text-foreground transition-transform hover:scale-110 active:scale-95"
                      >
                        <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                      </button>

                      <button
                        onClick={togglePlay}
                        className="p-3 sm:p-4 bg-primary text-primary-foreground rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                        ) : (
                          <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        onClick={nextSong}
                        className="p-2 text-foreground/80 hover:text-foreground transition-transform hover:scale-110 active:scale-95"
                      >
                        <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                      </button>

                      <button
                        onClick={toggleRepeat}
                        className={`p-2 transition-colors ${repeat !== 'off' ? 'text-primary relative' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {repeat === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {repeat !== 'off' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
                      </button>
                    </div>

                    {/* Volume */}
                    <div className="flex-shrink-0 flex items-center gap-3 w-full px-2">
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
                      <span className="text-xs text-muted-foreground w-8 text-right">{volume}%</span>
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
