import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ChevronDown, Heart, Share2, ListMusic, Music, Download, Check, Loader2, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useLikesStore } from '@/store/likesStore';
import { useDownloadsStore } from '@/store/downloadsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Slider } from '@/components/ui/slider';
import { Song } from '@/types';
import { getHighQualityThumbnail } from '@/lib/youtube';
// Note: Media Session is managed by RightPlayer.tsx which contains the audio element

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Queue Item component for FullPlayer
const QueueItemFull = ({ song, index, isCurrentSong }: { song: Song; index: number; isCurrentSong: boolean }) => {
  const { playSong } = usePlayerStore();
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group ${isCurrentSong ? 'bg-primary/20' : ''}`}
      onClick={() => playSong(song)}
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
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
        {isCurrentSong && (
          <div className="absolute inset-0 bg-background/60 dark:bg-black/50 flex items-center justify-center">
            <div className="flex gap-0.5">
              <span className="w-0.5 h-4 bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-4 bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-4 bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium line-clamp-1 ${isCurrentSong ? 'text-primary' : 'text-foreground'}`}>
          {song.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">{song.artist}</p>
      </div>
      <span className="text-xs text-muted-foreground">{song.duration}</span>
    </motion.div>
  );
};

export const FullPlayer = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    shuffle,
    repeat,
    queue,
    isFullPlayer,
    isLoadingAutoplay,
    showQueueInFullPlayer,
    isBuffering,
    togglePlay,
    nextSong,
    previousSong,
    setVolume,
    setProgress,
    toggleShuffle,
    toggleRepeat,
    toggleAutoplay,
    toggleFullPlayer,
    setShowQueueInFullPlayer,
    seekTo,
    setIsSeeking,
    audioMetadata,
  } = usePlayerStore();

  const { autoPlay } = useSettingsStore();
  const { isLiked, toggleLike } = useLikesStore();
  const { downloadSong, isDownloaded, getDownloadProgress } = useDownloadsStore();

  const [coverImageError, setCoverImageError] = useState(false);

  useEffect(() => {
    setCoverImageError(false);
  }, [currentSong?.id]);

  // Note: Media Session API is handled centrally by RightPlayer.tsx
  // which manages the actual audio element and playback state

  if (!currentSong || !isFullPlayer) return null;

  const duration = currentSong.durationSeconds || 1;
  const songIsDownloaded = isDownloaded(currentSong.id);
  const downloadProgress = getDownloadProgress(currentSong.id);
  const currentIndex = queue.findIndex((s) => s.id === currentSong.id);

  const handleDownload = () => {
    if (!songIsDownloaded && !downloadProgress) {
      downloadSong(currentSong);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-background dark:bg-gradient-to-b dark:from-background dark:to-background/95 flex safe-area-inset"
      >
        {/* Background Blur Effect */}
        <div
          className="absolute inset-0 opacity-10 dark:opacity-30"
          style={{
            backgroundImage: currentSong.thumbnail && !coverImageError ? `url(${currentSong.thumbnail})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(100px)',
          }}
        />

        {/* Close Button */}
        <motion.button
          onClick={toggleFullPlayer}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-secondary/50 backdrop-blur-sm hover:bg-secondary transition-colors z-10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>

        {/* Main Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 overflow-y-auto no-scrollbar w-full">
          <AnimatePresence mode="wait">
            {showQueueInFullPlayer ? (
              /* Queue View */
              <motion.div
                key="queue"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="w-full max-w-lg flex flex-col py-4 sm:py-8 h-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold">Up Next</h2>
                  <div className="flex items-center gap-3">
                    {isLoadingAutoplay && (
                      <span className="text-xs text-primary">Loading more...</span>
                    )}
                    <button
                      onClick={toggleAutoplay}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${autoPlay ? 'bg-primary/20 text-primary' : 'bg-secondary/50 text-muted-foreground'
                        }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Autoplay
                    </button>
                    <button
                      onClick={() => setShowQueueInFullPlayer(false)}
                      className="p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      <ListMusic className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {queue.slice(currentIndex + 1, currentIndex + 21).map((song, idx) => (
                    <QueueItemFull
                      key={song.id}
                      song={song}
                      index={idx}
                      isCurrentSong={false}
                    />
                  ))}
                  {queue.length <= currentIndex + 1 && (
                    <div className="text-center text-muted-foreground text-sm py-12">
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
                className="w-full max-w-lg flex flex-col items-center py-4 sm:py-8"
              >
                {/* Album Art */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative mb-6 sm:mb-8 md:mb-12 flex-shrink-0 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-secondary rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl"
                >
                  {currentSong.thumbnail && !coverImageError ? (
                    <img
                      src={currentSong.thumbnail}
                      alt={currentSong.title}
                      className="w-full h-full rounded-2xl sm:rounded-3xl object-cover"
                      onError={() => setCoverImageError(true)}
                    />
                  ) : (
                    <Music className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-muted-foreground" />
                  )}
                  {/* Buffering Overlay */}
                  {isBuffering && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm rounded-2xl sm:rounded-3xl">
                      <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full -z-10 animate-pulse-glow" />
                </motion.div>

                {/* Song Info */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-4 sm:mb-6 md:mb-8 w-full px-4"
                >
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 truncate">{currentSong.title}</h1>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground truncate">{currentSong.artist}</p>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8"
                >
                  <button
                    onClick={() => toggleLike(currentSong)}
                    className={`p-2 rounded-full hover:bg-secondary/50 transition-colors ${isLiked(currentSong.id) ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isLiked(currentSong.id) ? 'fill-current' : ''}`} />
                  </button>

                  {/* Download Button */}
                  <motion.button
                    onClick={handleDownload}
                    className={`p-2 rounded-full transition-colors ${songIsDownloaded
                      ? 'text-green-500 bg-green-500/10'
                      : downloadProgress
                        ? 'text-primary'
                        : 'hover:bg-secondary/50'
                      }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={songIsDownloaded}
                    title={songIsDownloaded ? 'Downloaded' : 'Download for offline'}
                  >
                    {songIsDownloaded ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : downloadProgress ? (
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </motion.button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/track/${currentSong.id}`);
                    }}
                    className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    onClick={() => setShowQueueInFullPlayer(true)}
                    className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <ListMusic className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </motion.div>

                {/* Progress */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-full max-w-md mb-6 sm:mb-8 px-4"
                >
                  <Slider
                    value={[progress]}
                    max={duration}
                    step={1}
                    onValueChange={(value) => {
                      setIsSeeking(true);
                      setProgress(value[0]);
                    }}
                    onValueCommit={(value) => {
                      if (value[0] >= 0) {
                        seekTo(value[0]);
                      }
                    }}
                    onPointerDown={() => setIsSeeking(true)}
                    className="mb-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                    <span>{formatTime(progress)}</span>
                    <span>{currentSong.duration}</span>
                  </div>
                </motion.div>

                {/* Controls */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-center gap-4 sm:gap-6"
                >
                  <button
                    onClick={toggleShuffle}
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={previousSong}
                    className="p-2 sm:p-3 rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <SkipBack className="w-5 h-5 sm:w-7 sm:h-7" />
                  </button>
                  <motion.button
                    onClick={togglePlay}
                    className="p-4 sm:p-5 rounded-full bg-gradient-primary text-primary-foreground glow-primary"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-1" />}
                  </motion.button>
                  <button
                    onClick={nextSong}
                    className="p-2 sm:p-3 rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <SkipForward className="w-5 h-5 sm:w-7 sm:h-7" />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {repeat === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </motion.div>

                {/* Volume */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="hidden sm:flex items-center gap-3 mt-8 w-48"
                >
                  <button onClick={() => setVolume(volume === 0 ? 80 : 0)}>
                    {volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={(value) => setVolume(value[0])}
                    className="flex-1"
                  />
                </motion.div>

                {/* Audio Quality Metrics Dashboard */}
                {audioMetadata && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 sm:mt-6 flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-2 sm:py-3 bg-secondary/50 rounded-xl sm:rounded-2xl border border-border backdrop-blur-xl shadow-2xl"
                  >
                    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                      <span className="text-[8px] sm:text-[9px] font-black text-primary tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-0.5 sm:mb-1 opacity-80">Format</span>
                      <span className="text-xs sm:text-sm font-bold tracking-tight">{audioMetadata.format}</span>
                    </div>
                    <div className="w-[1px] h-6 sm:h-8 bg-border" />
                    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                      <span className="text-[8px] sm:text-[9px] font-black text-primary tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-0.5 sm:mb-1 opacity-80">Bitrate</span>
                      <span className="text-xs sm:text-sm font-bold tracking-tight">{audioMetadata.bitrate} kbps</span>
                    </div>
                    <div className="w-[1px] h-6 sm:h-8 bg-border" />
                    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                      <span className="text-[8px] sm:text-[9px] font-black text-primary tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-0.5 sm:mb-1 opacity-80">Sample</span>
                      <span className="text-xs sm:text-sm font-bold tracking-tight">{(audioMetadata.hz / 1000).toFixed(1)} kHz</span>
                    </div>
                  </motion.div>
                )}

                {/* Downloaded indicator */}
                {songIsDownloaded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center gap-2 text-green-500 text-xs sm:text-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Available offline</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
