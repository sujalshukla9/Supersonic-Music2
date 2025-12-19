import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ChevronDown, Heart, Share2, ListMusic, Music, Download, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useLikesStore } from '@/store/likesStore';
import { useDownloadsStore } from '@/store/downloadsStore';
import { Slider } from '@/components/ui/slider';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const FullPlayer = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    shuffle,
    repeat,
    isFullPlayer,
    togglePlay,
    nextSong,
    previousSong,
    setVolume,
    setProgress,
    toggleShuffle,
    toggleRepeat,
    toggleRightPanel,
    toggleFullPlayer,
    seekTo,
    setIsSeeking,
    audioMetadata,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikesStore();
  const { downloadSong, isDownloaded, getDownloadProgress } = useDownloadsStore();

  const [coverImageError, setCoverImageError] = useState(false);

  useEffect(() => {
    setCoverImageError(false);
  }, [currentSong?.id]);

  if (!currentSong || !isFullPlayer) return null;

  const duration = currentSong.durationSeconds || 1;
  const songIsDownloaded = isDownloaded(currentSong.id);
  const downloadProgress = getDownloadProgress(currentSong.id);

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
        className="fixed inset-0 z-50 bg-gradient-hero flex safe-area-inset"
      >
        {/* Background Blur Effect */}
        <div
          className="absolute inset-0 opacity-30"
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
          <div className="w-full max-w-lg flex flex-col items-center py-4 sm:py-8">
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
                onClick={() => {
                  toggleFullPlayer();
                  if (!usePlayerStore.getState().isRightPanelOpen) {
                    toggleRightPanel();
                  }
                }}
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
                className="mt-4 sm:mt-6 flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl"
              >
                <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                  <span className="text-[8px] sm:text-[9px] font-black text-primary tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-0.5 sm:mb-1 opacity-80">Format</span>
                  <span className="text-xs sm:text-sm font-bold tracking-tight">{audioMetadata.format}</span>
                </div>
                <div className="w-[1px] h-6 sm:h-8 bg-white/10" />
                <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                  <span className="text-[8px] sm:text-[9px] font-black text-primary tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-0.5 sm:mb-1 opacity-80">Bitrate</span>
                  <span className="text-xs sm:text-sm font-bold tracking-tight">{audioMetadata.bitrate} kbps</span>
                </div>
                <div className="w-[1px] h-6 sm:h-8 bg-white/10" />
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
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
