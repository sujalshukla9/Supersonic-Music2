import { Search, Bell, ChevronLeft, ChevronRight, Menu, X, User, Mic2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import { useSearch } from '@/hooks/useSearch';
import { useRef, useEffect } from 'react';

export const Header = () => {
  const navigate = useNavigate();
  const toggleSidebar = usePlayerStore((state) => state.toggleSidebar);
  const {
    query,
    setQuery,
    suggestions,
    hasSuggestions,
    showSuggestions,
    setShowSuggestions,
    search,
    goToArtist,
    clear
  } = useSearch();

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    search(suggestion);
  };

  const handleArtistClick = (artistId: string) => {
    goToArtist(artistId);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Menu Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div ref={searchContainerRef} className="flex-1 max-w-xl mx-2 sm:mx-8 relative">
        <form onSubmit={handleSearch} className="relative z-20">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground pointer-events-none" />
          <motion.input
            type="text"
            placeholder="Search songs, artists, albums..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-10 sm:pl-12 pr-10 py-2 sm:py-3 rounded-full bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm sm:text-base cursor-text"
            whileFocus={{ scale: 1.01 }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && hasSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              {/* Artists Section */}
              {suggestions.artists.length > 0 && (
                <div className="p-2 border-b border-border/30">
                  <div className="py-1 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Mic2 className="w-3 h-3" />
                    Artists
                  </div>
                  <div className="flex gap-2 py-2 px-1 overflow-x-auto no-scrollbar">
                    {suggestions.artists.map((artist) => (
                      <motion.button
                        key={artist.id}
                        onClick={() => handleArtistClick(artist.id)}
                        className="flex flex-col items-center p-2 rounded-xl hover:bg-secondary/50 transition-colors group min-w-[70px] sm:min-w-[80px]"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-secondary ring-1 ring-white/10 group-hover:ring-primary/50 transition-all mb-1.5">
                          {artist.thumbnail ? (
                            <img
                              src={artist.thumbnail}
                              alt={artist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-center line-clamp-1 group-hover:text-primary transition-colors">
                          {artist.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Suggestions Section */}
              {suggestions.textSuggestions.length > 0 && (
                <div className="p-2">
                  <div className="py-1 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3 h-3" />
                    Suggestions
                  </div>
                  <div className="flex flex-col">
                    {suggestions.textSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-secondary/50 rounded-xl transition-colors group"
                      >
                        <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {suggestion}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell className="w-4 sm:w-5 h-4 sm:h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </button>
        <button className="hidden sm:block px-4 py-2 rounded-full bg-gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity glow-primary">
          Upgrade
        </button>
      </div>
    </header>
  );
};
