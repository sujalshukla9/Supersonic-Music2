
import { SongCard } from '@/components/cards/SongCard';
import { useLikesStore } from '@/store/likesStore';
import { usePlayerStore } from '@/store/playerStore';
import { motion } from 'framer-motion';
import { Heart, Play, Shuffle, Music } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';

const Favorites = () => {
  const { likedSongs, syncWithBackend } = useLikesStore();
  const { playFromList } = usePlayerStore();

  // Sync favorites with backend on mount
  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      playFromList(likedSongs, 0);
    }
  };

  const handleShuffle = () => {
    if (likedSongs.length > 0) {
      const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
      playFromList(shuffled, 0);
    }
  };

  return (
    <>
      <Helmet>
        <title>Favorites - Supersonic Music</title>
        <meta name="description" content="Your favorite songs on Supersonic Music. Listen to your personalized collection." />
      </Helmet>

      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6"
        >
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Heart className="w-16 h-16 md:w-24 md:h-24 text-primary-foreground" fill="currentColor" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Playlist
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mt-2 mb-4">Liked Songs</h1>
            <p className="text-muted-foreground">
              {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}
            </p>
            {likedSongs.length > 0 && (
              <div className="flex items-center gap-4 mt-6 justify-center md:justify-start">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold glow-primary"
                >
                  <Play className="w-5 h-5" />
                  Play All
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShuffle}
                  className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 font-semibold hover:bg-secondary/50 transition-colors"
                >
                  <Shuffle className="w-5 h-5" />
                  Shuffle
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Songs */}
        {likedSongs.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="space-y-1">
              {likedSongs.map((song, index) => (
                <SongCard key={song.id} song={song} index={index} showIndex playlist={likedSongs} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="p-6 rounded-full bg-secondary/50 mb-6">
              <Music className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No liked songs yet</h2>
            <p className="text-muted-foreground max-w-md">
              Start exploring and click the ❤️ heart icon on any song to add it to your favorites.
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default Favorites;

