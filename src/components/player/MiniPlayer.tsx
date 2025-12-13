import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronUp, ListMusic, Music } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import { Slider } from '@/components/ui/slider';

export const MiniPlayer = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    togglePlay,
    nextSong,
    previousSong,
    setVolume,
    toggleFullPlayer,
    isRightPanelOpen,
    toggleRightPanel,
  } = usePlayerStore();

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const progressPercent = (progress / (currentSong.durationSeconds || 100)) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        // Floating capsule style
        className={`fixed bottom-4 left-4 right-4 lg:left-[calc(16rem+1rem)] h-20 bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl z-50 overflow-hidden ${isRightPanelOpen ? 'hidden' : ''}`}
      >
        {/* Progress Bar (Thin line at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 cursor-pointer group">
          <motion.div
            className="h-full bg-primary/80 group-hover:bg-primary transition-colors"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between h-full px-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.div
              className="w-12 h-12 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 cursor-pointer"
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
                  <Music className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </motion.div>
            <div className="min-w-0 cursor-pointer" onClick={toggleFullPlayer}>
              <h4 className="font-medium text-sm text-foreground truncate">{currentSong.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={previousSong}
              className="hidden sm:block p-2 rounded-full hover:bg-white/10 text-foreground transition-colors"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <motion.button
              onClick={togglePlay}
              className="p-3 rounded-full bg-foreground text-background shadow-lg shadow-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </motion.button>
            <button
              onClick={nextSong}
              className="p-2 rounded-full hover:bg-white/10 text-foreground transition-colors"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Volume & Expand */}
          <div className="hidden sm:flex items-center gap-2 flex-1 justify-end">
            <div className="flex items-center gap-2 w-24 mr-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="w-full"
              />
            </div>

            <div className="h-8 w-px bg-white/10 mx-2" />

            <motion.button
              onClick={toggleRightPanel}
              className={`hidden sm:block p-2 rounded-full transition-colors ${isRightPanelOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
              whileHover={{ scale: 1.1 }}
            >
              <ListMusic className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={toggleFullPlayer}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              <ChevronUp className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
