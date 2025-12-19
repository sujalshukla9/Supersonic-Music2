import { Play, Pause, MoreHorizontal, Heart, Music, Download, Check, Loader2, ListPlus, PlayCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import { Song } from '@/types';
import { useLikesStore } from '@/store/likesStore';
import { useDownloadsStore } from '@/store/downloadsStore';
import { useState, MouseEvent } from 'react';
import { getHighQualityThumbnail } from '@/lib/youtube';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SongCardProps {
  song: Song;
  index?: number;
  showIndex?: boolean;
}

export const SongCard = ({ song, index, showIndex }: SongCardProps) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay, queue, setQueue, addToQueue, addToQueueNext } = usePlayerStore();
  const { isLiked, toggleLike } = useLikesStore();
  const { downloadSong, isDownloaded, getDownloadProgress } = useDownloadsStore();
  const [imageError, setImageError] = useState(false);
  const isCurrentSong = currentSong?.id === song.id;
  const songIsLiked = isLiked(song.id);
  const songIsDownloaded = isDownloaded(song.id);
  const downloadProgress = getDownloadProgress(song.id);

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

  const handleLike = (e: MouseEvent) => {
    e.stopPropagation(); // Prevent triggering play
    toggleLike(song);
  };

  const handleDownload = (e: MouseEvent) => {
    e.stopPropagation();
    if (!songIsDownloaded && !downloadProgress) {
      downloadSong(song);
    }
  };

  const handleAddToQueue = () => {
    addToQueue(song);
  };

  const handlePlayNext = () => {
    addToQueueNext(song);
  };

  const handleGoToArtist = () => {
    if (song.channelId || song.artistId) {
      navigate(`/artist/${song.channelId || song.artistId}`);
    }
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
            src={getHighQualityThumbnail(song.thumbnail, song.id)}
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
        <div className="flex items-center gap-2">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{song.artist}</p>
          {song.quality && (
            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-black border border-primary/20 uppercase tracking-tighter">
              {song.quality.format} {song.quality.bitrate}k
            </span>
          )}
        </div>
      </div>

      {/* Duration */}
      <span className="hidden sm:block text-sm text-muted-foreground flex-shrink-0">{song.duration}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Download Button */}
        <motion.button
          className={`p-1.5 sm:p-2 rounded-full transition-colors ${songIsDownloaded
            ? 'text-green-500'
            : downloadProgress
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'
            } ${songIsDownloaded ? 'opacity-100' : ''}`}
          onClick={handleDownload}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          title={songIsDownloaded ? 'Downloaded' : 'Download for offline'}
        >
          {songIsDownloaded ? (
            <Check className="w-4 h-4" />
          ) : downloadProgress ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </motion.button>

        {/* Like Button */}
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

        {/* More Options Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="hidden sm:block p-2 rounded-full hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handlePlayNext}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Play Next
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddToQueue}>
              <ListPlus className="w-4 h-4 mr-2" />
              Add to Queue
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(song.channelId || song.artistId) && (
              <DropdownMenuItem onClick={handleGoToArtist}>
                <User className="w-4 h-4 mr-2" />
                Go to Artist
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => toggleLike(song)}>
              <Heart className={`w-4 h-4 mr-2 ${songIsLiked ? 'fill-current text-red-500' : ''}`} />
              {songIsLiked ? 'Remove from Favorites' : 'Add to Favorites'}
            </DropdownMenuItem>
            {!songIsDownloaded && !downloadProgress && (
              <DropdownMenuItem onClick={() => downloadSong(song)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};
