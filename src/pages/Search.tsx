import { GenreCard } from '@/components/cards/GenreCard';
import { SongCard } from '@/components/cards/SongCard';
import { genres, trendingSongs } from '@/data/mockData';
import { searchYouTube, searchArtists, durationToSeconds } from '@/lib/youtube';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Loader2, User, Play, Music, Mic2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Song, usePlayerStore } from '@/store/playerStore';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface Artist {
  id: string;
  name: string;
  thumbnail: string;
  subscribers?: string;
  type: 'artist';
}

type SearchTab = 'all' | 'songs' | 'artists';

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q');
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const { setQueue, playSong } = usePlayerStore();

  useEffect(() => {
    const search = async () => {
      if (!query) {
        setSongs([]);
        setArtists([]);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch both songs and artists in parallel
        const [songsResults, artistsResults] = await Promise.all([
          searchYouTube(query, 30),
          searchArtists(query, 6)
        ]);

        // Format songs
        const formattedSongs: Song[] = songsResults.map((video) => ({
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

        // Format artists
        const formattedArtists: Artist[] = artistsResults.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          thumbnail: artist.thumbnail,
          subscribers: artist.subscribers,
          type: 'artist' as const
        }));
        setArtists(formattedArtists);
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to mock data for songs
        const filtered = trendingSongs.filter(
          (song) =>
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.toLowerCase().includes(query.toLowerCase())
        );
        setSongs(filtered);
        setArtists([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [query]);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  const handleArtistClick = (artistId: string) => {
    navigate(`/artist/${artistId}`);
  };

  const tabs: { id: SearchTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: songs.length + artists.length },
    { id: 'songs', label: 'Songs', count: songs.length },
    { id: 'artists', label: 'Artists', count: artists.length },
  ];

  const renderArtistCard = (artist: Artist, index: number) => (
    <motion.div
      key={artist.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => handleArtistClick(artist.id)}
      className="flex flex-col items-center p-3 sm:p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors group"
    >
      <div className="relative mb-3">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-secondary ring-2 ring-white/10 group-hover:ring-primary/50 transition-all">
          {artist.thumbnail ? (
            <img
              src={artist.thumbnail}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-3 h-3 fill-current" />
        </div>
      </div>
      <h3 className="font-semibold text-sm text-center line-clamp-1">{artist.name}</h3>
      <p className="text-[10px] sm:text-xs text-muted-foreground">Artist</p>
      {artist.subscribers && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{artist.subscribers}</p>
      )}
    </motion.div>
  );

  return (
    <>
      <Helmet>
        <title>{query ? `Search: ${query}` : 'Search'} - Supersonic Music</title>
        <meta name="description" content="Search for your favorite songs, artists, and playlists on Supersonic Music." />
      </Helmet>

      {query ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                Results for "{query}"
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isLoading ? 'Searching...' : `${songs.length} songs, ${artists.length} artists`}
              </p>
            </div>
            {songs.length > 0 && !isLoading && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-semibold text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                Play All
              </motion.button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${activeTab === tab.id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* All Tab */}
              {activeTab === 'all' && (
                <motion.div
                  key="all"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Artists Section */}
                  {artists.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Mic2 className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">Artists</h2>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {artists.slice(0, 6).map((artist, index) => renderArtistCard(artist, index))}
                      </div>
                    </section>
                  )}

                  {/* Songs Section */}
                  {songs.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Music className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">Songs</h2>
                      </div>
                      <div className="glass-card p-3 sm:p-4">
                        <div className="space-y-1">
                          {songs.slice(0, 10).map((song, index) => (
                            <SongCard key={song.id} song={song} index={index} />
                          ))}
                        </div>
                        {songs.length > 10 && (
                          <button
                            onClick={() => setActiveTab('songs')}
                            className="w-full mt-4 py-2 text-sm text-primary hover:underline"
                          >
                            Show all {songs.length} songs
                          </button>
                        )}
                      </div>
                    </section>
                  )}

                  {songs.length === 0 && artists.length === 0 && (
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
                </motion.div>
              )}

              {/* Songs Tab */}
              {activeTab === 'songs' && (
                <motion.div
                  key="songs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {songs.length > 0 ? (
                    <div className="glass-card p-3 sm:p-4">
                      <div className="space-y-1">
                        {songs.map((song, index) => (
                          <SongCard key={song.id} song={song} index={index} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Music className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No songs found</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Artists Tab */}
              {activeTab === 'artists' && (
                <motion.div
                  key="artists"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {artists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {artists.map((artist, index) => renderArtistCard(artist, index))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <User className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No artists found</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
