import { BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Artist } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

interface ArtistCardProps {
  artist: Artist;
  index?: number;
}

export const ArtistCard = ({ artist, index }: ArtistCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index ? index * 0.1 : 0 }}
      whileHover={{ scale: 1.05 }}
      onClick={() => navigate(`/artist/${artist.id}`)}
      className="flex flex-col items-center text-center cursor-pointer group flex-shrink-0"
    >
      <div className="relative mb-3 sm:mb-4">
        <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-transparent group-hover:ring-primary/50 transition-all duration-300">
          <img
            src={artist.image}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        {artist.verified && (
          <div className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 p-1 sm:p-1.5 rounded-full bg-primary text-primary-foreground">
            <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate max-w-[100px] sm:max-w-none">
        {artist.name}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground">{artist.followers} followers</p>
    </motion.div>
  );
};
