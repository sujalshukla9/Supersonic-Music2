import { Play, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// Get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const HeroBanner = () => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-hero min-h-[200px] sm:min-h-[320px] p-5 sm:p-8 md:p-12"
    >
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-primary/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-accent/30 rounded-full blur-3xl translate-y-1/2" />

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-8 right-12 w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-gradient-primary opacity-40 blur-sm hidden sm:block"
      />
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute bottom-12 right-1/4 w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-accent/40 blur-sm hidden sm:block"
      />

      <div className="relative z-10 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-3 sm:mb-4"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
          <span className="text-xs sm:text-sm font-medium text-accent">{getGreeting()}!</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 leading-tight"
        >
          Listen to{' '}
          <span className="text-gradient">trending songs</span>
          {' '}all the time
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm sm:text-lg text-muted-foreground mb-5 sm:mb-8 max-w-lg"
        >
          Discover millions of songs, playlists, and artists. Your personal music universe awaits.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center gap-3 sm:gap-4"
        >
          <Link to="/explore">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-sm sm:text-base glow-primary"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              Explore Now
            </motion.button>
          </Link>
          <Link to="/search">
            <button className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-full border border-border/50 font-semibold text-sm sm:text-base hover:bg-secondary/50 transition-colors">
              Browse Genres
            </button>
          </Link>
        </motion.div>
      </div>

      {/* Decorative Album Art */}
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 hidden 2xl:flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, x: 50, rotate: 12 }}
          animate={{ opacity: 1, x: 0, rotate: 12 }}
          transition={{ delay: 0.6 }}
          className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"
            alt="Album"
            className="w-full h-full object-cover"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 50, rotate: -6 }}
          animate={{ opacity: 1, x: 0, rotate: -6 }}
          transition={{ delay: 0.7 }}
          className="w-40 h-40 rounded-2xl overflow-hidden shadow-2xl -mt-16"
        >
          <img
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400"
            alt="Album"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </div>
    </motion.section>
  );
};
