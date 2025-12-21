import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to yt-dlp cookies for faster loading and bypass
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');
const HAS_COOKIES = fs.existsSync(COOKIES_PATH);
if (HAS_COOKIES) {
    console.log('[System] 🍪 Using cookies.txt for faster extraction');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const DEFAULT_REGION = process.env.REGION || 'IN';
const YT_API_KEY = process.env.YT_KEY || 'AIzaSyD19rb22YPwhrDDv4-FqBY5DQRUPfs24fE';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// CORS configuration - allow Vercel and other origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['*'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // Allow all origins in development, or check allowed list in production
        if (allowedOrigins[0] === '*' || allowedOrigins.some(o => origin.includes(o))) {
            return callback(null, true);
        }
        // Allow all vercel.app and localhost origins
        if (origin.includes('vercel.app') || origin.includes('localhost')) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for now
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Range', 'Authorization'],
    exposedHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges'],
    credentials: true
}));

app.use(express.json());

// Strip /api prefix - allows both /api/search and /search to work
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        req.url = req.url.replace('/api', '');
    }
    next();
});

// ============================================
// CACHES
// ============================================
const metadataCache = new Map();      // Video metadata cache (1 hour)
const searchCache = new Map();        // Search results cache (15 minutes)
const trendingCache = { data: null, timestamp: 0 }; // Trending cache (24 hours)
const artistCache = new Map();        // Artist info cache (1 hour)
const extractCache = new Map();       // Audio URL cache (4 hours)
const audioQualityCache = new Map();  // Audio quality metadata cache (24 hours)

const METADATA_CACHE_DURATION = 60 * 60 * 1000;        // 1 hour
const SEARCH_CACHE_DURATION = 15 * 60 * 1000;          // 15 minutes
const TRENDING_CACHE_DURATION = 60 * 60 * 1000;           // 1 hour (fresher trending)
const EXTRACT_CACHE_DURATION = 4 * 60 * 60 * 1000;     // 4 hours
const QUALITY_CACHE_DURATION = 24 * 60 * 60 * 1000;     // 24 hours

// ============================================
// SIMPLE IN-MEMORY DATABASE
// ============================================
const defaultDB = {
    history: [],
    favorites: [],
    playlists: [],
    recentSearches: [],
    lastPlayed: null,
    settings: {
        theme: 'dark',
        accentColor: 'violet',
        audioQuality: 'high',
        autoPlay: true,
        crossfade: 3,
        normalizeVolume: true,
        bassBoost: 0,
        downloadQuality: 'high',
        dataSaver: false
    },
    userHabits: {
        artistPlayCounts: {},
        genrePlayCounts: {},
        moodPlayCounts: {},
        songPlayCounts: {},
        listeningStats: {
            totalPlays: 0,
            totalTimeListened: 0,
            avgSessionLength: 0,
            favoriteTimeOfDay: null,
            lastUpdated: null
        },
        topArtists: [],
        topGenres: [],
        topMoods: [],
        recentlyPlayed: []
    }
};

let db = { ...defaultDB };

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseDuration(duration) {
    if (!duration) return 0;
    const matchISO = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (matchISO) {
        const hours = parseInt(matchISO[1] || '0');
        const minutes = parseInt(matchISO[2] || '0');
        const seconds = parseInt(matchISO[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Try M:S or H:M:S
    if (duration.includes(':')) {
        const parts = duration.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return 0;
}

// Fix malformed or truncated YouTube thumbnail URLs
// Only fixes broken URLs, returns valid URLs unchanged
function fixThumbnailUrl(thumbnail, videoId = null) {
    // If no thumbnail, generate from video ID
    if (!thumbnail) {
        if (videoId) {
            return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
        return '';
    }

    // If it's already a valid full URL, return as-is
    if (thumbnail.startsWith('https://') || thumbnail.startsWith('http://')) {
        // Check for truncated/malformed URLs
        if (!thumbnail.includes('.') || thumbnail.length < 20) {
            if (videoId) {
                return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }
            return '';
        }
        // Valid URL - return unchanged
        return thumbnail;
    }

    // Handle relative paths or malformed URLs
    if (videoId) {
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    // Try to extract video ID from partial URL
    const match = thumbnail.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
    if (match) {
        return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }

    // Return original if we can't fix it
    return thumbnail;
}

function extractMoodTags(title) {
    const lowerTitle = title.toLowerCase();
    const moods = [];

    const moodKeywords = {
        romantic: ['romantic', 'love', 'pyar', 'ishq', 'dil', 'heart', 'mohabbat', 'valentine'],
        sad: ['sad', 'broken', 'dard', 'pain', 'cry', 'tears', 'heartbreak', 'bewafa'],
        happy: ['happy', 'celebration', 'party', 'dance', 'khushi', 'masti', 'fun'],
        energetic: ['energy', 'pump', 'workout', 'gym', 'power', 'intense', 'fast'],
        chill: ['chill', 'relax', 'calm', 'peaceful', 'lofi', 'lo-fi', 'sleep', 'soothing'],
        devotional: ['bhajan', 'aarti', 'devotional', 'spiritual', 'mantra', 'prayer'],
        patriotic: ['desh', 'india', 'patriotic', 'republic', 'independence', 'vande mataram'],
        retro: ['90s', '80s', 'retro', 'old', 'classic', 'evergreen', 'golden'],
        punjabi: ['punjabi', 'bhangra', 'dhol', 'jatt'],
        hiphop: ['rap', 'hip-hop', 'hiphop', 'rapper', 'beat']
    };

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
        if (keywords.some(kw => lowerTitle.includes(kw))) {
            moods.push(mood);
        }
    }

    return moods;
}

function getTimeOfDay(date) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function initUserHabits() {
    if (!db.userHabits) {
        db.userHabits = { ...defaultDB.userHabits };
    }
    return db.userHabits;
}

function trackSongPlay(song, durationListened = 0) {
    const habits = initUserHabits();
    const now = new Date();
    const timeOfDay = getTimeOfDay(now);

    if (!habits.songPlayCounts[song.id]) {
        habits.songPlayCounts[song.id] = {
            title: song.title,
            artist: song.artist,
            thumbnail: song.thumbnail,
            count: 0,
            lastPlayed: null
        };
    }
    habits.songPlayCounts[song.id].count++;
    habits.songPlayCounts[song.id].lastPlayed = now.toISOString();

    const artistId = song.channelId || song.artist || 'unknown';
    if (!habits.artistPlayCounts[artistId]) {
        habits.artistPlayCounts[artistId] = {
            name: song.artist,
            count: 0,
            lastPlayed: null
        };
    }
    habits.artistPlayCounts[artistId].count++;
    habits.artistPlayCounts[artistId].lastPlayed = now.toISOString();

    const moods = extractMoodTags(song.title);
    moods.forEach(mood => {
        habits.moodPlayCounts[mood] = (habits.moodPlayCounts[mood] || 0) + 1;
    });

    habits.listeningStats.totalPlays++;
    habits.listeningStats.totalTimeListened += durationListened;
    habits.listeningStats.lastUpdated = now.toISOString();

    habits.listeningStats.timeOfDayCounts = habits.listeningStats.timeOfDayCounts || {};
    habits.listeningStats.timeOfDayCounts[timeOfDay] = (habits.listeningStats.timeOfDayCounts[timeOfDay] || 0) + 1;

    habits.recentlyPlayed = habits.recentlyPlayed.filter(s => s.id !== song.id);
    habits.recentlyPlayed.unshift({
        id: song.id,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        playedAt: now.toISOString()
    });
    habits.recentlyPlayed = habits.recentlyPlayed.slice(0, 50);

    updateUserHabitsStats();
}

function updateUserHabitsStats() {
    const habits = initUserHabits();

    habits.topArtists = Object.entries(habits.artistPlayCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    habits.topMoods = Object.entries(habits.moodPlayCounts)
        .map(([mood, count]) => ({ mood, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const timeCounts = habits.listeningStats.timeOfDayCounts || {};
    const maxTime = Object.entries(timeCounts)
        .sort((a, b) => b[1] - a[1])[0];
    habits.listeningStats.favoriteTimeOfDay = maxTime ? maxTime[0] : null;
}

// ============================================
// YOUTUBE DATA API FUNCTIONS
// ============================================

async function youtubeApiRequest(endpoint, params) {
    const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
    url.searchParams.set('key', YT_API_KEY);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
    }
    return response.json();
}

// ============================================
// YTMUSICAPI INTEGRATION (Python)
// ============================================

async function runMusicApi(command, ...args) {
    try {
        // Escape arguments for shell
        const escapedArgs = args.map(arg => {
            if (typeof arg === 'number') return arg;
            return `"${String(arg).replace(/"/g, '\\"')}"`;
        }).join(' ');

        // Use 'python' on Windows, 'python3' on Unix
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const cmd = `${pythonCmd} music_api.py ${command} ${escapedArgs}`;

        const { stdout } = await execAsync(cmd, {
            cwd: __dirname,
            timeout: 30000 // 30 second timeout
        });

        try {
            return JSON.parse(stdout.trim());
        } catch (e) {
            console.error('[YTMusicAPI] JSON Parse error:', stdout.substring(0, 200));
            return null;
        }
    } catch (e) {
        console.error('[YTMusicAPI] Exec error:', e.message);
        return null;
    }
}

async function searchVideos(query, maxResults = 20, type = 'songs') {
    const cacheKey = `search:${query}:${type}:${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
        return cached.data;
    }

    console.log(`[Search] Searching for: ${query} (type: ${type})`);

    // Try ytmusicapi first (better music results)
    try {
        const results = await runMusicApi('search', query, type, maxResults);

        if (results && Array.isArray(results) && results.length > 0) {
            const items = results.slice(0, maxResults).map(item => {
                // Extract thumbnails
                let thumbnail = '';
                if (item.thumbnails && Array.isArray(item.thumbnails)) {
                    thumbnail = item.thumbnails[item.thumbnails.length - 1]?.url || '';
                }

                // Extract artist
                let artistName = '';
                let artistId = '';
                if (item.artists && Array.isArray(item.artists)) {
                    artistName = item.artists.map(a => a.name).join(', ');
                    artistId = item.artists[0]?.id || '';
                }

                const id = item.videoId || item.browseId || item.id;

                return {
                    id: id,
                    title: item.title,
                    artist: artistName || item.author || '',
                    channelId: artistId,
                    thumbnail: fixThumbnailUrl(thumbnail, id),
                    description: item.description || '',
                    duration: item.duration || '0:00',
                    durationSeconds: item.duration_seconds || parseDuration(item.duration || '0:00'),
                    type: item.resultType || type,
                    moods: extractMoodTags(item.title || '')
                };
            }).filter(i => i.id);

            console.log(`[Search] Found ${items.length} results via ytmusicapi`);
            searchCache.set(cacheKey, { data: items, timestamp: Date.now() });
            return items;
        }
    } catch (e) {
        console.warn('[Search] ytmusicapi failed, falling back to YouTube API:', e.message);
    }

    // Fallback to YouTube Data API
    try {
        const searchData = await youtubeApiRequest('search', {
            part: 'snippet',
            type: 'video',
            q: query,
            maxResults: maxResults,
            videoCategoryId: '10', // Music
            regionCode: DEFAULT_REGION
        });

        if (!searchData.items || searchData.items.length === 0) {
            return [];
        }

        // Get video details for durations
        const videoIds = searchData.items.map(item => item.id.videoId).join(',');
        const detailsData = await youtubeApiRequest('videos', {
            part: 'snippet,contentDetails,statistics',
            id: videoIds
        });

        const detailsMap = new Map();
        for (const item of detailsData.items || []) {
            detailsMap.set(item.id, item);
        }

        const results = searchData.items.map(item => {
            const details = detailsMap.get(item.id.videoId);
            const durationISO = details?.contentDetails?.duration || 'PT0S';
            const durationSeconds = parseDuration(durationISO);

            return {
                id: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                thumbnail: fixThumbnailUrl(item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url, item.id.videoId),
                description: item.snippet.description || '',
                duration: formatDuration(durationSeconds),
                durationSeconds,
                publishedAt: item.snippet.publishedAt,
                viewCount: details?.statistics?.viewCount || '0',
                moods: extractMoodTags(item.snippet.title)
            };
        });

        searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
        console.log(`[Search] Found ${results.length} results via YouTube API`);
        return results;
    } catch (error) {
        console.error('[Search] All methods failed:', error.message);
        return [];
    }
}

async function getVideoDetails(videoIds) {
    const ids = Array.isArray(videoIds) ? videoIds : [videoIds];
    const uniqueIds = [...new Set(ids)];

    const uncachedIds = uniqueIds.filter(id => {
        const cached = metadataCache.get(id);
        return !cached || Date.now() - cached.timestamp > METADATA_CACHE_DURATION;
    });

    if (uncachedIds.length > 0) {
        try {
            const data = await youtubeApiRequest('videos', {
                part: 'snippet,contentDetails,statistics',
                id: uncachedIds.join(',')
            });

            for (const item of data.items || []) {
                const durationISO = item.contentDetails?.duration || 'PT0S';
                const durationSeconds = parseDuration(durationISO);

                const videoData = {
                    id: item.id,
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnail: fixThumbnailUrl(item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url, item.id),
                    description: item.snippet.description || '',
                    duration: formatDuration(durationSeconds),
                    durationSeconds,
                    publishedAt: item.snippet.publishedAt,
                    viewCount: item.statistics?.viewCount || '0',
                    likeCount: item.statistics?.likeCount || '0',
                    moods: extractMoodTags(item.snippet.title)
                };

                metadataCache.set(item.id, { data: videoData, timestamp: Date.now() });
            }
        } catch (error) {
            console.error('[Video Details] Error:', error.message);
        }
    }

    return uniqueIds.map(id => metadataCache.get(id)?.data).filter(Boolean);
}

async function getTrendingMusic(maxResults = 25, forceRefresh = false) {
    // Check cache (but allow force refresh)
    if (!forceRefresh && trendingCache.data && Date.now() - trendingCache.timestamp < TRENDING_CACHE_DURATION) {
        console.log('[Trending] Returning cached data');
        return trendingCache.data;
    }

    console.log('[Trending] Fetching fresh trending music...');

    let allTracks = [];
    let sources = [];

    // Strategy 1: Try ytmusicapi charts (best for India trending)
    try {
        const chartsData = await runMusicApi('get_charts', 'IN');

        if (chartsData && !chartsData.error) {
            // Get from videos/trending section
            const chartItems = chartsData.videos?.items || chartsData.trending?.items || [];

            if (chartItems.length > 0) {
                const chartTracks = chartItems.slice(0, 15).map((item, index) => {
                    let thumbnail = '';
                    if (item.thumbnails && item.thumbnails.length > 0) {
                        thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                    }

                    return {
                        id: item.videoId,
                        title: item.title || '',
                        artist: item.artists ? item.artists.map(a => a.name).join(', ') : '',
                        channelId: item.artists?.[0]?.id || '',
                        thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                        duration: item.duration || '3:30',
                        durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                        rank: index + 1,
                        moods: extractMoodTags(item.title || ''),
                        source: 'charts'
                    };
                }).filter(t => t.id);

                allTracks.push(...chartTracks);
                sources.push('charts');
                console.log(`[Trending] Got ${chartTracks.length} from charts`);
            }
        }
    } catch (e) {
        console.warn('[Trending] Charts failed:', e.message);
    }

    // Strategy 2: Try ytmusicapi get_trending (search fallback)
    if (allTracks.length < maxResults) {
        try {
            const trendingData = await runMusicApi('get_trending', maxResults);

            if (trendingData && !trendingData.error && trendingData.trending && trendingData.trending.length > 0) {
                const trendTracks = trendingData.trending.slice(0, 15).map((item, index) => {
                    let thumbnail = '';
                    if (item.thumbnails && item.thumbnails.length > 0) {
                        thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                    }

                    return {
                        id: item.videoId,
                        title: item.title || '',
                        artist: item.artists ? item.artists.map(a => a.name).join(', ') : (item.subtitle || ''),
                        channelId: item.artists?.[0]?.id || '',
                        thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                        duration: item.duration || '3:30',
                        durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                        rank: allTracks.length + index + 1,
                        moods: extractMoodTags(item.title || ''),
                        source: 'trending'
                    };
                }).filter(t => t.id && !allTracks.find(at => at.id === t.id));

                allTracks.push(...trendTracks);
                sources.push('trending');
                console.log(`[Trending] Got ${trendTracks.length} from get_trending`);
            }
        } catch (e) {
            console.warn('[Trending] get_trending failed:', e.message);
        }
    }

    // Strategy 3: Try ytmusicapi home feed for fresh picks
    if (allTracks.length < maxResults) {
        try {
            const homeData = await runMusicApi('get_home');

            if (homeData && Array.isArray(homeData) && homeData.length > 0) {
                // Get songs from first few sections
                for (const section of homeData.slice(0, 3)) {
                    const sectionItems = (section.contents || [])
                        .filter(item => item.videoId && !allTracks.find(at => at.id === item.videoId))
                        .slice(0, 5)
                        .map((item, index) => {
                            let thumbnail = '';
                            if (item.thumbnails && item.thumbnails.length > 0) {
                                thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                            }

                            return {
                                id: item.videoId,
                                title: item.title || '',
                                artist: item.artists ? item.artists.map(a => a.name).join(', ') : '',
                                channelId: item.artists?.[0]?.id || '',
                                thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                                duration: item.duration || '3:30',
                                durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                                rank: allTracks.length + index + 1,
                                moods: extractMoodTags(item.title || ''),
                                source: 'home'
                            };
                        });

                    allTracks.push(...sectionItems);
                }
                sources.push('home');
                console.log(`[Trending] Added tracks from home feed`);
            }
        } catch (e) {
            console.warn('[Trending] Home feed failed:', e.message);
        }
    }

    // Strategy 4: Fallback to YouTube Data API
    if (allTracks.length < 5) {
        try {
            const data = await youtubeApiRequest('videos', {
                part: 'snippet,contentDetails,statistics',
                chart: 'mostPopular',
                videoCategoryId: '10', // Music
                regionCode: DEFAULT_REGION,
                maxResults: maxResults
            });

            const ytTracks = (data.items || []).map((item, index) => {
                const durationISO = item.contentDetails?.duration || 'PT0S';
                const durationSeconds = parseDuration(durationISO);

                return {
                    id: item.id,
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnail: fixThumbnailUrl(item.snippet.thumbnails?.high?.url, item.id),
                    duration: formatDuration(durationSeconds),
                    durationSeconds,
                    rank: allTracks.length + index + 1,
                    viewCount: item.statistics?.viewCount || '0',
                    moods: extractMoodTags(item.snippet.title),
                    source: 'youtube_api'
                };
            }).filter(t => !allTracks.find(at => at.id === t.id));

            allTracks.push(...ytTracks);
            sources.push('youtube_api');
            console.log(`[Trending] Got ${ytTracks.length} from YouTube API`);
        } catch (error) {
            console.error('[Trending] YouTube API failed:', error.message);
        }
    }

    // Strategy 5: Last resort - search for trending songs
    if (allTracks.length < 5) {
        try {
            const searchQueries = [
                'trending hindi songs 2024',
                'latest bollywood songs',
                'new music videos india'
            ];
            const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
            const searchResults = await searchVideos(query, 15);

            const searchTracks = searchResults
                .filter(t => !allTracks.find(at => at.id === t.id))
                .map((t, i) => ({ ...t, rank: allTracks.length + i + 1, source: 'search' }));

            allTracks.push(...searchTracks);
            sources.push('search');
            console.log(`[Trending] Got ${searchTracks.length} from search fallback`);
        } catch (e) {
            console.error('[Trending] Search fallback failed:', e.message);
        }
    }

    // Deduplicate by ID
    const uniqueTracks = [];
    const seenIds = new Set();
    for (const track of allTracks) {
        if (!seenIds.has(track.id)) {
            seenIds.add(track.id);
            uniqueTracks.push(track);
        }
    }

    // Shuffle to add variety (but keep some order for "trending" feel)
    // Shuffle only the middle portion, keep top 3 and last 3 stable
    if (uniqueTracks.length > 10) {
        const top = uniqueTracks.slice(0, 3);
        const middle = uniqueTracks.slice(3, -3);
        const bottom = uniqueTracks.slice(-3);

        // Fisher-Yates shuffle for middle
        for (let i = middle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [middle[i], middle[j]] = [middle[j], middle[i]];
        }

        allTracks = [...top, ...middle, ...bottom];
    } else {
        allTracks = uniqueTracks;
    }

    // Re-rank after shuffle
    allTracks = allTracks.slice(0, maxResults).map((track, index) => ({
        ...track,
        rank: index + 1
    }));

    console.log(`[Trending] Final: ${allTracks.length} tracks from sources: ${sources.join(', ')}`);

    // Cache the results
    if (allTracks.length > 0) {
        trendingCache.data = allTracks;
        trendingCache.timestamp = Date.now();
    }

    return allTracks;
}


async function getRelatedVideos(videoId, maxResults = 20) {
    // First try ytmusicapi's watch playlist (best for music recommendations)
    try {
        const watchData = await runMusicApi('get_watch_playlist', videoId, maxResults);

        if (watchData && !watchData.error && watchData.tracks && watchData.tracks.length > 0) {
            const results = watchData.tracks.slice(0, maxResults).map(item => {
                let thumbnail = '';
                if (item.thumbnail && item.thumbnail.length > 0) {
                    thumbnail = item.thumbnail[item.thumbnail.length - 1].url;
                } else if (item.thumbnails && item.thumbnails.length > 0) {
                    thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                }

                return {
                    id: item.videoId,
                    title: item.title || '',
                    artist: item.artists ? item.artists.map(a => a.name).join(', ') : (item.byline || ''),
                    channelId: item.artists && item.artists[0] ? item.artists[0].id : '',
                    thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                    duration: item.duration || '3:30',
                    durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                    source: 'ytmusic_related'
                };
            });

            console.log(`[Related] Found ${results.length} tracks via ytmusicapi watch playlist`);
            return results;
        }
    } catch (e) {
        console.warn('[Related] ytmusicapi failed:', e.message);
    }

    // Fallback: Search for similar songs using the seed video title
    try {
        const [seedVideo] = await getVideoDetails(videoId);
        if (seedVideo) {
            const artistName = seedVideo.artist || '';
            const searchQuery = artistName ? `${artistName} songs` : 'hindi songs';
            console.log(`[Related] Fallback search: ${searchQuery}`);

            const searchResults = await searchVideos(searchQuery, maxResults + 5);
            // Filter out the seed video
            return searchResults.filter(v => v.id !== videoId).slice(0, maxResults);
        }
    } catch (e) {
        console.warn('[Related] Search fallback failed:', e.message);
    }

    // Last resort: trending
    try {
        const trending = await getTrendingMusic(maxResults);
        return trending.filter(v => v.id !== videoId).slice(0, maxResults);
    } catch (e) {
        console.error('[Related] All methods failed');
        return [];
    }
}

async function getChannelDetails(channelId) {
    const cached = artistCache.get(channelId);
    if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
        return cached.data;
    }

    try {
        const data = await youtubeApiRequest('channels', {
            part: 'snippet,statistics',
            id: channelId
        });

        if (!data.items || data.items.length === 0) {
            return null;
        }

        const channel = data.items[0];
        const result = {
            id: channel.id,
            name: channel.snippet.title,
            description: channel.snippet.description || '',
            thumbnail: channel.snippet.thumbnails?.high?.url || '',
            subscriberCount: channel.statistics?.subscriberCount || '0',
            videoCount: channel.statistics?.videoCount || '0',
            verified: true
        };

        artistCache.set(channelId, { data: result, timestamp: Date.now() });
        return result;
    } catch (error) {
        console.error('[Channel] Error:', error.message);
        return null;
    }
}

async function getChannelVideos(channelId, maxResults = 20) {
    try {
        const data = await youtubeApiRequest('search', {
            part: 'snippet',
            channelId: channelId,
            type: 'video',
            maxResults: maxResults,
            order: 'viewCount',
            videoCategoryId: '10'
        });

        return (data.items || []).map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            channelId: channelId,
            thumbnail: item.snippet.thumbnails?.high?.url || '',
            duration: '3:30',
            durationSeconds: 210
        }));
    } catch (error) {
        console.error('[Channel Videos] Error:', error.message);
        return [];
    }
}

async function getPlaylistDetails(playlistId) {
    try {
        const data = await youtubeApiRequest('playlists', {
            part: 'snippet,contentDetails',
            id: playlistId
        });

        if (!data.items || data.items.length === 0) {
            return null;
        }

        const playlist = data.items[0];
        return {
            id: playlist.id,
            title: playlist.snippet.title,
            description: playlist.snippet.description || '',
            thumbnail: playlist.snippet.thumbnails?.high?.url || '',
            channelTitle: playlist.snippet.channelTitle,
            itemCount: playlist.contentDetails?.itemCount || 0
        };
    } catch (error) {
        console.error('[Playlist] Error:', error.message);
        return null;
    }
}

async function getPlaylistItems(playlistId, maxResults = 50) {
    try {
        const data = await youtubeApiRequest('playlistItems', {
            part: 'snippet,contentDetails',
            playlistId: playlistId,
            maxResults: maxResults
        });

        return (data.items || []).map(item => ({
            id: item.contentDetails.videoId,
            title: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle || '',
            channelId: item.snippet.videoOwnerChannelId || '',
            thumbnail: item.snippet.thumbnails?.high?.url || '',
            duration: '3:30',
            durationSeconds: 210
        }));
    } catch (error) {
        console.error('[Playlist Items] Error:', error.message);
        return [];
    }
}

// ============================================
// AUDIO EXTRACTION (FAST MULTI-SOURCE)
// ============================================

// Invidious and Piped instances for fast extraction
const INVIDIOUS_INSTANCES = [
    'https://invidious.fdn.fr',
    'https://vid.puffyan.us',
    'https://invidious.snopyta.org',
    'https://yewtu.be',
    'https://invidious.kavin.rocks',
    'https://inv.bp.projectsegfau.lt',
    'https://invidious.privacydev.net',
    'https://invidious.slipfox.xyz'
];

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.yt',
    'https://pipedapi.in.projectsegfau.lt',
    'https://pipedapi.leptons.xyz'
];

// Fast extraction from Invidious
async function extractFromInvidious(videoId, instance, signal) {
    try {
        const url = `${instance}/api/v1/videos/${videoId}`;
        const response = await fetch(url, {
            signal,
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) return null;

        const data = await response.json();

        // Find best audio format
        const audioFormats = data.adaptiveFormats?.filter(f =>
            f.type?.includes('audio') || f.mimeType?.includes('audio')
        ) || [];

        if (audioFormats.length === 0) return null;

        // Sort by bitrate (highest first) to get best quality
        audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const best = audioFormats[0];
        const bitrateKbps = Math.round((best.bitrate || 128000) / 1000);
        const hz = best.audioSampleRate || 48000;

        console.log(`[Invidious] Selected ${bitrateKbps}kbps ${hz}Hz audio from ${instance}`);

        return {
            url: best.url,
            format: best.container || 'webm',
            bitrate: bitrateKbps,
            hz: hz,
            mimeType: best.type || best.mimeType || 'audio/webm',
            source: 'invidious',
            instance: instance,
            quality: 'lossless'
        };
    } catch (e) {
        return null;
    }
}

// Fast extraction from Piped
async function extractFromPiped(videoId, instance, signal) {
    try {
        const url = `${instance}/streams/${videoId}`;
        const response = await fetch(url, {
            signal,
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) return null;

        const data = await response.json();

        // Get audio streams
        const audioStreams = data.audioStreams || [];

        if (audioStreams.length === 0) return null;

        // Sort by bitrate (highest first) to get best quality
        audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const best = audioStreams[0];
        const bitrateKbps = Math.round((best.bitrate || 128000) / 1000);
        const hz = best.sampleRate || 48000;

        console.log(`[Piped] Selected ${bitrateKbps}kbps ${hz}Hz audio from ${instance}`);

        return {
            url: best.url,
            format: best.format || 'webm',
            bitrate: bitrateKbps,
            hz: hz,
            mimeType: best.mimeType || 'audio/webm',
            source: 'piped',
            instance: instance,
            quality: 'lossless'
        };
    } catch (e) {
        return null;
    }
}

// yt-dlp extraction (slower but more reliable fallback)
// Uses highest quality audio format available
async function extractWithYtDlp(videoId, quality = 'lossless') {
    try {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        // Define format selectors based on quality
        let formatSelector = 'bestaudio[acodec=opus]/bestaudio[acodec=mp4a.40.2]/bestaudio/best';

        if (quality === 'low') {
            formatSelector = 'bestaudio[abr<=64]/bestaudio[bitrate<=64]/worstaudio/best';
        } else if (quality === 'normal') {
            formatSelector = 'bestaudio[abr<=128]/bestaudio[bitrate<=128]/bestaudio/best';
        } else if (quality === 'high') {
            formatSelector = 'bestaudio[abr<=320]/bestaudio[bitrate<=320]/bestaudio/best';
        }

        // Get audio URL with selected quality format
        const cookiesFlag = HAS_COOKIES ? `--cookies "${COOKIES_PATH}"` : "";
        const cmd = `${pythonCmd} -m yt_dlp ${cookiesFlag} -f "${formatSelector}" -g --no-warnings --no-playlist "https://www.youtube.com/watch?v=${videoId}"`;

        const { stdout } = await execAsync(cmd, {
            cwd: __dirname,
            timeout: 15000 // Reduced timeout for faster fallback
        });

        const audioUrl = stdout.trim();

        if (!audioUrl || !audioUrl.startsWith('http')) {
            return null;
        }

        // Try to get format info for accurate bitrate reporting
        let bitrate = 160; // Default to 160kbps (OPUS typical)
        let format = 'webm';
        let mimeType = 'audio/webm; codecs=opus';
        let hz = 48000;

        try {
            // Get format info in a separate call
            const infoCmd = `${pythonCmd} -m yt_dlp ${cookiesFlag} -f "${formatSelector}" -j --no-warnings --no-playlist "https://www.youtube.com/watch?v=${videoId}"`;
            const { stdout: infoStdout } = await execAsync(infoCmd, {
                cwd: __dirname,
                timeout: 10000
            });

            const info = JSON.parse(infoStdout.trim());
            bitrate = info.abr || info.tbr || 160;
            format = info.ext || 'webm';
            hz = info.asr || 48000;

            if (info.acodec === 'opus') {
                mimeType = 'audio/webm; codecs=opus';
            } else if (info.acodec === 'mp4a.40.2' || info.ext === 'm4a') {
                mimeType = 'audio/mp4';
                format = 'm4a';
            }

            console.log(`[yt-dlp] Got ${bitrate}kbps ${hz}Hz ${info.acodec || 'audio'} format`);
        } catch (e) {
            // Info fetch failed, use defaults
            console.log(`[yt-dlp] Using default quality info (${bitrate}kbps, ${hz}Hz)`);
        }

        return {
            url: audioUrl,
            format: format,
            bitrate: bitrate,
            hz: hz,
            mimeType: mimeType,
            source: 'yt-dlp',
            extractor: 'yt-dlp',
            quality: 'lossless'
        };
    } catch (e) {
        console.error(`[yt-dlp] Extraction failed: ${e.message}`);
        return null;
    }
}

// FAST parallel extraction - races all sources
// Always uses highest quality audio by default
async function extractAudioFast(videoId, quality = 'lossless') {
    // Check cache first
    const cacheKey = `${videoId}:${quality}`;
    const cached = extractCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < EXTRACT_CACHE_DURATION) {
        console.log(`[FastExtract] ⚡ Cache hit for ${videoId}`);
        return cached.data;
    }

    console.log(`[FastExtract] 🚀 Racing sources for: ${videoId}`);
    const startTime = Date.now();

    // Create abort controller for cancelling slow requests
    const controller = new AbortController();
    const signal = controller.signal;

    // Race all Invidious and Piped instances in parallel
    const invidiousPromises = INVIDIOUS_INSTANCES.map(instance =>
        extractFromInvidious(videoId, instance, signal)
    );

    const pipedPromises = PIPED_INSTANCES.map(instance =>
        extractFromPiped(videoId, instance, signal)
    );

    // Also start yt-dlp as slower fallback
    const ytdlpPromise = extractWithYtDlp(videoId, quality);

    try {
        // Use Promise.any to get the first successful result
        const allPromises = [...invidiousPromises, ...pipedPromises];

        // Create a race between fast sources (2s timeout) and yt-dlp
        const fastResult = await Promise.race([
            Promise.any(allPromises).catch(() => null),
            new Promise(resolve => setTimeout(() => resolve(null), 2000)) // 2s timeout for fast sources
        ]);

        if (fastResult && fastResult.url) {
            controller.abort(); // Cancel other requests
            const elapsed = Date.now() - startTime;
            console.log(`[FastExtract] ⚡ Got URL in ${elapsed}ms from ${fastResult.source}`);

            extractCache.set(cacheKey, { data: fastResult, timestamp: Date.now() });

            // Save to quality cache for list displays
            audioQualityCache.set(videoId, {
                bitrate: fastResult.bitrate,
                hz: fastResult.hz,
                format: fastResult.format,
                timestamp: Date.now()
            });

            return fastResult;
        }

        // Fallback to yt-dlp
        console.log(`[FastExtract] Fast sources failed, waiting for yt-dlp...`);
        const ytdlpResult = await ytdlpPromise;

        if (ytdlpResult && ytdlpResult.url) {
            const elapsed = Date.now() - startTime;
            console.log(`[FastExtract] ✅ Got URL in ${elapsed}ms from yt-dlp`);
            extractCache.set(cacheKey, { data: ytdlpResult, timestamp: Date.now() });

            // Save to quality cache for list displays
            audioQualityCache.set(videoId, {
                bitrate: ytdlpResult.bitrate,
                hz: ytdlpResult.hz,
                format: ytdlpResult.format,
                timestamp: Date.now()
            });

            return ytdlpResult;
        }

        console.error(`[FastExtract] ❌ All sources failed for ${videoId}`);
        return null;

    } catch (e) {
        console.error(`[FastExtract] ❌ Error: ${e.message}`);

        // Last resort: try yt-dlp
        const ytdlpResult = await ytdlpPromise;
        if (ytdlpResult) {
            extractCache.set(cacheKey, { data: ytdlpResult, timestamp: Date.now() });
            return ytdlpResult;
        }

        return null;
    }
}

// Legacy function name for compatibility
async function extractAudioWithYtDlp(videoId, quality = 'lossless') {
    return extractAudioFast(videoId, quality);
}

// Alias for backward compatibility
async function extractAudioUrl(videoId, quality = 'lossless') {
    return extractAudioFast(videoId, quality);
}

// Helper to attach cached quality info to song objects
function attachQualityToSongs(songs) {
    if (!songs || !Array.isArray(songs)) return songs;
    return songs.map(song => {
        const quality = audioQualityCache.get(song.id);
        if (quality && (Date.now() - quality.timestamp < QUALITY_CACHE_DURATION)) {
            return {
                ...song,
                quality: {
                    bitrate: quality.bitrate,
                    hz: quality.hz,
                    format: quality.format
                }
            };
        }
        return song;
    });
}

// Background prefetch for queue items
const prefetchQueue = new Set();
const prefetchInProgress = new Map();

async function prefetchAudioUrls(videoIds) {
    const results = [];

    for (const videoId of videoIds) {
        if (prefetchQueue.has(videoId) || prefetchInProgress.has(videoId)) {
            continue; // Already prefetching or prefetched
        }

        // Check if already cached
        const cached = extractCache.get(`${videoId}:high`);
        if (cached && Date.now() - cached.timestamp < EXTRACT_CACHE_DURATION) {
            results.push({ videoId, status: 'cached' });
            continue;
        }

        // Start prefetch in background
        prefetchInProgress.set(videoId, true);

        extractAudioFast(videoId, 'high')
            .then(result => {
                prefetchQueue.add(videoId);
                prefetchInProgress.delete(videoId);
                if (result) {
                    console.log(`[Prefetch] ✅ Prefetched ${videoId}`);
                }
            })
            .catch(() => {
                prefetchInProgress.delete(videoId);
            });

        results.push({ videoId, status: 'prefetching' });
    }

    return results;
}

// ============================================
// AUTOPLAY / QUEUE GENERATION
// ============================================

async function generateAutoplayQueue(seedVideoId, count = 20) {
    console.log(`[Autoplay] Generating queue for seed: ${seedVideoId}`);

    const queue = [];
    const addedIds = new Set([seedVideoId]);

    // First, try ytmusicapi's watch playlist directly (best results)
    try {
        const watchData = await runMusicApi('get_watch_playlist', seedVideoId, count + 5);

        if (watchData && !watchData.error && watchData.tracks && watchData.tracks.length > 0) {
            console.log(`[Autoplay] Got ${watchData.tracks.length} tracks from ytmusicapi watch playlist`);

            for (const item of watchData.tracks) {
                if (queue.length >= count) break;
                if (addedIds.has(item.videoId)) continue;

                let thumbnail = '';
                if (item.thumbnail && item.thumbnail.length > 0) {
                    thumbnail = item.thumbnail[item.thumbnail.length - 1].url;
                } else if (item.thumbnails && item.thumbnails.length > 0) {
                    thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                }

                addedIds.add(item.videoId);
                queue.push({
                    id: item.videoId,
                    title: item.title || '',
                    artist: item.artists ? item.artists.map(a => a.name).join(', ') : (item.byline || ''),
                    channelId: item.artists && item.artists[0] ? item.artists[0].id : '',
                    thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                    duration: item.duration || '3:30',
                    durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                    source: 'ytmusic_autoplay'
                });
            }

            if (queue.length >= count) {
                console.log(`[Autoplay] Generated ${queue.length} tracks from ytmusicapi`);
                return queue;
            }
        }
    } catch (e) {
        console.warn('[Autoplay] ytmusicapi watch playlist failed:', e.message);
    }

    // Fallback: Get seed video details for artist-based recommendations
    const [seedVideo] = await getVideoDetails(seedVideoId);
    if (!seedVideo) {
        console.log('[Autoplay] No seed video, falling back to trending');
        return await getTrendingMusic(count);
    }

    // Get related videos (uses our improved getRelatedVideos)
    const related = await getRelatedVideos(seedVideoId, 25);

    // Get videos from same artist
    let artistVideos = [];
    if (seedVideo.channelId) {
        try {
            artistVideos = await getChannelVideos(seedVideo.channelId, 15);
        } catch (e) {
            console.log('[Autoplay] Could not fetch artist videos');
        }
    }

    // Score and add candidates
    const candidates = [];

    for (const video of related) {
        if (!addedIds.has(video.id)) {
            let score = 100;
            // Boost score if same artist
            if (video.channelId === seedVideo.channelId) score += 50;
            // Boost if from ytmusic
            if (video.source === 'ytmusic_related') score += 30;
            candidates.push({ ...video, score, source: video.source || 'related' });
        }
    }

    for (const video of artistVideos) {
        if (!addedIds.has(video.id)) {
            candidates.push({ ...video, score: 130, source: 'same_artist' });
        }
    }

    // Sort by score with some randomization for variety
    candidates.sort((a, b) => {
        const scoreA = a.score + Math.random() * 15;
        const scoreB = b.score + Math.random() * 15;
        return scoreB - scoreA;
    });

    for (const candidate of candidates) {
        if (queue.length >= count) break;
        if (!addedIds.has(candidate.id)) {
            addedIds.add(candidate.id);
            queue.push({
                id: candidate.id,
                title: candidate.title,
                artist: candidate.artist,
                thumbnail: fixThumbnailUrl(candidate.thumbnail, candidate.id),
                duration: candidate.duration || '3:30',
                durationSeconds: candidate.durationSeconds || 210,
                channelId: candidate.channelId,
                source: candidate.source
            });
        }
    }

    // Fill remaining slots with trending
    if (queue.length < count) {
        console.log(`[Autoplay] Adding trending to fill ${count - queue.length} slots`);
        const trending = await getTrendingMusic(count - queue.length + 5);
        for (const video of trending) {
            if (queue.length >= count) break;
            if (!addedIds.has(video.id)) {
                addedIds.add(video.id);
                queue.push({ ...video, source: 'trending_fill' });
            }
        }
    }

    console.log(`[Autoplay] Generated ${queue.length} tracks`);
    return queue;
}

// ============================================
// HOME FEED GENERATION
// ============================================

async function generateHomeFeed() {
    const sections = [];

    // Recently Played
    if (db.history.length > 0) {
        sections.push({
            id: 'recently-played',
            title: 'Recently Played',
            type: 'horizontal',
            items: db.history.slice(0, 10)
        });
    }

    // Trending Now
    try {
        const trending = await getTrendingMusic(15);
        sections.push({
            id: 'trending',
            title: 'Trending Now',
            type: 'list',
            items: trending
        });
    } catch (e) {
        console.log('[Home] Trending failed:', e.message);
    }

    // New Releases
    try {
        const newReleases = await searchVideos('bollywood official music video 2024', 10);
        if (newReleases.length > 0) {
            sections.push({
                id: 'new-releases',
                title: 'New Releases',
                type: 'horizontal',
                items: newReleases
            });
        }
    } catch (e) { }

    // Favorites
    if (db.favorites.length > 0) {
        sections.push({
            id: 'favorites',
            title: 'Your Favorites',
            type: 'horizontal',
            items: db.favorites.slice(0, 10)
        });
    }

    return sections;
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        region: DEFAULT_REGION,
        caches: {
            metadata: metadataCache.size,
            search: searchCache.size,
            artist: artistCache.size,
            extract: extractCache.size
        },
        database: {
            historyCount: db.history.length,
            favoritesCount: db.favorites.length,
            playlistsCount: db.playlists.length
        }
    });
});

// ============ AUDIO EXTRACTION & STREAMING (yt-dlp) ============

// Extract audio info - Returns proxy URL to avoid CORS issues
app.get("/extract/:id", async (req, res) => {
    const videoId = req.params.id;
    const quality = req.query.quality || 'lossless';

    console.log(`[Extract API] Request for ${videoId} (quality: ${quality})`);

    try {
        const result = await extractAudioWithYtDlp(videoId, quality);

        if (!result || !result.url) {
            console.error(`[Extract API] ❌ Failed to extract audio for ${videoId}`);
            return res.status(500).json({ error: "Extract failed - no audio URL" });
        }

        console.log(`[Extract API] ✅ Success: ${result.bitrate}kbps ${result.format}`);

        // Return a proxy URL instead of direct YouTube URL to bypass CORS
        const protocol = req.protocol;
        const host = req.get('host');
        const proxyUrl = `${protocol}://${host}/stream/${videoId}?quality=${quality}`;

        return res.json({
            url: proxyUrl,  // Use proxy URL instead of direct YouTube URL
            directUrl: result.url,  // Keep direct URL for debugging
            mimeType: result.mimeType,
            bitrate: result.bitrate * 1000,
            format: result.format,
            source: 'yt-dlp-proxy'
        });

    } catch (err) {
        console.error(`[Extract API] ❌ Error for ${videoId}:`, err.message);
        res.status(500).json({ error: "Extract failed" });
    }
});

// Prefetch audio URLs for upcoming queue items (background, non-blocking)
app.post("/prefetch", async (req, res) => {
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds)) {
        return res.status(400).json({ error: "videoIds array required" });
    }

    // Limit to 5 videos at a time to prevent overload
    const limitedIds = videoIds.slice(0, 5);

    console.log(`[Prefetch API] Prefetching ${limitedIds.length} videos: ${limitedIds.join(', ')}`);

    // Start prefetching in background (don't await)
    const results = await prefetchAudioUrls(limitedIds);

    res.json({
        success: true,
        message: `Prefetching ${limitedIds.length} videos`,
        results
    });
});

// Batch extract multiple audio URLs at once
app.post("/extract/batch", async (req, res) => {
    const { videoIds, quality = 'lossless' } = req.body;

    if (!videoIds || !Array.isArray(videoIds)) {
        return res.status(400).json({ error: "videoIds array required" });
    }

    // Limit to 3 videos at a time for batch
    const limitedIds = videoIds.slice(0, 3);

    console.log(`[Batch Extract] Extracting ${limitedIds.length} videos`);
    const startTime = Date.now();

    const results = await Promise.all(
        limitedIds.map(async (videoId) => {
            try {
                const result = await extractAudioFast(videoId, quality);
                if (result && result.url) {
                    const protocol = req.protocol;
                    const host = req.get('host');
                    return {
                        videoId,
                        success: true,
                        url: `${protocol}://${host}/stream/${videoId}?quality=${quality}`,
                        directUrl: result.url,
                        mimeType: result.mimeType,
                        bitrate: result.bitrate * 1000,
                        format: result.format,
                        source: result.source
                    };
                }
                return { videoId, success: false, error: 'Extraction failed' };
            } catch (e) {
                return { videoId, success: false, error: e.message };
            }
        })
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Batch Extract] Completed ${limitedIds.length} extractions in ${elapsed}ms`);

    res.json({
        results,
        elapsed,
        cached: results.filter(r => r.success).length
    });
});

// Get cache status for video IDs
app.post("/extract/status", async (req, res) => {
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds)) {
        return res.status(400).json({ error: "videoIds array required" });
    }

    const status = videoIds.map(videoId => {
        const cached = extractCache.get(`${videoId}:high`);
        const isPrefetching = prefetchInProgress.has(videoId);
        const isPrefetched = prefetchQueue.has(videoId);

        return {
            videoId,
            cached: cached && Date.now() - cached.timestamp < EXTRACT_CACHE_DURATION,
            prefetching: isPrefetching,
            prefetched: isPrefetched,
            cacheAge: cached ? Math.round((Date.now() - cached.timestamp) / 1000) : null
        };
    });

    res.json({ status });
});

// Background prefetch endpoint
app.post("/prefetch", async (req, res) => {
    const { videoIds } = req.body;
    if (!videoIds || !Array.isArray(videoIds)) {
        return res.status(400).json({ error: "videoIds array required" });
    }

    // Trigger prefetch in background (don't await)
    prefetchAudioUrls(videoIds.slice(0, 5));

    res.json({ success: true, count: Math.min(videoIds.length, 5) });
});

// Stream audio through proxy - Bypasses CORS by fetching from YouTube and piping to client
app.get("/stream/:id", async (req, res) => {
    const videoId = req.params.id;
    const quality = req.query.quality || 'lossless';

    console.log(`[Stream] Streaming ${videoId} (quality: ${quality})`);

    try {
        const result = await extractAudioWithYtDlp(videoId, quality);

        if (!result || !result.url) {
            console.error(`[Stream] ❌ Failed to get audio URL for ${videoId}`);
            return res.status(500).send("Failed to get audio");
        }

        // Fetch the audio from YouTube
        const audioResponse = await fetch(result.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Range': req.headers.range || 'bytes=0-'
            }
        });

        if (!audioResponse.ok && audioResponse.status !== 206) {
            console.error(`[Stream] ❌ YouTube returned ${audioResponse.status}`);
            return res.status(audioResponse.status).send("Failed to fetch audio");
        }

        // Set response headers
        res.setHeader('Content-Type', result.mimeType || 'audio/webm');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Forward range headers if present
        if (audioResponse.headers.get('content-length')) {
            res.setHeader('Content-Length', audioResponse.headers.get('content-length'));
        }
        if (audioResponse.headers.get('content-range')) {
            res.setHeader('Content-Range', audioResponse.headers.get('content-range'));
            res.status(206);
        }

        console.log(`[Stream] ✅ Piping audio for ${videoId}`);

        // Pipe the audio stream to the response
        const reader = audioResponse.body.getReader();
        const pump = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            res.end();
        };

        pump().catch(err => {
            console.error(`[Stream] Pipe error:`, err.message);
            if (!res.headersSent) {
                res.status(500).send("Stream error");
            }
        });

    } catch (err) {
        console.error(`[Stream] ❌ Error for ${videoId}:`, err.message);
        if (!res.headersSent) {
            res.status(500).send("Stream failed");
        }
    }
});

// ============ SEARCH ============

app.get('/search', async (req, res) => {
    const { q, maxResults = 20 } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Query required' });
    }

    try {
        db.recentSearches = [q, ...db.recentSearches.filter(s => s !== q)].slice(0, 20);
        const results = await searchVideos(q, parseInt(maxResults));
        const enrichedResults = attachQualityToSongs(results);
        res.json({ results: enrichedResults, source: 'youtube-api' });
    } catch (error) {
        console.error('[Search] Error:', error.message);
        res.json({ results: [], error: error.message });
    }
});

// Search suggestions
app.get('/search/suggestions', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.json({ suggestions: db.recentSearches.slice(0, 10) });
    }

    try {
        const response = await fetch(
            `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`
        );
        const text = await response.text();
        const match = text.match(/\[.*\]/);
        if (match) {
            const data = JSON.parse(match[0]);
            const suggestions = data[1]?.map(s => s[0]) || [];
            return res.json({ suggestions: suggestions.slice(0, 10) });
        }
    } catch (e) { }

    res.json({ suggestions: [] });
});

// ============ TRENDING ============

// Get trending music (source: ytmusic | youtube | auto)
app.get('/trending', async (req, res) => {
    const { maxResults = 25, source = 'auto' } = req.query;

    try {
        let results = [];
        let actualSource = 'ytmusicapi';

        if (source === 'youtube') {
            // Force use YouTube Data API only
            console.log('[Trending] Using YouTube Data API...');
            const data = await youtubeApiRequest('videos', {
                part: 'snippet,contentDetails,statistics',
                chart: 'mostPopular',
                videoCategoryId: '10', // Music
                regionCode: DEFAULT_REGION,
                maxResults: parseInt(maxResults)
            });

            results = (data.items || []).map((item, index) => {
                const durationISO = item.contentDetails?.duration || 'PT0S';
                const durationSeconds = parseDuration(durationISO);

                return {
                    id: item.id,
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnail: fixThumbnailUrl(item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url, item.id),
                    duration: formatDuration(durationSeconds),
                    durationSeconds,
                    rank: index + 1,
                    viewCount: item.statistics?.viewCount || '0',
                    moods: extractMoodTags(item.snippet.title)
                };
            });
            actualSource = 'youtube';
        } else {
            // Use ytmusicapi (default or 'auto' or 'ytmusic')
            results = await getTrendingMusic(parseInt(maxResults));
            actualSource = 'ytmusicapi';
        }

        const enrichedResults = attachQualityToSongs(results);
        res.json({
            results: enrichedResults,
            source: actualSource,
            lastUpdated: trendingCache.timestamp ? new Date(trendingCache.timestamp).toISOString() : new Date().toISOString()
        });
    } catch (error) {
        console.error('[Trending] Error:', error.message);
        res.json({ results: [], error: error.message });
    }
});

// Get YouTube trending specifically (not YouTube Music)
app.get('/trending/youtube', async (req, res) => {
    const { maxResults = 25 } = req.query;

    try {
        console.log('[Trending YouTube] Fetching from YouTube Data API...');
        const data = await youtubeApiRequest('videos', {
            part: 'snippet,contentDetails,statistics',
            chart: 'mostPopular',
            videoCategoryId: '10', // Music category
            regionCode: DEFAULT_REGION,
            maxResults: parseInt(maxResults)
        });

        const results = (data.items || []).map((item, index) => {
            const durationISO = item.contentDetails?.duration || 'PT0S';
            const durationSeconds = parseDuration(durationISO);

            return {
                id: item.id,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                thumbnail: fixThumbnailUrl(item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url, item.id),
                duration: formatDuration(durationSeconds),
                durationSeconds,
                rank: index + 1,
                viewCount: item.statistics?.viewCount || '0',
                likeCount: item.statistics?.likeCount || '0',
                moods: extractMoodTags(item.snippet.title)
            };
        });

        console.log(`[Trending YouTube] Found ${results.length} videos`);
        const enrichedResults = attachQualityToSongs(results);
        res.json({
            results: enrichedResults,
            source: 'youtube',
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Trending YouTube] Error:', error.message);
        res.json({ results: [], source: 'youtube', error: error.message });
    }
});

// Force refresh trending cache
app.post('/trending/refresh', async (req, res) => {
    console.log('[Trending] Force refresh requested');

    try {
        // Clear cache and fetch fresh data
        trendingCache.data = null;
        trendingCache.timestamp = 0;

        const results = await getTrendingMusic(25, true); // forceRefresh = true
        res.json({
            success: true,
            message: 'Trending cache refreshed with fresh data',
            count: results.length,
            sources: [...new Set(results.map(r => r.source).filter(Boolean))]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ HOME FEED ============

app.get('/home', async (req, res) => {
    try {
        const sections = await generateHomeFeed();
        res.json({ sections });
    } catch (error) {
        res.json({ sections: [], error: error.message });
    }
});

// Get YouTube Music home page sections using ytmusicapi
app.get('/home/sections', async (req, res) => {
    try {
        console.log('[Home] Fetching YouTube Music home sections...');
        const homeData = await runMusicApi('get_home');

        if (homeData && Array.isArray(homeData) && homeData.length > 0) {
            // Format the sections
            const sections = homeData.map(section => {
                const items = (section.contents || []).map(item => {
                    let thumbnail = '';
                    if (item.thumbnails && item.thumbnails.length > 0) {
                        thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                    }

                    let artist = '';
                    if (item.artists && Array.isArray(item.artists)) {
                        artist = item.artists.map(a => a.name).join(', ');
                    } else if (item.author) {
                        artist = item.author;
                    }

                    return {
                        id: item.videoId || item.browseId || item.playlistId,
                        title: item.title || '',
                        artist: artist,
                        thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                        duration: item.duration || '3:30',
                        durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                        type: item.resultType || 'song'
                    };
                }).filter(item => item.id);

                return {
                    id: section.title?.toLowerCase().replace(/\s+/g, '-') || 'section',
                    title: section.title || 'Music',
                    type: 'horizontal',
                    items: items
                };
            }).filter(section => section.items.length > 0);

            console.log(`[Home] Found ${sections.length} sections from ytmusicapi`);
            res.json({ sections, source: 'ytmusicapi' });
        } else {
            // Fallback to generated home feed
            const sections = await generateHomeFeed();
            res.json({ sections, source: 'fallback' });
        }
    } catch (error) {
        console.error('[Home] Error:', error.message);
        const sections = await generateHomeFeed();
        res.json({ sections, source: 'fallback', error: error.message });
    }
});

// Get personalized "For You" recommendations based on user habits
app.get('/recommendations/for-you', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;

    try {
        console.log('[ForYou] Generating personalized recommendations based on habits...');

        const habits = initUserHabits();
        const totalPlays = habits.listeningStats.totalPlays || 0;

        // Get top artists (sorted by play count)
        const topArtists = Object.entries(habits.artistPlayCounts || {})
            .map(([id, data]) => ({ id, name: data.name, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Get top moods
        const topMoods = Object.entries(habits.moodPlayCounts || {})
            .map(([mood, count]) => ({ mood, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Get recently played for "more like this"
        const recentlyPlayed = (habits.recentlyPlayed || []).slice(0, 10);

        let results = [];
        let recommendationReasons = [];

        console.log(`[ForYou] User stats: ${totalPlays} plays, ${topArtists.length} artists, ${topMoods.length} moods`);

        // === PERSONALIZED RECOMMENDATIONS (if user has history) ===
        if (totalPlays >= 3) {

            // Strategy 1: Get songs from user's top artists
            if (topArtists.length > 0) {
                const artistsToSearch = topArtists.slice(0, 3);

                for (const artist of artistsToSearch) {
                    if (results.length >= limit) break;

                    try {
                        const artistSongs = await searchVideos(`${artist.name} songs`, 8, 'songs');
                        const newSongs = artistSongs
                            .filter(s => !results.find(r => r.id === s.id))
                            .slice(0, 3)
                            .map(s => ({ ...s, reason: `Because you like ${artist.name}` }));

                        results.push(...newSongs);
                        if (newSongs.length > 0) {
                            recommendationReasons.push(`${artist.name}`);
                        }
                    } catch (e) {
                        console.warn(`[ForYou] Search for ${artist.name} failed`);
                    }
                }
                console.log(`[ForYou] Got ${results.length} songs from top artists`);
            }

            // Strategy 2: Get songs based on mood preferences
            if (topMoods.length > 0 && results.length < limit) {
                const moodSearchTerms = {
                    romantic: 'romantic hindi songs',
                    sad: 'sad hindi songs emotional',
                    happy: 'happy bollywood party songs',
                    energetic: 'workout hindi songs pump',
                    chill: 'lofi chill hindi songs',
                    devotional: 'devotional bhajan songs',
                    retro: 'old classic hindi songs 90s',
                    punjabi: 'punjabi party songs',
                    hiphop: 'desi hip hop rap songs'
                };

                for (const moodData of topMoods.slice(0, 2)) {
                    if (results.length >= limit) break;

                    const searchTerm = moodSearchTerms[moodData.mood] || `${moodData.mood} hindi songs`;
                    try {
                        const moodSongs = await searchVideos(searchTerm, 6, 'songs');
                        const newSongs = moodSongs
                            .filter(s => !results.find(r => r.id === s.id))
                            .slice(0, 3)
                            .map(s => ({ ...s, reason: `For your ${moodData.mood} mood` }));

                        results.push(...newSongs);
                    } catch (e) {
                        console.warn(`[ForYou] Mood search failed: ${moodData.mood}`);
                    }
                }
                console.log(`[ForYou] Added mood-based songs, total: ${results.length}`);
            }

            // Strategy 3: Get related songs from recently played
            if (recentlyPlayed.length > 0 && results.length < limit) {
                const seedSong = recentlyPlayed[0];
                try {
                    const relatedSongs = await getRelatedVideos(seedSong.id, 8);
                    const newSongs = relatedSongs
                        .filter(s => !results.find(r => r.id === s.id))
                        .slice(0, 4)
                        .map(s => ({ ...s, reason: `Similar to "${seedSong.title.slice(0, 30)}..."` }));

                    results.push(...newSongs);
                    console.log(`[ForYou] Added related songs from recent play`);
                } catch (e) {
                    console.warn('[ForYou] Related songs failed');
                }
            }

            // Strategy 4: Mix in some songs from different artists user has listened to
            if (topArtists.length > 3 && results.length < limit) {
                const otherArtists = topArtists.slice(3, 5);
                for (const artist of otherArtists) {
                    if (results.length >= limit) break;

                    try {
                        const artistSongs = await searchVideos(`${artist.name} new songs`, 5, 'songs');
                        const newSongs = artistSongs
                            .filter(s => !results.find(r => r.id === s.id))
                            .slice(0, 2)
                            .map(s => ({ ...s, reason: `More from ${artist.name}` }));

                        results.push(...newSongs);
                    } catch (e) { }
                }
            }
        }

        // === DISCOVERY MODE (new users or not enough personalized results) ===
        if (results.length < limit / 2) {
            console.log('[ForYou] Adding discovery songs for variety...');

            // Get songs from YouTube Music home for fresh picks
            try {
                const homeData = await runMusicApi('get_home');

                if (homeData && Array.isArray(homeData)) {
                    for (const section of homeData.slice(0, 4)) {
                        if (results.length >= limit) break;

                        const sectionItems = (section.contents || [])
                            .filter(item => item.videoId && !results.find(r => r.id === item.videoId))
                            .slice(0, 4)
                            .map(item => {
                                let thumbnail = '';
                                if (item.thumbnails && item.thumbnails.length > 0) {
                                    thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                                }

                                let artist = '';
                                if (item.artists && Array.isArray(item.artists)) {
                                    artist = item.artists.map(a => a.name).join(', ');
                                }

                                return {
                                    id: item.videoId,
                                    title: item.title,
                                    artist: artist,
                                    channelId: item.artists?.[0]?.id || '',
                                    thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                                    duration: item.duration || '3:30',
                                    durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                                    reason: section.title ? `From "${section.title}"` : 'Discover something new'
                                };
                            });

                        results.push(...sectionItems);
                    }
                    console.log(`[ForYou] Added discovery songs, total: ${results.length}`);
                }
            } catch (e) {
                console.warn('[ForYou] Home feed failed:', e.message);
            }
        }

        // === FINAL FALLBACK: Trending ===
        if (results.length < limit / 3) {
            try {
                const trending = await getTrendingMusic(limit);
                const trendingSongs = trending
                    .filter(t => !results.find(r => r.id === t.id))
                    .slice(0, limit - results.length)
                    .map(s => ({ ...s, reason: 'Trending now' }));

                results.push(...trendingSongs);
                console.log(`[ForYou] Added trending fallback, total: ${results.length}`);
            } catch (e) {
                console.warn('[ForYou] Trending fallback failed');
            }
        }

        // Shuffle to mix personalized with discovery
        results = results.sort(() => Math.random() - 0.5).slice(0, limit);

        // Build personalized message
        let message = '';
        if (totalPlays >= 10 && topArtists.length > 0) {
            message = `Based on ${topArtists.slice(0, 2).map(a => a.name).join(' & ')}`;
            if (topMoods.length > 0) {
                message += ` and your ${topMoods[0].mood} vibes`;
            }
        } else if (totalPlays >= 3) {
            message = 'Getting to know your taste...';
        } else {
            message = 'Listen to more songs to personalize';
        }

        console.log(`[ForYou] Final: ${results.length} songs, personalized: ${totalPlays >= 3}`);

        res.json({
            results: attachQualityToSongs(results),
            basedOn: {
                topArtists: topArtists.slice(0, 3).map(a => a.name),
                topMoods: topMoods.slice(0, 2).map(m => m.mood),
                totalPlays,
                message
            },
            source: totalPlays >= 3 ? 'personalized' : 'discovery'
        });
    } catch (error) {
        console.error('[ForYou] Error:', error.message);
        // Ultimate fallback
        try {
            const trending = await getTrendingMusic(limit);
            res.json({
                results: attachQualityToSongs(trending),
                basedOn: { topArtists: [], topMoods: [], totalPlays: 0, message: 'Based on trending' },
                source: 'trending_fallback'
            });
        } catch (e) {
            res.json({ results: [], error: error.message });
        }
    }
});

// Get music charts (Top Songs, Top Videos, Top Artists)
app.get('/charts', async (req, res) => {
    const country = req.query.country || 'IN';

    try {
        console.log(`[Charts] Fetching charts for country: ${country}`);
        const chartsData = await runMusicApi('get_charts', country);

        if (chartsData && !chartsData.error) {
            // Format charts data
            const charts = {};

            // Top Songs/Videos
            if (chartsData.videos && chartsData.videos.items) {
                charts.topSongs = chartsData.videos.items.slice(0, 20).map((item, index) => {
                    let thumbnail = '';
                    if (item.thumbnails && item.thumbnails.length > 0) {
                        thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                    }

                    return {
                        id: item.videoId,
                        title: item.title,
                        artist: item.artists ? item.artists.map(a => a.name).join(', ') : '',
                        channelId: item.artists?.[0]?.id || '',
                        thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                        duration: item.duration || '3:30',
                        durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                        rank: index + 1,
                        views: item.views || ''
                    };
                });
            }

            // Trending
            if (chartsData.trending && chartsData.trending.items) {
                charts.trending = chartsData.trending.items.slice(0, 20).map((item, index) => {
                    let thumbnail = '';
                    if (item.thumbnails && item.thumbnails.length > 0) {
                        thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                    }

                    return {
                        id: item.videoId,
                        title: item.title,
                        artist: item.artists ? item.artists.map(a => a.name).join(', ') : '',
                        channelId: item.artists?.[0]?.id || '',
                        thumbnail: fixThumbnailUrl(thumbnail, item.videoId),
                        duration: item.duration || '3:30',
                        durationSeconds: item.duration_seconds || parseDuration(item.duration || '3:30'),
                        rank: index + 1
                    };
                });
            }

            // Top Artists
            if (chartsData.artists && chartsData.artists.items) {
                charts.topArtists = chartsData.artists.items.slice(0, 10).map((item, index) => {
                    let thumbnail = '';
                    if (item.thumbnails && item.thumbnails.length > 0) {
                        thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
                    }

                    return {
                        id: item.browseId,
                        name: item.title,
                        thumbnail: thumbnail,
                        subscribers: item.subscribers || '',
                        rank: index + 1
                    };
                });
            }

            console.log(`[Charts] Found ${Object.keys(charts).length} chart types`);
            res.json({ charts, country, source: 'ytmusicapi' });
        } else {
            // Fallback to trending
            const trending = await getTrendingMusic(20);
            res.json({
                charts: { topSongs: trending, trending: trending },
                country,
                source: 'fallback'
            });
        }
    } catch (error) {
        console.error('[Charts] Error:', error.message);
        const trending = await getTrendingMusic(20);
        res.json({
            charts: { topSongs: trending },
            country,
            source: 'fallback',
            error: error.message
        });
    }
});


// ============ AUTOPLAY / RADIO ============

app.get('/autoplay/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const { count = 20 } = req.query;

    try {
        const queue = await generateAutoplayQueue(videoId, parseInt(count));
        const enrichedQueue = attachQualityToSongs(queue);
        res.json({ queue: enrichedQueue, seedVideoId: videoId });
    } catch (error) {
        res.json({ queue: [], error: error.message });
    }
});

app.get('/related/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const { maxResults = 15 } = req.query;

    try {
        const results = await getRelatedVideos(videoId, parseInt(maxResults));
        const enrichedResults = attachQualityToSongs(results);
        res.json({ results: enrichedResults });
    } catch (error) {
        res.json({ results: [], error: error.message });
    }
});

// ============ VIDEO DETAILS ============

app.get('/video/:videoId', async (req, res) => {
    const { videoId } = req.params;

    try {
        const [video] = await getVideoDetails(videoId);
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }
        res.json(video);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ARTIST ============

app.get('/artist/:channelId', async (req, res) => {
    const { channelId } = req.params;

    console.log(`[Artist] Looking up artist: ${channelId}`);

    try {
        let artist = null;
        let topTracks = [];

        // First, try ytmusicapi (works for YouTube Music artist IDs like "UCxxxx")
        try {
            console.log(`[Artist] Trying ytmusicapi for ${channelId}...`);
            const ytmusicData = await runMusicApi('get_artist', channelId);

            if (ytmusicData && !ytmusicData.error && ytmusicData.name) {
                // Format ytmusicapi response
                let thumbnail = '';
                if (ytmusicData.thumbnails && ytmusicData.thumbnails.length > 0) {
                    thumbnail = ytmusicData.thumbnails[ytmusicData.thumbnails.length - 1].url;
                }

                artist = {
                    id: channelId,
                    name: ytmusicData.name || 'Unknown Artist',
                    description: ytmusicData.description || '',
                    thumbnail: fixThumbnailUrl(thumbnail),
                    subscriberCount: ytmusicData.subscribers || '0',
                    videoCount: '0',
                    verified: true
                };

                // Get top songs from ytmusicapi data
                if (ytmusicData.songs && ytmusicData.songs.results) {
                    topTracks = ytmusicData.songs.results.slice(0, 20).map(song => {
                        let songThumb = '';
                        if (song.thumbnails && song.thumbnails.length > 0) {
                            songThumb = song.thumbnails[song.thumbnails.length - 1].url;
                        }
                        return {
                            id: song.videoId,
                            title: song.title || '',
                            artist: artist.name,
                            channelTitle: artist.name,
                            channelId: channelId,
                            thumbnail: fixThumbnailUrl(songThumb, song.videoId),
                            duration: song.duration || '3:30',
                            durationSeconds: song.duration_seconds || parseDuration(song.duration || '3:30')
                        };
                    });
                }

                console.log(`[Artist] Found ${artist.name} via ytmusicapi with ${topTracks.length} tracks`);
                return res.json({ artist, topTracks });
            }
        } catch (ytmError) {
            console.warn('[Artist] ytmusicapi failed:', ytmError.message);
        }

        // Second, try YouTube Data API for channel details
        try {
            console.log(`[Artist] Trying YouTube Data API for ${channelId}...`);
            artist = await getChannelDetails(channelId);

            if (artist) {
                topTracks = await getChannelVideos(channelId, 20);
                console.log(`[Artist] Found ${artist.name} via YouTube API with ${topTracks.length} tracks`);
                return res.json({ artist, topTracks });
            }
        } catch (ytError) {
            console.warn('[Artist] YouTube API failed:', ytError.message);
        }

        // Third fallback: Search for the artist by name
        console.log(`[Artist] Trying search fallback for ${channelId}...`);

        // If channelId looks like a name (not starting with UC), use it as search term
        const searchTerm = channelId.startsWith('UC') ? channelId : `${channelId} artist songs`;
        const searchResults = await searchVideos(searchTerm, 20);

        if (searchResults.length > 0) {
            const firstResult = searchResults[0];

            // Try to extract artist name from first result
            const artistName = firstResult.artist || channelId;

            artist = {
                id: channelId,
                name: artistName,
                description: '',
                thumbnail: firstResult.thumbnail || '',
                subscriberCount: '0',
                videoCount: searchResults.length.toString(),
                verified: false
            };

            // Format search results as tracks
            topTracks = searchResults.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist || artistName,
                channelTitle: track.artist || artistName,
                channelId: track.channelId || channelId,
                thumbnail: track.thumbnail,
                duration: track.duration || '3:30',
                durationSeconds: track.durationSeconds || 210
            }));

            console.log(`[Artist] Found via search fallback with ${topTracks.length} tracks`);
            return res.json({ artist, topTracks });
        }

        return res.status(404).json({ error: 'Artist not found' });
    } catch (error) {
        console.error('[Artist] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/artists/search', async (req, res) => {
    const { q, maxResults = 10 } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Query required' });
    }

    try {
        // Try ytmusicapi first for artists
        const artistResults = await runMusicApi('search', q, 'artists', parseInt(maxResults));

        if (artistResults && Array.isArray(artistResults) && artistResults.length > 0) {
            const artists = artistResults.slice(0, parseInt(maxResults)).map(item => {
                let thumbnail = '';
                if (item.thumbnails && Array.isArray(item.thumbnails)) {
                    thumbnail = item.thumbnails[item.thumbnails.length - 1]?.url || '';
                }

                return {
                    id: item.browseId || item.id,
                    name: item.artist || item.title,
                    thumbnail: fixThumbnailUrl(thumbnail),
                    subscribers: item.subscribers || '',
                    type: 'artist'
                };
            }).filter(a => a.id && a.name);

            console.log(`[Artist Search] Found ${artists.length} artists via ytmusicapi`);
            return res.json({ results: artists });
        }

        // Fallback: Search for channels
        const searchData = await youtubeApiRequest('search', {
            part: 'snippet',
            type: 'channel',
            q: q + ' artist',
            maxResults: maxResults
        });

        if (searchData.items && searchData.items.length > 0) {
            const artists = searchData.items.map(item => ({
                id: item.snippet.channelId || item.id.channelId,
                name: item.snippet.channelTitle || item.snippet.title,
                thumbnail: fixThumbnailUrl(item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url),
                subscribers: '',
                type: 'artist'
            }));

            console.log(`[Artist Search] Found ${artists.length} artists via YouTube API`);
            return res.json({ results: artists });
        }

        res.json({ results: [] });
    } catch (error) {
        console.error('[Artist Search] Error:', error.message);
        res.json({ results: [] });
    }
});

// ============ PLAYLISTS ============

app.get('/playlist/:playlistId', async (req, res) => {
    const { playlistId } = req.params;

    try {
        const details = await getPlaylistDetails(playlistId);
        if (!details) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const items = await getPlaylistItems(playlistId, 50);
        res.json({ playlist: details, items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ USER DATA ============

app.get('/history', (req, res) => {
    res.json({ history: db.history });
});

app.post('/history', (req, res) => {
    const { song } = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    db.history = [
        { ...song, playedAt: new Date().toISOString() },
        ...db.history.filter(s => s.id !== song.id)
    ].slice(0, 100);

    db.lastPlayed = song;
    res.json({ success: true, historySize: db.history.length });
});

app.delete('/history', (req, res) => {
    db.history = [];
    res.json({ success: true });
});

app.get('/favorites', (req, res) => {
    res.json({ favorites: db.favorites });
});

app.post('/favorites/toggle', (req, res) => {
    const { song } = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    const existingIndex = db.favorites.findIndex(s => s.id === song.id);

    if (existingIndex >= 0) {
        db.favorites.splice(existingIndex, 1);
        res.json({ liked: false, favoritesCount: db.favorites.length });
    } else {
        db.favorites.unshift({ ...song, likedAt: new Date().toISOString() });
        res.json({ liked: true, favoritesCount: db.favorites.length });
    }
});

app.get('/favorites/check/:videoId', (req, res) => {
    const { videoId } = req.params;
    const isLiked = db.favorites.some(s => s.id === videoId);
    res.json({ isLiked });
});

app.get('/playlists', (req, res) => {
    res.json({ playlists: db.playlists });
});

app.post('/playlists', (req, res) => {
    const { name, description = '' } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name required' });
    }

    const playlist = {
        id: `playlist-${Date.now()}`,
        name,
        description,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    db.playlists.push(playlist);
    res.json({ playlist });
});

app.post('/playlists/:playlistId/add', (req, res) => {
    const { playlistId } = req.params;
    const { song } = req.body;

    const playlist = db.playlists.find(p => p.id === playlistId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
    }

    if (!playlist.items.some(s => s.id === song.id)) {
        playlist.items.push({ ...song, addedAt: new Date().toISOString() });
        playlist.updatedAt = new Date().toISOString();
    }

    res.json({ success: true, itemCount: playlist.items.length });
});

app.delete('/playlists/:playlistId/remove/:songId', (req, res) => {
    const { playlistId, songId } = req.params;

    const playlist = db.playlists.find(p => p.id === playlistId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.items = playlist.items.filter(s => s.id !== songId);
    playlist.updatedAt = new Date().toISOString();

    res.json({ success: true, itemCount: playlist.items.length });
});

app.delete('/playlists/:playlistId', (req, res) => {
    const { playlistId } = req.params;
    db.playlists = db.playlists.filter(p => p.id !== playlistId);
    res.json({ success: true });
});

// ============ TRACK PLAY (for recommendations) ============

// Track song play for personalized recommendations
app.post('/track/play', (req, res) => {
    try {
        const { song } = req.body;

        if (!song || !song.id) {
            return res.status(400).json({ error: 'Song data required' });
        }

        console.log(`[Track] Recording play: ${song.title} by ${song.artist}`);

        const habits = initUserHabits();

        // Update song play count
        if (!habits.songPlayCounts[song.id]) {
            habits.songPlayCounts[song.id] = { count: 0, title: song.title, artist: song.artist };
        }
        habits.songPlayCounts[song.id].count++;
        habits.songPlayCounts[song.id].lastPlayed = new Date().toISOString();

        // Update artist play count
        const artistId = song.channelId || song.artistId || song.artist;
        if (artistId) {
            if (!habits.artistPlayCounts[artistId]) {
                habits.artistPlayCounts[artistId] = { count: 0, name: song.artist || 'Unknown' };
            }
            habits.artistPlayCounts[artistId].count++;
            habits.artistPlayCounts[artistId].name = song.artist || habits.artistPlayCounts[artistId].name;
        }

        // Extract and update mood from title
        const moods = extractMoodTags(song.title);
        moods.forEach(mood => {
            if (!habits.moodPlayCounts[mood]) {
                habits.moodPlayCounts[mood] = 0;
            }
            habits.moodPlayCounts[mood]++;
        });

        // Update recently played
        if (!habits.recentlyPlayed) habits.recentlyPlayed = [];
        habits.recentlyPlayed = habits.recentlyPlayed.filter(s => s.id !== song.id);
        habits.recentlyPlayed.unshift({
            id: song.id,
            title: song.title,
            artist: song.artist,
            thumbnail: song.thumbnail,
            playedAt: new Date().toISOString()
        });
        habits.recentlyPlayed = habits.recentlyPlayed.slice(0, 50); // Keep last 50

        // Update listening stats
        if (!habits.listeningStats) {
            habits.listeningStats = { totalPlays: 0 };
        }
        habits.listeningStats.totalPlays++;
        habits.listeningStats.lastPlayedAt = new Date().toISOString();

        // Recompute top artists and moods
        habits.topArtists = Object.entries(habits.artistPlayCounts)
            .map(([id, data]) => ({ id, name: data.name, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        habits.topMoods = Object.entries(habits.moodPlayCounts)
            .map(([mood, count]) => ({ mood, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        res.json({
            success: true,
            totalPlays: habits.listeningStats.totalPlays,
            topArtists: habits.topArtists.slice(0, 3).map(a => a.name)
        });
    } catch (error) {
        console.error('[Track] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============ EXPLORE ============

app.get('/explore', async (req, res) => {
    try {
        const sections = [];

        const genres = [
            { id: 'bollywood', name: 'Bollywood', query: 'bollywood hits 2024', color: 'from-pink-500 to-rose-500' },
            { id: 'punjabi', name: 'Punjabi', query: 'punjabi songs 2024', color: 'from-orange-500 to-amber-500' },
            { id: 'indie', name: 'Indie', query: 'indian indie songs', color: 'from-red-600 to-rose-600' },
            { id: 'hiphop', name: 'Hip-Hop', query: 'indian hip hop 2024', color: 'from-cyan-500 to-blue-500' },
            { id: 'lofi', name: 'Lo-Fi', query: 'lofi hindi songs', color: 'from-purple-500 to-indigo-500' },
            { id: 'devotional', name: 'Devotional', query: 'hindi bhajan', color: 'from-amber-600 to-yellow-500' },
            { id: 'classical', name: 'Classical', query: 'indian classical music', color: 'from-emerald-500 to-teal-500' },
            { id: 'romantic', name: 'Romantic', query: 'romantic hindi songs', color: 'from-violet-500 to-purple-600' }
        ];

        sections.push({
            id: 'genres',
            title: 'Browse by Genre',
            type: 'genres',
            items: genres
        });

        const moods = [
            { id: 'workout', name: 'Workout', query: 'workout hindi songs', icon: '💪' },
            { id: 'chill', name: 'Chill', query: 'chill hindi songs relaxing', icon: '😌' },
            { id: 'party', name: 'Party', query: 'party songs hindi 2024', icon: '🎉' },
            { id: 'focus', name: 'Focus', query: 'focus music instrumental', icon: '🎯' },
            { id: 'sleep', name: 'Sleep', query: 'sleep music relaxing', icon: '😴' },
            { id: 'drive', name: 'Driving', query: 'driving songs hindi', icon: '🚗' }
        ];

        sections.push({
            id: 'moods',
            title: 'Moods & Activities',
            type: 'moods',
            items: moods
        });

        const newReleases = await searchVideos('bollywood official music video 2024', 10);
        sections.push({
            id: 'new-releases',
            title: 'New Releases',
            type: 'horizontal',
            items: newReleases
        });

        const trending = await getTrendingMusic(10);
        sections.push({
            id: 'charts',
            title: 'Top Charts - India',
            type: 'numbered',
            items: trending
        });

        res.json({ sections });
    } catch (error) {
        res.json({ sections: [], error: error.message });
    }
});

app.get('/genre/:genreId', async (req, res) => {
    const { genreId } = req.params;
    const { maxResults = 30 } = req.query;

    const genreQueries = {
        bollywood: 'bollywood songs 2024 official',
        punjabi: 'punjabi songs trending 2024',
        indie: 'indian indie music coke studio',
        hiphop: 'indian hip hop rap 2024',
        lofi: 'lofi hindi songs chill',
        devotional: 'hindi bhajan aarti',
        classical: 'indian classical hindustani',
        romantic: 'romantic hindi songs love'
    };

    const query = genreQueries[genreId] || `${genreId} songs hindi`;

    try {
        const results = await searchVideos(query, parseInt(maxResults));
        res.json({ results, genre: genreId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/mood/:moodId', async (req, res) => {
    const { moodId } = req.params;
    const { maxResults = 30 } = req.query;

    const moodQueries = {
        workout: 'workout hindi songs gym',
        chill: 'chill hindi songs relaxing lofi',
        party: 'party songs bollywood 2024',
        focus: 'focus music instrumental study',
        sleep: 'sleep music relaxing peaceful',
        drive: 'driving songs hindi long drive'
    };

    const query = moodQueries[moodId] || `${moodId} songs`;

    try {
        const results = await searchVideos(query, parseInt(maxResults));
        res.json({ results, mood: moodId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ SETTINGS ============

app.get('/settings', (req, res) => {
    const defaultSettings = {
        theme: 'dark',
        accentColor: 'violet',
        audioQuality: 'high',
        autoPlay: true,
        crossfade: 3,
        normalizeVolume: true,
        downloadQuality: 'high',
        dataSaver: false,
        region: 'IN'
    };

    const settings = { ...defaultSettings, ...db.preferences };
    res.json({ settings });
});

app.put('/settings', (req, res) => {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid settings data' });
    }

    const allowedKeys = [
        'theme', 'accentColor', 'audioQuality', 'autoPlay',
        'crossfade', 'normalizeVolume', 'downloadQuality', 'dataSaver', 'region'
    ];

    const validUpdates = {};
    for (const key of allowedKeys) {
        if (updates[key] !== undefined) {
            validUpdates[key] = updates[key];
        }
    }

    db.preferences = { ...db.preferences, ...validUpdates };
    res.json({ success: true, settings: db.preferences });
});

// ============ USER HABITS ============

app.post('/track/play', (req, res) => {
    const { song, durationListened = 0 } = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Song data with id required' });
    }

    try {
        trackSongPlay(song, durationListened);
        res.json({ success: true, message: 'Play tracked' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/recommendations/for-you', async (req, res) => {
    const { limit = 20 } = req.query;

    try {
        const habits = initUserHabits();

        if (habits.listeningStats.totalPlays === 0) {
            const trending = await getTrendingMusic(parseInt(limit));
            return res.json({ results: trending, basedOn: { message: 'No listening history yet' } });
        }

        const recommendations = await getTrendingMusic(parseInt(limit));
        res.json({
            results: recommendations,
            basedOn: {
                topArtists: habits.topArtists.slice(0, 3).map(a => a.name),
                topMoods: habits.topMoods.slice(0, 3).map(m => m.mood),
                totalPlays: habits.listeningStats.totalPlays
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/user/habits', (req, res) => {
    const habits = initUserHabits();
    res.json({
        stats: habits.listeningStats,
        topArtists: habits.topArtists,
        topMoods: habits.topMoods,
        recentlyPlayedCount: habits.recentlyPlayed.length
    });
});

app.get('/user/top-artists', (req, res) => {
    const { limit = 10 } = req.query;
    const habits = initUserHabits();
    res.json({ artists: habits.topArtists.slice(0, parseInt(limit)) });
});

app.get('/user/recently-played', (req, res) => {
    const { limit = 20 } = req.query;
    const habits = initUserHabits();
    res.json({ songs: habits.recentlyPlayed.slice(0, parseInt(limit)) });
});

app.get('/user/most-played', (req, res) => {
    const { limit = 20 } = req.query;
    const habits = initUserHabits();

    const mostPlayed = Object.entries(habits.songPlayCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, parseInt(limit));

    res.json({ songs: mostPlayed });
});

app.post('/user/habits/reset', (req, res) => {
    db.userHabits = { ...defaultDB.userHabits };
    res.json({ success: true, message: 'Listening habits reset' });
});

// ============ SETTINGS ============

app.get('/settings', (req, res) => {
    const defaultSettings = {
        theme: 'dark',
        accentColor: 'violet',
        audioQuality: 'high',
        autoPlay: true,
        crossfade: 3,
        normalizeVolume: true,
        downloadQuality: 'high',
        dataSaver: false,
        region: 'IN'
    };

    const settings = { ...defaultSettings, ...db.preferences };
    res.json({ settings });
});

app.put('/settings', (req, res) => {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid settings data' });
    }

    const allowedKeys = [
        'theme', 'accentColor', 'audioQuality', 'autoPlay',
        'crossfade', 'normalizeVolume', 'downloadQuality', 'dataSaver', 'region'
    ];

    const validUpdates = {};
    for (const key of allowedKeys) {
        if (updates[key] !== undefined) {
            validUpdates[key] = updates[key];
        }
    }

    db.preferences = { ...db.preferences, ...validUpdates };
    res.json({ success: true, settings: db.preferences });
});

// ============ CACHE MANAGEMENT ============

app.get('/cache/stats', (req, res) => {
    res.json({
        metadata: metadataCache.size,
        search: searchCache.size,
        artist: artistCache.size,
        extract: extractCache.size,
        trending: trendingCache.data ? trendingCache.data.length : 0
    });
});

app.post('/cache/clear', (req, res) => {
    metadataCache.clear();
    searchCache.clear();
    artistCache.clear();
    extractCache.clear();
    trendingCache.data = null;
    res.json({ success: true, message: 'All caches cleared' });
});

// ============================================
// SETTINGS ENDPOINTS
// ============================================

// Get user settings
app.get('/settings', (req, res) => {
    res.json({ settings: db.settings });
});

// Update user settings
app.put('/settings', (req, res) => {
    const newSettings = req.body;

    // Validate and merge settings
    const validKeys = ['theme', 'accentColor', 'audioQuality', 'autoPlay', 'crossfade',
        'normalizeVolume', 'bassBoost', 'downloadQuality', 'dataSaver'];

    for (const key of Object.keys(newSettings)) {
        if (validKeys.includes(key)) {
            // Validate specific settings
            if (key === 'bassBoost') {
                db.settings[key] = Math.max(0, Math.min(100, Number(newSettings[key]) || 0));
            } else if (key === 'crossfade') {
                db.settings[key] = Math.max(0, Math.min(12, Number(newSettings[key]) || 0));
            } else if (key === 'audioQuality' && ['low', 'normal', 'high', 'lossless'].includes(newSettings[key])) {
                db.settings[key] = newSettings[key];
            } else if (key === 'downloadQuality' && ['normal', 'high', 'lossless'].includes(newSettings[key])) {
                db.settings[key] = newSettings[key];
            } else if (key === 'theme' && ['dark', 'light', 'system'].includes(newSettings[key])) {
                db.settings[key] = newSettings[key];
            } else if (typeof newSettings[key] === 'boolean') {
                db.settings[key] = newSettings[key];
            } else if (typeof newSettings[key] === 'string') {
                db.settings[key] = newSettings[key];
            }
        }
    }

    console.log('[Settings] Updated:', db.settings);
    res.json({ success: true, settings: db.settings });
});

// ============ START SERVER ============

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           🎵 Supersonic Music Backend - ViTune Style 🎵            ║
╠════════════════════════════════════════════════════════════════════╣
║  Server: http://0.0.0.0:${PORT}                                          ║
║  Region: ${DEFAULT_REGION}                                                        ║
║  Audio Engine: Invidious/Piped API (No streaming, URL extraction)  ║
╠════════════════════════════════════════════════════════════════════╣
║  AUDIO EXTRACTION (ViTune Style)                                   ║
║  • GET  /extract/:videoId   - Get direct audio URL                 ║
╠════════════════════════════════════════════════════════════════════╣
║  DISCOVERY                                                         ║
║  • GET  /search?q=          - Search videos                        ║
║  • GET  /search/suggestions - Autocomplete                         ║
║  • GET  /trending           - Trending music                       ║
║  • GET  /home               - Home feed                            ║
║  • GET  /explore            - Explore page                         ║
║  • GET  /genre/:id          - Genre songs                          ║
║  • GET  /mood/:id           - Mood playlist                        ║
╠════════════════════════════════════════════════════════════════════╣
║  AUTOPLAY                                                          ║
║  • GET  /autoplay/:videoId  - Smart autoplay queue                 ║
║  • GET  /related/:videoId   - Related videos                       ║
╠════════════════════════════════════════════════════════════════════╣
║  CONTENT                                                           ║
║  • GET  /video/:videoId     - Video details                        ║
║  • GET  /artist/:channelId  - Artist info + tracks                 ║
║  • GET  /playlist/:id       - YouTube playlist                     ║
╠════════════════════════════════════════════════════════════════════╣
║  USER DATA                                                         ║
║  • GET  /history            - Play history                         ║
║  • POST /history            - Add to history                       ║
║  • GET  /favorites          - Liked songs                          ║
║  • POST /favorites/toggle   - Like/unlike                          ║
║  • GET  /playlists          - User playlists                       ║
║  • POST /playlists          - Create playlist                      ║
║  • GET  /settings           - Get user settings                    ║
║  • PUT  /settings           - Update settings                      ║
╚════════════════════════════════════════════════════════════════════╝
    `);
});
