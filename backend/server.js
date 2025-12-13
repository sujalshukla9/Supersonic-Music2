import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import ytdl from '@distube/ytdl-core';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Handle preflight requests for streaming endpoints
app.options('/stream/:videoId', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.status(204).end();
});

app.use(express.json());

// ============================================
// DATABASE - Simple JSON file storage
// ============================================
// Use /tmp on production (Render) for ephemeral storage, or local path for development
const isProduction = process.env.NODE_ENV === 'production';
const DB_PATH = isProduction
    ? '/tmp/database.json'
    : path.join(__dirname, 'database.json');

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

// Run music_api.py
async function runMusicApi(command, ...args) {
    try {
        // Simple argument escaping
        const escapedArgs = args.map(arg => {
            // If it's a number, don't escape
            if (typeof arg === 'number') return arg;
            // Escape double quotes and wrap in double quotes
            return `"${String(arg).replace(/"/g, '\\"')}"`;
        }).join(' ');

        const cmd = `python music_api.py ${command} ${escapedArgs}`;
        // console.log(`[MusicAPI] Running: ${cmd}`);

        const { stdout } = await execAsync(cmd, { cwd: __dirname });

        try {
            return JSON.parse(stdout);
        } catch (e) {
            console.error('[MusicAPI] JSON Parse error. Output:', stdout.substring(0, 200));
            return null;
        }
    } catch (e) {
        console.error('[MusicAPI] Exec error:', e.message);
        return null;
    }
}

// Search videos using ytmusicapi
async function searchVideos(query, maxResults = 20, type = 'songs') {
    const cacheKey = `search:${query}:${type}:${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
        return cached.data;
    }

    // Map 'video' to 'songs' or 'videos' for ytmusicapi
    // type: songs, videos, albums, artists, playlists
    let filter = type;
    if (type === 'video') filter = 'songs'; // Prefer songs for general video search
    if (type === 'channel') filter = 'artists';

    console.log(`[Search] Searching for: ${query} (filter: ${filter})`);

    const results = await runMusicApi('search', query, filter || 'songs');

    if (!results || !Array.isArray(results)) {
        console.log('[Search] No results or error');
        return [];
    }

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

        // Different ID fields based on type
        const id = item.videoId || item.browseId || item.id;

        return {
            id: id,
            title: item.title,
            artist: artistName,
            channelId: artistId,
            thumbnail: thumbnail,
            description: item.description || '',
            duration: item.duration || '0:00',
            durationSeconds: parseDuration(item.duration || '0:00'),
            type: item.resultType || type
        };
    }).filter(i => i.id); // Ensure ID exists

    console.log(`[Search] Found ${items.length} items`);
    searchCache.set(cacheKey, { data: items, timestamp: Date.now() });
    return items;
}


// Get video details
// Get video details
async function getVideoDetails(videoIds) {
    const ids = Array.isArray(videoIds) ? videoIds : [videoIds];
    const uniqueIds = [...new Set(ids)];

    const uncachedIds = uniqueIds.filter(id => {
        const cached = metadataCache.get(id);
        return !cached || Date.now() - cached.timestamp > METADATA_CACHE_DURATION;
    });

    if (uncachedIds.length > 0) {
        try {
            // Fetch in batches if necessary, but music_api.py handles comma separated
            // Join with commas
            const idString = uncachedIds.join(',');
            const items = await runMusicApi('get_song', idString);

            if (Array.isArray(items)) {
                for (const item of items) {
                    if (!item || !item.videoDetails) continue;

                    // Structure from ytmusicapi get_song is different?
                    // Actually get_song returns specific structure.
                    // output of get_song: { videoDetails: {...}, microformat: {...} }

                    const details = item.videoDetails;
                    const micro = item.microformat?.microformatDataRenderer || {};

                    const data = {
                        id: details.videoId,
                        title: details.title,
                        artist: details.author,
                        channelId: details.channelId,
                        thumbnail: details.thumbnail?.thumbnails?.[details.thumbnail.thumbnails.length - 1]?.url || '',
                        duration: formatDuration(parseInt(details.lengthSeconds || 0)),
                        durationSeconds: parseInt(details.lengthSeconds || 0),
                        publishedAt: micro.publishDate || '',
                        description: details.shortDescription || '',
                        viewCount: details.viewCount,
                        moods: extractMoodTags(details.title)
                    };

                    metadataCache.set(data.id, { data, timestamp: Date.now() });
                }
            } else if (items && items.videoDetails) {
                // Single result
                const details = items.videoDetails;
                const micro = items.microformat?.microformatDataRenderer || {};

                const data = {
                    id: details.videoId,
                    title: details.title,
                    artist: details.author,
                    channelId: details.channelId,
                    thumbnail: details.thumbnail?.thumbnails?.[details.thumbnail.thumbnails.length - 1]?.url || '',
                    duration: formatDuration(parseInt(details.lengthSeconds || 0)),
                    durationSeconds: parseInt(details.lengthSeconds || 0),
                    publishedAt: micro.publishDate || '',
                    description: details.shortDescription || '',
                    viewCount: details.viewCount,
                    moods: extractMoodTags(details.title)
                };
                metadataCache.set(data.id, { data, timestamp: Date.now() });
            }
        } catch (e) {
            console.error('[Video Details] Error:', e.message);
        }
    }

    return uniqueIds.map(id => metadataCache.get(id)?.data).filter(Boolean);
}

// Get trending music
// Get trending music
async function getTrendingMusic(maxResults = 25) {
    if (trendingCache.data && Date.now() - trendingCache.timestamp < TRENDING_CACHE_DURATION) {
        return trendingCache.data;
    }

    try {
        // Use ytmusicapi charts
        const charts = await runMusicApi('get_charts');
        let tracks = [];

        // charts has structure: { countries: {...}, global: {...}, trending: { items: [...] } }
        // get_charts('IN') returns data for India
        if (charts && charts.trending && charts.trending.items) {
            tracks = charts.trending.items;
        } else if (charts && typeof charts === 'object') {
            // Maybe it returned a different structure?
            // Fallback to search if charts fail
        }

        if (tracks.length === 0) {
            // Fallback to search
            return await searchVideos('trending music india', maxResults);
        }

        const results = tracks.slice(0, maxResults).map((item, index) => {
            return {
                id: item.videoId,
                title: item.title,
                artist: item.artists ? item.artists.map(a => a.name).join(', ') : '',
                channelId: item.artists ? item.artists[0]?.id : '',
                thumbnail: item.thumbnails[item.thumbnails.length - 1].url,
                rank: index + 1,
                moods: extractMoodTags(item.title)
            };
        });

        trendingCache.data = results;
        trendingCache.timestamp = Date.now();
        return results;
    } catch (e) {
        console.error('[Trending] Error:', e.message);
        return [];
    }
}

// Get related videos (for autoplay)
// Get related videos (for autoplay)
// Get related videos (for autoplay)
async function getRelatedVideos(videoId, maxResults = 20) {
    try {
        const playlist = await runMusicApi('get_watch_playlist', videoId, maxResults);

        if (!playlist || !playlist.tracks) return [];

        return playlist.tracks.map(track => ({
            id: track.videoId,
            title: track.title,
            artist: track.artists ? track.artists.map(a => a.name).join(', ') : (track.byline || ''),
            channelId: track.artists ? track.artists[0]?.id : '',
            thumbnail: track.thumbnail ? track.thumbnail.map(t => t.url).pop() : '',
            duration: track.length || '',
            durationSeconds: parseDuration(track.length || ''),
            isExplicit: track.isExplicit
        }));
    } catch (e) {
        console.error('[Related] Error:', e.message);
        return [];
    }
}

// Get channel/artist details
// Get channel/artist details
async function getChannelDetails(channelId) {
    const cached = artistCache.get(channelId);
    if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
        return cached.data;
    }

    try {
        const artist = await runMusicApi('get_artist', channelId);
        if (!artist) return null;

        const result = {
            id: channelId,
            name: artist.name,
            description: artist.description || '',
            thumbnail: artist.thumbnails?.[artist.thumbnails.length - 1]?.url || '',
            banner: artist.banner?.url || '',
            subscriberCount: artist.subscribers || '',
            videoCount: 0,
            verified: true
        };

        artistCache.set(channelId, { data: result, timestamp: Date.now() });
        return result;
    } catch (e) {
        console.error('[Artist] Error:', e.message);
        return null;
    }
}

// Get channel videos (artist's songs)
async function getChannelVideos(channelId, maxResults = 20) {
    try {
        const artist = await runMusicApi('get_artist', channelId);
        // get_artist returns sections like "songs", "singles", "albums", "videos"
        // We want 'songs' or 'videos'

        let tracks = [];
        if (artist && artist.songs && artist.songs.results) {
            tracks = artist.songs.results;
        } else if (artist && artist.videos && artist.videos.results) {
            tracks = artist.videos.results;
        }

        return tracks.slice(0, maxResults).map(track => ({
            id: track.videoId,
            title: track.title,
            artist: track.artists ? track.artists.map(a => a.name).join(', ') : '',
            channelId: channelId,
            thumbnail: track.thumbnails?.[track.thumbnails.length - 1]?.url || '',
            duration: track.duration || '',
            durationSeconds: parseDuration(track.duration || '')
        }));
    } catch (e) {
        console.error('[Artist Videos] Error:', e.message);
        return [];
    }
}

// Get playlist details
async function getPlaylistDetails(playlistId) {
    try {
        const playlist = await runMusicApi('get_playlist', playlistId, 10); // limit 0 just for details? No, get_playlist fetches tracks too
        if (!playlist) return null;

        return {
            id: playlist.id,
            title: playlist.title,
            description: playlist.description || '',
            thumbnail: playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url || '',
            channelTitle: playlist.author?.name || '',
            itemCount: playlist.trackCount || 0
        };
    } catch (e) {
        console.error('[Playlist] Error:', e.message);
        return null;
    }
}

// Get playlist items
async function getPlaylistItems(playlistId, maxResults = 50) {
    try {
        const playlist = await runMusicApi('get_playlist', playlistId, maxResults);
        if (!playlist || !playlist.tracks) return [];

        return playlist.tracks.map(track => ({
            id: track.videoId,
            title: track.title,
            artist: track.artists ? track.artists.map(a => a.name).join(', ') : '',
            channelId: track.artists ? track.artists[0]?.id : '',
            thumbnail: track.thumbnails?.[track.thumbnails.length - 1]?.url || '',
            duration: track.duration || '',
            durationSeconds: track.duration_seconds || parseDuration(track.duration || '')
        }));
    } catch (e) {
        console.error('[Playlist Items] Error:', e.message);
        return [];
    }
}

// ============================================
// AUDIO EXTRACTION (play-dl primary + fallbacks)
// ============================================

// Piped API instances (fallback - uses NewPipeExtractor)
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.r4fo.com',
    'https://api.piped.yt'
];

async function getAudioUrl(videoId) {
    const cached = audioCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < AUDIO_CACHE_DURATION) {
        console.log(`[Cache Hit] Audio: ${videoId}`);
        return cached.data;
    }

    console.log(`[Audio] Extracting audio for: ${videoId} (racing multiple sources)`);

    // Helper to try ytdl-core (fastest - pure Node.js)
    const tryYtdlCore = async () => {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getInfo(videoUrl);

        if (info && info.formats && info.formats.length > 0) {
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
            const bestFormat = audioFormats[0];

            if (bestFormat && bestFormat.url) {
                const videoDetails = info.videoDetails;
                return {
                    url: bestFormat.url,
                    title: videoDetails?.title || '',
                    artist: videoDetails?.author?.name || videoDetails?.ownerChannelName || '',
                    duration: parseInt(videoDetails?.lengthSeconds) || 0,
                    thumbnail: videoDetails?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    videoId: videoId,
                    source: 'ytdl-core',
                    mimeType: bestFormat.mimeType || 'audio/webm',
                    bitrate: bestFormat.audioBitrate ? bestFormat.audioBitrate * 1000 : 128000
                };
            }
        }
        throw new Error('No audio formats found');
    };

    // Helper to try yt-dlp (Python - more reliable but slower startup)
    const tryYtDlp = async () => {
        const result = await runMusicApi('extract_audio', videoId);
        if (result && result.url && !result.error) {
            return {
                url: result.url,
                title: result.title || '',
                artist: result.artist || '',
                duration: result.duration || 0,
                thumbnail: result.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                videoId: videoId,
                source: 'yt-dlp',
                mimeType: result.mimeType || 'audio/webm',
                bitrate: result.bitrate || 128000
            };
        }
        throw new Error(result?.error || 'yt-dlp failed');
    };

    // Helper to try Piped API (external service)
    const tryPiped = async (instance) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced timeout

        const response = await fetch(`${instance}/streams/${videoId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);


        const data = await response.json();
        if (!data.audioStreams || data.audioStreams.length === 0) {
            throw new Error('No audio streams');
        }

        const audioStreams = data.audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const bestAudio = audioStreams[0];

        if (!bestAudio.url) throw new Error('No URL in stream');

        return {
            url: bestAudio.url,
            title: data.title || '',
            artist: data.uploader || data.uploaderName || '',
            duration: data.duration || 0,
            thumbnail: data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            videoId: videoId,
            source: 'piped',
            mimeType: bestAudio.mimeType || 'audio/mp4',
            bitrate: bestAudio.bitrate || 0
        };
    };

    // Race all sources in parallel - first successful wins!
    const sources = [
        tryYtdlCore().then(r => { console.log(`[Audio] ytdl-core won for ${videoId}`); return r; }).catch(e => { console.log(`[Audio] ytdl-core: ${e.message}`); throw e; }),
        tryYtDlp().then(r => { console.log(`[Audio] yt-dlp won for ${videoId}`); return r; }).catch(e => { console.log(`[Audio] yt-dlp: ${e.message}`); throw e; }),
        ...PIPED_INSTANCES.map(inst =>
            tryPiped(inst).then(r => { console.log(`[Audio] Piped ${inst} won for ${videoId}`); return r; }).catch(e => { console.log(`[Audio] Piped ${inst}: ${e.message}`); throw e; })
        )
    ];

    // Promise.any returns the first successful promise
    try {
        const result = await Promise.any(sources);
        audioCache.set(videoId, { data: result, timestamp: Date.now() });
        console.log(`[Audio] Success from ${result.source}: ${videoId}`);
        return result;
    } catch (aggregateError) {
        // All sources failed
        console.log(`[Audio] All sources failed for: ${videoId}`);
        throw new Error('Could not extract audio from any source');
    }
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

// Proxy stream - uses yt-dlp for streaming
app.get('/stream/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const { quality = 'high' } = req.query;
    // Note: Seeking is not supported in proxy streaming mode due to ffmpeg requirements

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    try {
        console.log(`[Stream] Starting stream via yt-dlp for: ${videoId} (Quality: ${quality})`);

        // Map quality to yt-dlp format options
        let format = 'bestaudio[ext=webm]/bestaudio/best';

        if (quality === 'low') format = 'worstaudio/worst';
        if (quality === 'normal') format = 'bestaudio[abr<=128]/bestaudio';

        const args = [
            '-f', format,
            '-o', '-',
            '--no-warnings',
            '--source-address', '0.0.0.0',
            '--force-ipv4',
        ];

        args.push(`https://www.youtube.com/watch?v=${videoId}`);

        const ytDlpProcess = spawn('python', ['-u', '-m', 'yt_dlp', ...args]);

        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Access-Control-Allow-Origin', '*');

        ytDlpProcess.stdout.pipe(res);

        ytDlpProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.toLowerCase().includes('error') && !msg.includes('DeprecationWarning')) {
                console.log(`[Stream] yt-dlp: ${msg.trim()}`);
            }
        });

        // Handle client disconnect
        req.on('close', () => {
            ytDlpProcess.kill();
        });

    } catch (error) {
        console.error(`[Stream] Error for ${videoId}:`, error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Stream failed', message: error.message });
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
        // Add to recent searches (async, don't wait)
        db.recentSearches = [q, ...db.recentSearches.filter(s => s !== q)].slice(0, 20);

        // searchVideos already returns complete data from ytmusicapi
        // No need for additional getVideoDetails call (saves ~500-1000ms)
        const results = await searchVideos(q, parseInt(maxResults));

        res.json({
            results,
            source: 'ytmusicapi'
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
        const artists = await searchVideos(q + ' music artist', parseInt(maxResults), 'items'); // searchVideos uses 'channel' for artists filter under the hood if type is channel?
        // Wait, searchVideos implementation:
        // if (type === 'channel') filter = 'artists';
        // So I should pass 'channel'.

        // Actually, let's use searchVideos correctly
        const results = await searchVideos(q, parseInt(maxResults), 'channel');

        res.json({ results });
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

// ============ ALBUMS ============

// Get album details with tracks
app.get('/album/:albumId', async (req, res) => {
    const { albumId } = req.params;

    try {
        console.log(`[Album] Fetching album: ${albumId}`);
        const album = await runMusicApi('get_album', albumId);

        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        // Transform album data
        const albumData = {
            id: album.audioPlaylistId || albumId,
            browseId: albumId,
            title: album.title,
            artist: album.artists ? album.artists.map(a => a.name).join(', ') : '',
            artistId: album.artists?.[0]?.id || '',
            thumbnail: album.thumbnails?.[album.thumbnails.length - 1]?.url || '',
            year: album.year || '',
            trackCount: album.trackCount || (album.tracks?.length || 0),
            duration: album.duration || '',
            description: album.description || '',
            type: album.type || 'Album'
        };

        // Transform tracks
        const tracks = (album.tracks || []).map((track, index) => ({
            id: track.videoId,
            title: track.title,
            artist: track.artists ? track.artists.map(a => a.name).join(', ') : albumData.artist,
            artistId: track.artists?.[0]?.id || albumData.artistId,
            thumbnail: track.thumbnails?.[track.thumbnails.length - 1]?.url || albumData.thumbnail,
            duration: track.duration || '',
            durationSeconds: track.duration_seconds || parseDuration(track.duration || ''),
            trackNumber: index + 1,
            isExplicit: track.isExplicit || false,
            album: albumData.title,
            albumId: albumId
        }));

        console.log(`[Album] Found album "${albumData.title}" with ${tracks.length} tracks`);

        res.json({
            album: albumData,
            tracks
        });
    } catch (error) {
        console.error('[Album] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Search for albums
app.get('/albums/search', async (req, res) => {
    const { q, maxResults = 20 } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Query required' });
    }

    try {
        console.log(`[Albums] Searching for: ${q}`);
        const results = await runMusicApi('search', q, 'albums');

        if (!results || !Array.isArray(results)) {
            return res.json({ albums: [] });
        }

        const albums = results.slice(0, parseInt(maxResults)).map(album => ({
            id: album.browseId,
            title: album.title,
            artist: album.artists ? album.artists.map(a => a.name).join(', ') : '',
            artistId: album.artists?.[0]?.id || '',
            thumbnail: album.thumbnails?.[album.thumbnails.length - 1]?.url || '',
            year: album.year || '',
            type: album.resultType || 'album',
            isExplicit: album.isExplicit || false
        })).filter(a => a.id);

        console.log(`[Albums] Found ${albums.length} albums`);
        res.json({ albums });
    } catch (error) {
        console.error('[Albums] Search error:', error.message);
        res.json({ albums: [], error: error.message });
    }
});

// Get new album releases
app.get('/albums/new', async (req, res) => {
    const { maxResults = 20 } = req.query;

    try {
        console.log('[Albums] Fetching new releases');

        // Search for recent album releases
        const queries = [
            'new album releases 2024',
            'latest bollywood albums',
            'new hindi albums'
        ];

        const allAlbums = [];
        const seenIds = new Set();

        for (const query of queries) {
            const results = await runMusicApi('search', query, 'albums');
            if (results && Array.isArray(results)) {
                for (const album of results) {
                    if (album.browseId && !seenIds.has(album.browseId)) {
                        seenIds.add(album.browseId);
                        allAlbums.push({
                            id: album.browseId,
                            title: album.title,
                            artist: album.artists ? album.artists.map(a => a.name).join(', ') : '',
                            artistId: album.artists?.[0]?.id || '',
                            thumbnail: album.thumbnails?.[album.thumbnails.length - 1]?.url || '',
                            year: album.year || '',
                            type: album.resultType || 'album',
                            isExplicit: album.isExplicit || false
                        });
                    }
                }
            }
        }

        console.log(`[Albums] Found ${allAlbums.length} new releases`);
        res.json({ albums: allAlbums.slice(0, parseInt(maxResults)) });
    } catch (error) {
        console.error('[Albums] New releases error:', error.message);
        res.json({ albums: [], error: error.message });
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
    const { videoId } = req.params;

    try {
        // Need browseId for lyrics. get_watch_playlist returns it.
        const watchList = await runMusicApi('get_watch_playlist', videoId);

        if (watchList && watchList.lyrics) {
            const lyricsData = await runMusicApi('get_lyrics', watchList.lyrics);
            if (lyricsData && lyricsData.lyrics) {
                return res.json({
                    lyrics: lyricsData.lyrics,
                    source: lyricsData.source || 'MusixMatch via YouTube Music'
                });
            }
        }

        res.json({
            lyrics: null,
            message: 'Lyrics not available.'
        });
    } catch (e) {
        console.error('[Lyrics] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
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
║  Audio Engine: yt-dlp (System Python)                             ║
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
