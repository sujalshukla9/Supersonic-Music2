// YouTube API helper functions - all using backend API
import { BACKEND_URL } from '@/config/api';

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  thumbnail: string;
  duration?: string;
  durationSeconds?: number;
  viewCount?: number;
  moods?: string[];
  artist?: string;
  source?: string;
}

export interface HomeSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'horizontal' | 'list' | 'numbered' | 'genres' | 'moods';
  items: any[];
}

// Return thumbnail URL - backend already handles quality upgrades
export const getHighQualityThumbnail = (thumbnail: string, videoId?: string): string => {
  // If no thumbnail provided, try to generate from video ID
  if (!thumbnail && videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  // Return original thumbnail - backend already upgrades quality
  return thumbnail || '';
};

// Search videos
export const searchYouTube = async (query: string, maxResults = 20): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    if (response.ok) {
      const data = await response.json();
      return data.results?.map((item: any) => ({
        id: item.id,
        title: item.title,
        channelTitle: item.artist || item.channelTitle,
        channelId: item.channelId,
        thumbnail: item.thumbnail,
        duration: item.duration,
        durationSeconds: item.durationSeconds,
        viewCount: item.viewCount,
        moods: item.moods
      })) || [];
    }
  } catch (error) {
    console.error('[Search] Error:', error);
  }
  return [];
};

// Search artists
export const searchArtists = async (query: string, maxResults = 10): Promise<{
  id: string;
  name: string;
  thumbnail: string;
  subscribers?: string;
  type: string;
}[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/artists/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    if (response.ok) {
      const data = await response.json();
      return data.results || [];
    }
  } catch (error) {
    console.error('[Search Artists] Error:', error);
  }
  return [];
};

// Search suggestions
export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/search/suggestions?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      const data = await response.json();
      return data.suggestions || [];
    }
  } catch (error) {
    console.error('[Suggestions] Error:', error);
  }
  return [];
};

// Get trending music
export const getTrendingMusic = async (maxResults = 25): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/trending?maxResults=${maxResults}`);
    if (response.ok) {
      const data = await response.json();
      return data.results || [];
    }
  } catch (error) {
    console.error('[Trending] Error:', error);
  }
  return [];
};

// Get home feed sections
export const getHomeFeed = async (): Promise<HomeSection[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/home`);
    if (response.ok) {
      const data = await response.json();
      return data.sections || [];
    }
  } catch (error) {
    console.error('[Home] Error:', error);
  }
  return [];
};

// Get explore page data
export const getExplorePage = async (): Promise<HomeSection[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/explore`);
    if (response.ok) {
      const data = await response.json();
      return data.sections || [];
    }
  } catch (error) {
    console.error('[Explore] Error:', error);
  }
  return [];
};

// Get new releases
export const getNewReleases = async (maxResults = 10): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/search?q=bollywood+official+music+video+2024&maxResults=${maxResults}`);
    if (response.ok) {
      const data = await response.json();
      return data.results?.map((item: any) => ({
        id: item.id,
        title: item.title,
        channelTitle: item.artist || item.channelTitle,
        channelId: item.channelId,
        thumbnail: item.thumbnail,
        duration: item.duration,
        durationSeconds: item.durationSeconds
      })) || [];
    }
  } catch (error) {
    console.error('[New Releases] Error:', error);
  }
  return [];
};

// Get related videos
export const getRelatedVideos = async (videoId: string, maxResults = 15): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/related/${videoId}?maxResults=${maxResults}`);
    if (response.ok) {
      const data = await response.json();
      return data.results || [];
    }
  } catch (error) {
    console.error('[Related] Error:', error);
  }
  return [];
};

// Get autoplay queue
export const getAutoplayQueue = async (videoId: string, count = 20): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/autoplay/${videoId}?count=${count}`);
    if (response.ok) {
      const data = await response.json();
      return data.queue || [];
    }
  } catch (error) {
    console.error('[Autoplay] Error:', error);
  }
  return [];
};

// Get video details
export const getVideoDetails = async (videoId: string): Promise<YouTubeVideo | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/video/${videoId}`);
    if (response.ok) {
      const data = await response.json();
      return {
        id: data.id,
        title: data.title,
        channelTitle: data.artist,
        channelId: data.channelId,
        thumbnail: data.thumbnail,
        duration: data.duration,
        durationSeconds: data.durationSeconds,
        viewCount: data.viewCount,
        moods: data.moods
      };
    }
  } catch (error) {
    console.error('[Video] Error:', error);
  }
  return null;
};

// Get artist/channel details
export const getArtistDetails = async (channelId: string): Promise<{
  artist: any;
  topTracks: YouTubeVideo[];
} | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/artist/${channelId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('[Artist] Error:', error);
  }
  return null;
};

// Get genre songs
export const getGenreSongs = async (genreId: string, maxResults = 30): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/genre/${genreId}?maxResults=${maxResults}`);
    if (response.ok) {
      const data = await response.json();
      return data.results || [];
    }
  } catch (error) {
    console.error('[Genre] Error:', error);
  }
  return [];
};

// Get mood songs
export const getMoodSongs = async (moodId: string, maxResults = 30): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/mood/${moodId}?maxResults=${maxResults}`);
    if (response.ok) {
      const data = await response.json();
      return data.results || [];
    }
  } catch (error) {
    console.error('[Mood] Error:', error);
  }
  return [];
};

// Get YouTube playlist
export const getPlaylistItems = async (playlistId: string): Promise<{
  playlist: any;
  items: YouTubeVideo[];
} | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/playlist/${playlistId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('[Playlist] Error:', error);
  }
  return null;
};

// Duration helpers
export const durationToSeconds = (duration: string): number => {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return (parts[0] || 0) * 60 + (parts[1] || 0);
};

export const secondsToDuration = (seconds: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// User data helpers
export const getUserHistory = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/history`);
    if (response.ok) {
      const data = await response.json();
      return data.history || [];
    }
  } catch (error) {
    console.error('[History] Error:', error);
  }
  return [];
};

export const getUserFavorites = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/favorites`);
    if (response.ok) {
      const data = await response.json();
      return data.favorites || [];
    }
  } catch (error) {
    console.error('[Favorites] Error:', error);
  }
  return [];
};

export const getUserPlaylists = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/playlists`);
    if (response.ok) {
      const data = await response.json();
      return data.playlists || [];
    }
  } catch (error) {
    console.error('[Playlists] Error:', error);
  }
  return [];
};

export const createPlaylist = async (name: string, description = '') => {
  try {
    const response = await fetch(`${BACKEND_URL}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    if (response.ok) {
      const data = await response.json();
      return data.playlist;
    }
  } catch (error) {
    console.error('[Create Playlist] Error:', error);
  }
  return null;
};

export const addToPlaylist = async (playlistId: string, song: any) => {
  try {
    const response = await fetch(`${BACKEND_URL}/playlists/${playlistId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song })
    });
    return response.ok;
  } catch (error) {
    console.error('[Add to Playlist] Error:', error);
  }
  return false;
};
