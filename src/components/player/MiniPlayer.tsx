import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronUp, ListMusic, Music, Download, Check, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import { useDownloadsStore } from '@/store/downloadsStore';
import { Slider } from '@/components/ui/slider';

export const MiniPlayer = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    isBuffering,
    togglePlay,
    nextSong,
    previousSong,
    setVolume,
    toggleFullPlayer,
    isRightPanelOpen,
    openFullPlayerWithQueue,
  } = usePlayerStore();

  const { downloadSong, isDownloaded, getDownloadProgress } = useDownloadsStore();

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const progressPercent = (progress / (currentSong.durationSeconds || 1)) * 100;
  const songIsDownloaded = isDownloaded(currentSong.id);
  const downloadProgress = getDownloadProgress(currentSong.id);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!songIsDownloaded && !downloadProgress) {
      downloadSong(currentSong);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        // Responsive floating capsule style
        className={`fixed bottom-2 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 lg:left-[calc(16rem+1rem)] h-16 sm:h-20 bg-card/95 dark:bg-card/80 backdrop-blur-2xl border border-border shadow-2xl rounded-xl sm:rounded-2xl z-50 overflow-hidden ${isRightPanelOpen ? 'hidden' : ''}`}
      >
        {/* Progress Bar (Thin line at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-muted cursor-pointer group">
          <motion.div
            className="h-full bg-primary/80 group-hover:bg-primary transition-colors"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between h-full px-2 sm:px-4">
          {/* Song Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <motion.div
              className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-lg sm:rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={toggleFullPlayer}
            >
              {currentSong.thumbnail && !imageError ? (
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <Music className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </div>
              )}
            </motion.div>
            <div className="min-w-0 cursor-pointer" onClick={toggleFullPlayer}>
              <h4 className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[100px] sm:max-w-[180px]">{currentSong.title}</h4>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[180px]">{currentSong.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            {/* Download Button - Mobile */}
            <motion.button
              onClick={handleDownload}
              className={`p-1.5 sm:p-2 rounded-full transition-colors ${songIsDownloaded
                ? 'text-green-500'
                : downloadProgress
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={songIsDownloaded ? 'Downloaded' : 'Download for offline'}
            >
              {songIsDownloaded ? (
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : downloadProgress ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </motion.button>

            <button
              onClick={previousSong}
              className="hidden sm:block p-1.5 sm:p-2 rounded-full hover:bg-secondary text-foreground transition-colors"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>
            <motion.button
              onClick={togglePlay}
              className="p-2 sm:p-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isBuffering ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
              )}
            </motion.button>
            <button
              onClick={nextSong}
              className="p-1.5 sm:p-2 rounded-full hover:bg-secondary text-foreground transition-colors"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>
          </div>

          {/* Volume & Expand */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
            <div className="flex items-center gap-2 w-24 mr-2">
              <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="w-full"
              />
            </div>

            <div className="h-8 w-px bg-border mx-2" />

            <motion.button
              onClick={openFullPlayerWithQueue}
              className="p-2 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              whileHover={{ scale: 1.1 }}
            >
              <ListMusic className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={toggleFullPlayer}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              <ChevronUp className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Mobile expand button */}
          <motion.button
            onClick={toggleFullPlayer}
            className="md:hidden p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.1 }}
          >
            <ChevronUp className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
