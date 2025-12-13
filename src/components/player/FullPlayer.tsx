import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ChevronDown, Heart, Share2, ListMusic, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useLikesStore } from '@/store/likesStore';
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
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikesStore();

  const [coverImageError, setCoverImageError] = useState(false);

  useEffect(() => {
    setCoverImageError(false);
  }, [currentSong?.id]);

  if (!currentSong || !isFullPlayer) return null;

  const duration = currentSong.durationSeconds || 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-gradient-hero flex"
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
          className="absolute top-6 left-6 p-2 rounded-full bg-secondary/50 backdrop-blur-sm hover:bg-secondary transition-colors z-10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronDown className="w-6 h-6" />
        </motion.button>

        {/* Main Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto no-scrollbar w-full">
          <div className="w-full max-w-lg flex flex-col items-center py-8">
            {/* Album Art */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative mb-8 sm:mb-12 flex-shrink-0 w-64 h-64 sm:w-80 sm:h-80 bg-secondary rounded-3xl flex items-center justify-center shadow-2xl"
            >
              {currentSong.thumbnail && !coverImageError ? (
                <motion.img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-full h-full rounded-3xl object-cover"
                  animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                  transition={isPlaying ? { duration: 20, repeat: Infinity, ease: 'linear' } : { duration: 0.5 }}
                  onError={() => setCoverImageError(true)}
                />
              ) : (
                <Music className="w-32 h-32 text-muted-foreground" />
              )}
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full -z-10 animate-pulse-glow" />
            </motion.div>

            {/* Song Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 px-4 truncate max-w-[80vw] sm:max-w-md">{currentSong.title}</h1>
              <p className="text-base sm:text-lg text-muted-foreground">{currentSong.artist}</p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-6 mb-8"
            >
              <button
                onClick={() => toggleLike(currentSong)}
                className={`p-2 rounded-full hover:bg-secondary/50 transition-colors ${isLiked(currentSong.id) ? 'text-red-500' : ''}`}
              >
                <Heart className={`w-6 h-6 ${isLiked(currentSong.id) ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/track/${currentSong.id}`);
                }}
                className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
              >
                <Share2 className="w-6 h-6" />
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
                <ListMusic className="w-6 h-6" />
              </button>
            </motion.div>

            {/* Progress */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-md mb-8"
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
                  // Seeking not supported on proxy streams, but we call seekTo anyway
                  // The seek effect in RightPlayer handles the limitation
                  if (value[0] >= 0) {
                    seekTo(value[0]);
                  }
                }}
                onPointerDown={() => setIsSeeking(true)}
                className="mb-2 cursor-pointer"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(progress)}</span>
                <span>{currentSong.duration}</span>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex items-center gap-6"
            >
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button
                onClick={previousSong}
                className="p-3 rounded-full hover:bg-secondary/50 transition-colors"
              >
                <SkipBack className="w-7 h-7" />
              </button>
              <motion.button
                onClick={togglePlay}
                className="p-5 rounded-full bg-gradient-primary text-primary-foreground glow-primary"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </motion.button>
              <button
                onClick={nextSong}
                className="p-3 rounded-full hover:bg-secondary/50 transition-colors"
              >
                <SkipForward className="w-7 h-7" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </motion.div>

            {/* Volume */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 mt-8 w-48"
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
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
