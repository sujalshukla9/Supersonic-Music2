import { motion } from 'framer-motion';
import { Genre } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface GenreCardProps {
  genre: Genre;
  index?: number;
}

export const GenreCard = ({ genre, index }: GenreCardProps) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    navigate(`/genre/${encodeURIComponent(genre.name.toLowerCase())}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index ? index * 0.05 : 0 }}
      whileHover={{ scale: 1.05, rotate: 1 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br ${genre.color}`}
    >
      {genre.image && !imageError && (
        <img
          src={genre.image}
          alt={genre.name}
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
          onError={() => setImageError(true)}
        />
      )}
      <div className="absolute inset-0 flex items-end p-3 sm:p-4">
        <h3 className="text-base sm:text-xl font-bold text-foreground drop-shadow-lg">{genre.name}</h3>
      </div>
    </motion.div>
  );
};
