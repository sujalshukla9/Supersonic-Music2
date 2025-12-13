import { Play, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import { Playlist } from '@/data/mockData';
import { useState } from 'react';

interface PlaylistCardProps {
  playlist: Playlist;
  index?: number;
}

export const PlaylistCard = ({ playlist, index }: PlaylistCardProps) => {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index ? index * 0.08 : 0 }}
      whileHover={{ scale: 1.03 }}
      className="relative group cursor-pointer"
    >
      <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-secondary">
        {playlist.thumbnail && !imageError ? (
          <img
            src={playlist.thumbnail}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-t ${playlist.gradient}`}>
            <ListMusic className="w-1/3 h-1/3 text-white/50" />
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t ${playlist.gradient} opacity-60`} />

        {/* Play Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 p-3 sm:p-4 rounded-full bg-primary text-primary-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
        >
          <Play className="w-4 h-4 sm:w-6 sm:h-6 ml-0.5" />
        </motion.button>

        {/* Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="font-bold text-sm sm:text-lg text-foreground drop-shadow-lg">{playlist.name}</h3>
          <p className="text-xs sm:text-sm text-foreground/80 drop-shadow">{playlist.songCount} songs</p>
        </div>
      </div>
    </motion.div>
  );
};
