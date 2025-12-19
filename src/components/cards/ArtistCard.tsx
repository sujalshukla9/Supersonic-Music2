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
      className="flex flex-col items-center text-center cursor-pointer group w-full"
    >
      <div className="relative mb-2 sm:mb-3">
        <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-2 sm:ring-4 ring-transparent group-hover:ring-primary/50 transition-all duration-300">
          <img
            src={artist.image}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        {artist.verified && (
          <div className="absolute bottom-0 right-0 p-1 sm:p-1.5 rounded-full bg-primary text-primary-foreground">
            <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-xs sm:text-sm md:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 w-full px-1">
        {artist.name}
      </h3>
      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{artist.followers} followers</p>
    </motion.div>
  );
};
