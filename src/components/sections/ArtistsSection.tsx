import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { topArtists } from '@/data/mockData';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { Link } from 'react-router-dom';

export const ArtistsSection = () => {
  return (
    <section className="py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Top Artists</h2>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Most popular artists this week</p>
        </div>
        <Link to="/artists">
          <motion.button
            whileHover={{ x: 5 }}
            className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            See all
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>

      <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 no-scrollbar">
        {topArtists.map((artist, index) => (
          <ArtistCard key={artist.id} artist={artist} index={index} />
        ))}
      </div>
    </section>
  );
};
