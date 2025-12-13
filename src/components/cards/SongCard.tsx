import { Play, Pause, MoreHorizontal, Heart, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { Song, usePlayerStore } from '@/store/playerStore';
import { useLikesStore } from '@/store/likesStore';
import { useState } from 'react';

interface SongCardProps {
  song: Song;
  index?: number;
  showIndex?: boolean;
}

export const SongCard = ({ song, index, showIndex }: SongCardProps) => {
  const { currentSong, isPlaying, playSong, togglePlay, queue, setQueue } = usePlayerStore();
  const { isLiked, toggleLike } = useLikesStore();
  const [imageError, setImageError] = useState(false);
  const isCurrentSong = currentSong?.id === song.id;
  const songIsLiked = isLiked(song.id);

  const handlePlay = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      // Add song to queue if not already there
      if (!queue.find(s => s.id === song.id)) {
        setQueue([...queue, song]);
      }
      playSong(song);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering play
    toggleLike(song);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index ? index * 0.03 : 0 }}
      className={`group flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl transition-all duration-200 cursor-pointer ${isCurrentSong ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/50'
        }`}
      onClick={handlePlay}
    >
      {/* Index or Play Button */}
      <div className="w-6 sm:w-8 flex items-center justify-center flex-shrink-0">
        {showIndex && !isCurrentSong && (
          <span className="text-muted-foreground font-medium text-sm group-hover:hidden">
            {index !== undefined ? index + 1 : ''}
          </span>
        )}
        <motion.button
          className={`${showIndex && !isCurrentSong ? 'hidden group-hover:flex' : 'flex'} items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {isCurrentSong && isPlaying ? (
            <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
          ) : (
            <Play className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" />
          )}
        </motion.button>
      </div>

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
        {song.thumbnail && !imageError ? (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-secondary">
            <Music className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        {isCurrentSong && isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="flex items-center gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="waveform-bar w-0.5" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium text-sm sm:text-base truncate ${isCurrentSong ? 'text-primary' : ''}`}>
          {song.title}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <span className="hidden sm:block text-sm text-muted-foreground flex-shrink-0">{song.duration}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <motion.button
          className={`p-1.5 sm:p-2 rounded-full transition-colors ${songIsLiked
            ? 'text-red-500'
            : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'
            } ${songIsLiked ? 'opacity-100' : ''}`}
          onClick={handleLike}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <Heart className={`w-4 h-4 ${songIsLiked ? 'fill-current' : ''}`} />
        </motion.button>
        <button className="hidden sm:block p-2 rounded-full hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
