import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { playlists } from '@/data/mockData';
import { PlaylistCard } from '@/components/cards/PlaylistCard';
import { Link } from 'react-router-dom';

export const PlaylistSection = () => {
  return (
    <section className="py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Featured Playlists</h2>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Handpicked playlists for every mood</p>
        </div>
        <Link to="/playlists">
          <motion.button
            whileHover={{ x: 5 }}
            className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            See all
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
        {playlists.map((playlist, index) => (
          <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
        ))}
      </div>
    </section>
  );
};
