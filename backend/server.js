import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const DEFAULT_REGION = process.env.REGION || 'IN';
const YT_API_KEY = process.env.YT_KEY || 'AIzaSyD19rb22YPwhrDDv4-FqBY5DQRUPfs24fE';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// ============================================
// DATABASE - Simple JSON file storage
// ============================================
const DB_PATH = path.join(__dirname, 'database.json');

const defaultDB = {
    history: [],           // Play history
    favorites: [],         // Liked songs
    playlists: [],         // User playlists
    recentSearches: [],    // Recent search queries
    lastPlayed: null,      // Last played song
    preferences: {
        region: 'IN',
        quality: 'high',
        autoplay: true
    }
};

function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        }
    } catch (e) {
        console.error('[DB] Load error:', e.message);
    }
    return { ...defaultDB };
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[DB] Save error:', e.message);
    }
}

let db = loadDB();

// Auto-save periodically
setInterval(() => saveDB(db), 60000);

// ============================================
// CACHES
// ============================================
const audioCache = new Map();         // Audio URL cache (4 hours)
const metadataCache = new Map();      // Video metadata cache (1 hour)
const searchCache = new Map();        // Search results cache (15 minutes)
const trendingCache = { data: null, timestamp: 0 }; // Trending cache (30 minutes)
const artistCache = new Map();        // Artist info cache (1 hour)

const AUDIO_CACHE_DURATION = 4 * 60 * 60 * 1000;      // 4 hours
const METADATA_CACHE_DURATION = 60 * 60 * 1000;        // 1 hour
const SEARCH_CACHE_DURATION = 15 * 60 * 1000;          // 15 minutes
const TRENDING_CACHE_DURATION = 30 * 60 * 1000;        // 30 minutes

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
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
}

function formatDurationFromISO(duration) {
    const seconds = parseDuration(duration);
    return formatDuration(seconds);
}

// Extract mood/tags from title
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

// ============================================
// YOUTUBE DATA API FUNCTIONS
// ============================================

async function youtubeApiCall(endpoint, params) {
    const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
    url.searchParams.set('key', YT_API_KEY);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API Error: ${response.status}`);
    }
    return response.json();
}

// Search videos
async function searchVideos(query, maxResults = 20, type = 'video') {
    const cacheKey = `search:${query}:${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
        return cached.data;
    }

    const data = await youtubeApiCall('search', {
        part: 'snippet',
        type,
        q: query,
        maxResults,
        videoCategoryId: '10', // Music category
        regionCode: DEFAULT_REGION
    });

    const results = data.items?.map(item => ({
        id: typeof item.id === 'string' ? item.id : item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        publishedAt: item.snippet.publishedAt,
        description: item.snippet.description
    })) || [];

    searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
}

// Get video details
async function getVideoDetails(videoIds) {
    const ids = Array.isArray(videoIds) ? videoIds : [videoIds];
    const uncachedIds = ids.filter(id => {
        const cached = metadataCache.get(id);
        return !cached || Date.now() - cached.timestamp > METADATA_CACHE_DURATION;
    });

    if (uncachedIds.length > 0) {
        const data = await youtubeApiCall('videos', {
            part: 'snippet,contentDetails,statistics',
            id: uncachedIds.join(',')
        });

        for (const item of data.items || []) {
            metadataCache.set(item.id, {
                data: {
                    id: item.id,
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnail: item.snippet.thumbnails?.maxres?.url ||
                        item.snippet.thumbnails?.high?.url ||
                        item.snippet.thumbnails?.medium?.url,
                    duration: formatDurationFromISO(item.contentDetails?.duration),
                    durationSeconds: parseDuration(item.contentDetails?.duration),
                    publishedAt: item.snippet.publishedAt,
                    description: item.snippet.description,
                    tags: item.snippet.tags || [],
                    viewCount: parseInt(item.statistics?.viewCount || 0),
                    likeCount: parseInt(item.statistics?.likeCount || 0),
                    moods: extractMoodTags(item.snippet.title)
                },
                timestamp: Date.now()
            });
        }
    }

    return ids.map(id => metadataCache.get(id)?.data).filter(Boolean);
}

// Get trending music
async function getTrendingMusic(maxResults = 25) {
    if (trendingCache.data && Date.now() - trendingCache.timestamp < TRENDING_CACHE_DURATION) {
        return trendingCache.data;
    }

    const data = await youtubeApiCall('videos', {
        part: 'snippet,contentDetails,statistics',
        chart: 'mostPopular',
        videoCategoryId: '10',
        regionCode: DEFAULT_REGION,
        maxResults
    });

    const results = data.items?.map((item, rank) => ({
        id: item.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        duration: formatDurationFromISO(item.contentDetails?.duration),
        durationSeconds: parseDuration(item.contentDetails?.duration),
        viewCount: parseInt(item.statistics?.viewCount || 0),
        rank: rank + 1,
        moods: extractMoodTags(item.snippet.title)
    })) || [];

    trendingCache.data = results;
    trendingCache.timestamp = Date.now();
    return results;
}

// Get related videos (for autoplay)
async function getRelatedVideos(videoId, maxResults = 15) {
    const data = await youtubeApiCall('search', {
        part: 'snippet',
        type: 'video',
        relatedToVideoId: videoId,
        maxResults,
        videoCategoryId: '10'
    });

    return data.items?.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url
    })).filter(v => v.id) || [];
}

// Get channel/artist details
async function getChannelDetails(channelId) {
    const cached = artistCache.get(channelId);
    if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
        return cached.data;
    }

    const data = await youtubeApiCall('channels', {
        part: 'snippet,statistics,brandingSettings',
        id: channelId
    });

    const channel = data.items?.[0];
    if (!channel) return null;

    const result = {
        id: channel.id,
        name: channel.snippet.title,
        description: channel.snippet.description,
        thumbnail: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.medium?.url,
        banner: channel.brandingSettings?.image?.bannerExternalUrl,
        subscriberCount: parseInt(channel.statistics?.subscriberCount || 0),
        videoCount: parseInt(channel.statistics?.videoCount || 0),
        viewCount: parseInt(channel.statistics?.viewCount || 0),
        verified: channel.snippet.customUrl ? true : false
    };

    artistCache.set(channelId, { data: result, timestamp: Date.now() });
    return result;
}

// Get channel videos (artist's songs)
async function getChannelVideos(channelId, maxResults = 20) {
    const data = await youtubeApiCall('search', {
        part: 'snippet',
        channelId,
        type: 'video',
        order: 'viewCount',
        maxResults
    });

    const videoIds = data.items?.map(item => item.id.videoId).filter(Boolean) || [];
    if (videoIds.length === 0) return [];

    return await getVideoDetails(videoIds);
}

// Get playlist details
async function getPlaylistDetails(playlistId) {
    const data = await youtubeApiCall('playlists', {
        part: 'snippet,contentDetails',
        id: playlistId
    });

    const playlist = data.items?.[0];
    if (!playlist) return null;

    return {
        id: playlist.id,
        title: playlist.snippet.title,
        description: playlist.snippet.description,
        thumbnail: playlist.snippet.thumbnails?.high?.url || playlist.snippet.thumbnails?.medium?.url,
        channelTitle: playlist.snippet.channelTitle,
        itemCount: playlist.contentDetails?.itemCount || 0
    };
}

// Get playlist items
async function getPlaylistItems(playlistId, maxResults = 50) {
    const data = await youtubeApiCall('playlistItems', {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults
    });

    const videoIds = data.items?.map(item => item.contentDetails?.videoId).filter(Boolean) || [];
    if (videoIds.length === 0) return [];

    return await getVideoDetails(videoIds);
}

// ============================================
// AUDIO EXTRACTION (yt-dlp)
// ============================================

async function getAudioUrl(videoId) {
    const cached = audioCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < AUDIO_CACHE_DURATION) {
        console.log(`[Cache Hit] Audio: ${videoId}`);
        return cached.data;
    }

    console.log(`[yt-dlp] Extracting audio: ${videoId}`);

    return new Promise((resolve, reject) => {
        const ytdlp = spawn('python', [
            '-m', 'yt_dlp',
            '--geo-bypass',
            '--geo-bypass-country', DEFAULT_REGION,
            '-f', 'bestaudio[ext=m4a]/bestaudio/best',
            '--get-url',
            '-j',
            '--no-warnings',
            '--no-playlist',
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        let stdout = '';
        let stderr = '';

        ytdlp.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        const timeout = setTimeout(() => {
            ytdlp.kill();
            reject(new Error('yt-dlp timeout'));
        }, 30000);

        ytdlp.on('close', (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
                console.error(`[yt-dlp] Error for ${videoId}:`, stderr);
                reject(new Error(`yt-dlp exited with code ${code}`));
                return;
            }

            try {
                const lines = stdout.trim().split('\n');
                let audioUrl = '';
                let metadata = null;

                for (const line of lines) {
                    if (line.startsWith('http')) {
                        audioUrl = line.trim();
                    } else if (line.startsWith('{')) {
                        try {
                            metadata = JSON.parse(line);
                        } catch (e) { }
                    }
                }

                if (!audioUrl) {
                    reject(new Error('No audio URL found'));
                    return;
                }

                const result = {
                    url: audioUrl,
                    title: metadata?.title || '',
                    artist: metadata?.uploader || metadata?.channel || '',
                    duration: metadata?.duration || 0,
                    thumbnail: metadata?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    videoId: videoId,
                    source: 'yt-dlp',
                    formats: metadata?.formats?.filter(f => f.acodec !== 'none').map(f => ({
                        format_id: f.format_id,
                        ext: f.ext,
                        abr: f.abr,
                        asr: f.asr
                    })) || []
                };

                audioCache.set(videoId, {
                    data: result,
                    timestamp: Date.now()
                });

                console.log(`[yt-dlp] Success: ${videoId}`);
                resolve(result);
            } catch (parseError) {
                reject(parseError);
            }
        });

        ytdlp.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

// ============================================
// SMART AUTOPLAY ALGORITHM
// ============================================

async function generateAutoplayQueue(seedVideoId, count = 20) {
    console.log(`[Autoplay] Generating queue for seed: ${seedVideoId}`);

    // Get seed video details
    const [seedVideo] = await getVideoDetails(seedVideoId);
    if (!seedVideo) {
        return await getTrendingMusic(count);
    }

    const queue = [];
    const addedIds = new Set([seedVideoId]);

    // 1. Get related videos (primary source)
    const related = await getRelatedVideos(seedVideoId, 25);

    // 2. Get videos from same artist
    let artistVideos = [];
    if (seedVideo.channelId) {
        try {
            artistVideos = await getChannelVideos(seedVideo.channelId, 10);
        } catch (e) {
            console.log('[Autoplay] Could not fetch artist videos');
        }
    }

    // 3. Search by mood keywords from seed
    let moodVideos = [];
    if (seedVideo.moods?.length > 0) {
        try {
            const moodQuery = `${seedVideo.moods[0]} hindi songs`;
            moodVideos = await searchVideos(moodQuery, 10);
        } catch (e) { }
    }

    // 4. Search by similar title keywords
    let keywordVideos = [];
    const titleWords = seedVideo.title.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
    if (titleWords.length > 0) {
        try {
            keywordVideos = await searchVideos(titleWords.join(' ') + ' song', 10);
        } catch (e) { }
    }

    // Score and rank all candidates
    const candidates = [];

    // Related videos - highest priority
    for (const video of related) {
        if (!addedIds.has(video.id)) {
            let score = 100;
            // Boost same artist
            if (video.channelId === seedVideo.channelId) score += 50;
            // Boost matching moods
            const videoMoods = extractMoodTags(video.title);
            const matchingMoods = videoMoods.filter(m => seedVideo.moods?.includes(m));
            score += matchingMoods.length * 20;
            candidates.push({ ...video, score, source: 'related' });
        }
    }

    // Artist videos - high priority (boost same artist)
    for (const video of artistVideos) {
        if (!addedIds.has(video.id)) {
            candidates.push({ ...video, score: 120, source: 'artist' });
        }
    }

    // Mood videos - medium priority
    for (const video of moodVideos) {
        if (!addedIds.has(video.id)) {
            candidates.push({ ...video, score: 60, source: 'mood' });
        }
    }

    // Keyword videos - lower priority
    for (const video of keywordVideos) {
        if (!addedIds.has(video.id)) {
            candidates.push({ ...video, score: 40, source: 'keyword' });
        }
    }

    // Sort by score (descending) and add some randomness
    candidates.sort((a, b) => {
        const scoreA = a.score + Math.random() * 20;
        const scoreB = b.score + Math.random() * 20;
        return scoreB - scoreA;
    });

    // Build the queue
    for (const candidate of candidates) {
        if (queue.length >= count) break;
        if (!addedIds.has(candidate.id)) {
            addedIds.add(candidate.id);
            queue.push({
                id: candidate.id,
                title: candidate.title,
                artist: candidate.artist,
                thumbnail: candidate.thumbnail,
                duration: candidate.duration || '3:30',
                durationSeconds: candidate.durationSeconds || 210,
                channelId: candidate.channelId,
                source: candidate.source
            });
        }
    }

    // If we don't have enough, fill with trending
    if (queue.length < count) {
        const trending = await getTrendingMusic(count - queue.length + 5);
        for (const video of trending) {
            if (queue.length >= count) break;
            if (!addedIds.has(video.id)) {
                addedIds.add(video.id);
                queue.push({ ...video, source: 'trending' });
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

    // 1. Recently Played (from history)
    if (db.history.length > 0) {
        sections.push({
            id: 'recently-played',
            title: 'Recently Played',
            type: 'horizontal',
            items: db.history.slice(0, 10)
        });
    }

    // 2. Quick Picks (recommendations based on history)
    if (db.history.length > 0) {
        try {
            const lastPlayed = db.history[0];
            const recommendations = await generateAutoplayQueue(lastPlayed.id, 10);
            sections.push({
                id: 'quick-picks',
                title: 'Quick Picks',
                subtitle: `Based on "${lastPlayed.title}"`,
                type: 'horizontal',
                items: recommendations
            });
        } catch (e) {
            console.log('[Home] Quick picks failed:', e.message);
        }
    }

    // 3. Trending Now
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

    // 4. New Releases
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

    // 5. Mood-based sections
    const moodSections = [
        { id: 'romantic-hits', title: 'Romantic Hits', query: 'romantic hindi songs' },
        { id: 'party-mix', title: 'Party Mix', query: 'party songs bollywood' },
        { id: 'chill-vibes', title: 'Chill Vibes', query: 'lofi hindi relaxing' },
        { id: 'punjabi-beats', title: 'Punjabi Beats', query: 'punjabi songs trending' }
    ];

    for (const mood of moodSections) {
        try {
            const songs = await searchVideos(mood.query, 8);
            if (songs.length > 0) {
                sections.push({
                    id: mood.id,
                    title: mood.title,
                    type: 'horizontal',
                    items: songs
                });
            }
        } catch (e) { }
    }

    // 6. Favorites
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
            audio: audioCache.size,
            metadata: metadataCache.size,
            search: searchCache.size,
            artist: artistCache.size
        },
        database: {
            historyCount: db.history.length,
            favoritesCount: db.favorites.length,
            playlistsCount: db.playlists.length
        }
    });
});

// ============ AUDIO STREAMING ============

// Get audio URL
app.get('/audio/:videoId', async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    try {
        const audioInfo = await getAudioUrl(videoId);
        res.json(audioInfo);
    } catch (error) {
        console.error(`[Audio] Error: ${error.message}`);
        res.status(500).json({ error: 'Audio not available', message: error.message });
    }
});

// Proxy stream
app.get('/stream/:videoId', async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    try {
        const audioInfo = await getAudioUrl(videoId);

        if (!audioInfo?.url) {
            return res.status(404).json({ error: 'Audio not available' });
        }

        const audioResponse = await fetch(audioInfo.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.youtube.com/',
                'Range': req.headers.range || 'bytes=0-'
            }
        });

        res.status(audioResponse.status);
        res.setHeader('Content-Type', audioResponse.headers.get('content-type') || 'audio/mp4');
        res.setHeader('Accept-Ranges', 'bytes');

        const contentLength = audioResponse.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        const contentRange = audioResponse.headers.get('content-range');
        if (contentRange) res.setHeader('Content-Range', contentRange);

        const reader = audioResponse.body.getReader();
        const pump = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            res.end();
        };

        pump().catch(() => res.end());
    } catch (error) {
        console.error(`[Stream] Error: ${error.message}`);
        res.status(500).json({ error: 'Stream failed' });
    }
});

// ============ SEARCH ============

app.get('/search', async (req, res) => {
    const { q, maxResults = 20 } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Query required' });
    }

    try {
        // Add to recent searches
        db.recentSearches = [q, ...db.recentSearches.filter(s => s !== q)].slice(0, 20);

        const results = await searchVideos(q + ' music', parseInt(maxResults));

        // Get full details for search results
        const videoIds = results.map(r => r.id);
        const detailed = await getVideoDetails(videoIds);

        res.json({
            results: detailed.length > 0 ? detailed : results,
            source: 'youtube-api'
        });
    } catch (error) {
        console.error('[Search] Error:', error.message);
        res.json({ results: [], error: error.message });
    }
});

// Search suggestions
app.get('/search/suggestions', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        // Return recent searches
        return res.json({ suggestions: db.recentSearches.slice(0, 10) });
    }

    try {
        // Use YouTube's autocomplete API
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

app.get('/trending', async (req, res) => {
    const { maxResults = 25 } = req.query;

    try {
        const results = await getTrendingMusic(parseInt(maxResults));
        res.json({ results, source: 'youtube-api' });
    } catch (error) {
        console.error('[Trending] Error:', error.message);
        res.json({ results: [], error: error.message });
    }
});

// ============ HOME FEED ============

app.get('/home', async (req, res) => {
    try {
        const sections = await generateHomeFeed();
        res.json({ sections });
    } catch (error) {
        console.error('[Home] Error:', error.message);
        res.json({ sections: [], error: error.message });
    }
});

// ============ AUTOPLAY / RADIO ============

app.get('/autoplay/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const { count = 20 } = req.query;

    try {
        const queue = await generateAutoplayQueue(videoId, parseInt(count));
        res.json({ queue, seedVideoId: videoId });
    } catch (error) {
        console.error('[Autoplay] Error:', error.message);
        res.json({ queue: [], error: error.message });
    }
});

// Related videos
app.get('/related/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const { maxResults = 15 } = req.query;

    try {
        const results = await getRelatedVideos(videoId, parseInt(maxResults));
        res.json({ results });
    } catch (error) {
        console.error('[Related] Error:', error.message);
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
        console.error('[Video] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============ ARTIST ============

app.get('/artist/:channelId', async (req, res) => {
    const { channelId } = req.params;

    try {
        const artist = await getChannelDetails(channelId);
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }

        const topTracks = await getChannelVideos(channelId, 20);

        res.json({
            artist,
            topTracks
        });
    } catch (error) {
        console.error('[Artist] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Search artists
app.get('/artists/search', async (req, res) => {
    const { q, maxResults = 10 } = req.query;

    try {
        const data = await youtubeApiCall('search', {
            part: 'snippet',
            type: 'channel',
            q: q + ' music artist',
            maxResults
        });

        const artists = data.items?.map(item => ({
            id: item.id.channelId,
            name: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
            description: item.snippet.description
        })) || [];

        res.json({ results: artists });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PLAYLISTS ============

// Get YouTube playlist
app.get('/playlist/:playlistId', async (req, res) => {
    const { playlistId } = req.params;

    try {
        const details = await getPlaylistDetails(playlistId);
        if (!details) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const items = await getPlaylistItems(playlistId, 50);

        res.json({
            playlist: details,
            items
        });
    } catch (error) {
        console.error('[Playlist] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============ USER DATA (History, Favorites, Playlists) ============

// Get history
app.get('/history', (req, res) => {
    res.json({ history: db.history });
});

// Add to history
app.post('/history', (req, res) => {
    const { song } = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    // Remove duplicates and add to front
    db.history = [
        { ...song, playedAt: new Date().toISOString() },
        ...db.history.filter(s => s.id !== song.id)
    ].slice(0, 100); // Keep last 100

    db.lastPlayed = song;
    saveDB(db);

    res.json({ success: true, historySize: db.history.length });
});

// Clear history
app.delete('/history', (req, res) => {
    db.history = [];
    saveDB(db);
    res.json({ success: true });
});

// Get favorites
app.get('/favorites', (req, res) => {
    res.json({ favorites: db.favorites });
});

// Toggle favorite
app.post('/favorites/toggle', (req, res) => {
    const { song } = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    const existingIndex = db.favorites.findIndex(s => s.id === song.id);

    if (existingIndex >= 0) {
        db.favorites.splice(existingIndex, 1);
        saveDB(db);
        res.json({ liked: false, favoritesCount: db.favorites.length });
    } else {
        db.favorites.unshift({ ...song, likedAt: new Date().toISOString() });
        saveDB(db);
        res.json({ liked: true, favoritesCount: db.favorites.length });
    }
});

// Check if favorited
app.get('/favorites/check/:videoId', (req, res) => {
    const { videoId } = req.params;
    const isLiked = db.favorites.some(s => s.id === videoId);
    res.json({ isLiked });
});

// Get user playlists
app.get('/playlists', (req, res) => {
    res.json({ playlists: db.playlists });
});

// Create playlist
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
    saveDB(db);

    res.json({ playlist });
});

// Add to playlist
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
        saveDB(db);
    }

    res.json({ success: true, itemCount: playlist.items.length });
});

// Remove from playlist
app.delete('/playlists/:playlistId/remove/:songId', (req, res) => {
    const { playlistId, songId } = req.params;

    const playlist = db.playlists.find(p => p.id === playlistId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.items = playlist.items.filter(s => s.id !== songId);
    playlist.updatedAt = new Date().toISOString();
    saveDB(db);

    res.json({ success: true, itemCount: playlist.items.length });
});

// Delete playlist
app.delete('/playlists/:playlistId', (req, res) => {
    const { playlistId } = req.params;
    db.playlists = db.playlists.filter(p => p.id !== playlistId);
    saveDB(db);
    res.json({ success: true });
});

// ============ EXPLORE / DISCOVER ============

app.get('/explore', async (req, res) => {
    try {
        const sections = [];

        // Genres with curated playlists
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

        // Mood playlists
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

        // New releases
        const newReleases = await searchVideos('bollywood official music video 2024', 10);
        sections.push({
            id: 'new-releases',
            title: 'New Releases',
            type: 'horizontal',
            items: newReleases
        });

        // Charts
        const trending = await getTrendingMusic(10);
        sections.push({
            id: 'charts',
            title: 'Top Charts - India',
            type: 'numbered',
            items: trending
        });

        res.json({ sections });
    } catch (error) {
        console.error('[Explore] Error:', error.message);
        res.json({ sections: [], error: error.message });
    }
});

// Genre songs
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
        const detailed = await getVideoDetails(results.map(r => r.id));
        res.json({ results: detailed, genre: genreId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mood playlist
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

// ============ LYRICS (placeholder - would need external API) ============

app.get('/lyrics/:videoId', async (req, res) => {
    // Note: Actual lyrics would require an external API like Musixmatch
    res.json({
        lyrics: null,
        message: 'Lyrics not available. Would require external lyrics API integration.'
    });
});

// ============ CACHE MANAGEMENT ============

app.get('/cache/stats', (req, res) => {
    res.json({
        audio: audioCache.size,
        metadata: metadataCache.size,
        search: searchCache.size,
        artist: artistCache.size,
        trending: trendingCache.data ? trendingCache.data.length : 0
    });
});

app.post('/cache/clear', (req, res) => {
    audioCache.clear();
    metadataCache.clear();
    searchCache.clear();
    artistCache.clear();
    trendingCache.data = null;
    res.json({ success: true, message: 'All caches cleared' });
});

// ============ START SERVER ============

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║         🎵 Supersonic Music Backend - YouTube Music Style 🎵       ║
╠═══════════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                                      ║
║  Region: ${DEFAULT_REGION} (India)                                              ║
║  Audio Engine: yt-dlp                                             ║
║  Database: JSON (${DB_PATH})
╠═══════════════════════════════════════════════════════════════════╣
║  STREAMING                                                        ║
║  • GET  /audio/:videoId      - Get audio URL                      ║
║  • GET  /stream/:videoId     - Proxy stream                       ║
╠═══════════════════════════════════════════════════════════════════╣
║  DISCOVERY                                                        ║
║  • GET  /search?q=           - Search videos                      ║
║  • GET  /search/suggestions  - Autocomplete                       ║
║  • GET  /trending            - Trending music                     ║
║  • GET  /home                - Home feed                          ║
║  • GET  /explore             - Explore page                       ║
║  • GET  /genre/:id           - Genre songs                        ║
║  • GET  /mood/:id            - Mood playlist                      ║
╠═══════════════════════════════════════════════════════════════════╣
║  AUTOPLAY                                                         ║
║  • GET  /autoplay/:videoId   - Smart autoplay queue               ║
║  • GET  /related/:videoId    - Related videos                     ║
╠═══════════════════════════════════════════════════════════════════╣
║  CONTENT                                                          ║
║  • GET  /video/:videoId      - Video details                      ║
║  • GET  /artist/:channelId   - Artist info + tracks               ║
║  • GET  /playlist/:id        - YouTube playlist                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  USER DATA                                                        ║
║  • GET  /history             - Play history                       ║
║  • POST /history             - Add to history                     ║
║  • GET  /favorites           - Liked songs                        ║
║  • POST /favorites/toggle    - Like/unlike                        ║
║  • GET  /playlists           - User playlists                     ║
║  • POST /playlists           - Create playlist                    ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});
