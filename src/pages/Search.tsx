
import { GenreCard } from '@/components/cards/GenreCard';
import { SongCard } from '@/components/cards/SongCard';
import { genres, trendingSongs } from '@/data/mockData';
import { searchYouTube, durationToSeconds } from '@/lib/youtube';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Song, usePlayerStore } from '@/store/playerStore';
import { useSearchParams } from 'react-router-dom';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Don't auto-set queue on search to prevent stopping current playback
  // const setQueue = usePlayerStore((state) => state.setQueue);

  useEffect(() => {
    const search = async () => {
      if (!query) {
        setSongs([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchYouTube(query, 30);
        const formattedSongs: Song[] = results.map((video) => ({
          id: video.id,
          title: video.title,
          artist: video.channelTitle,
          artistId: video.channelId || video.channelTitle,
          channelId: video.channelId,
          thumbnail: video.thumbnail,
          duration: video.duration || '3:30',
          durationSeconds: video.durationSeconds || (video.duration ? durationToSeconds(video.duration) : 210),
        }));
        setSongs(formattedSongs);
        // setQueue(formattedSongs); 
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to mock data
        const filtered = trendingSongs.filter(
          (song) =>
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.toLowerCase().includes(query.toLowerCase())
        );
        setSongs(filtered);
        // setQueue(filtered);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [query]);

  return (
    <>
      <Helmet>
        <title>{query ? `Search: ${query}` : 'Search'} - Supersonic Music</title>
        <meta name="description" content="Search for your favorite songs, artists, and playlists on Supersonic Music." />
      </Helmet>

      {query ? (
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
              Results for "{query}"
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isLoading ? 'Searching...' : `${songs.length} songs found`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : songs.length > 0 ? (
            <div className="glass-card p-3 sm:p-4">
              <div className="space-y-1">
                {songs.map((song, index) => (
                  <SongCard key={song.id} song={song} index={index} />
                ))}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 sm:py-20 text-center"
            >
              <div className="p-4 sm:p-6 rounded-full bg-secondary/50 mb-4 sm:mb-6">
                <SearchIcon className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">No results found</h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md px-4">
                Try searching for something else or browse our genres below
              </p>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Browse All</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Explore music by genre
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {genres.map((genre, index) => (
              <GenreCard key={genre.id} genre={genre} index={index} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Search;
