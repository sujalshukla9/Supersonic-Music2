# Supersonic Music Backend - ViTune Style

Lightweight backend for the Supersonic Music app. Uses Invidious/Piped APIs for audio URL extraction - **no streaming, no yt-dlp, no FFmpeg**.

## 🎯 ViTune Architecture

This backend follows the ViTune pattern:
1. **Frontend** requests `/search` or `/trending`
2. **Frontend** requests `/extract/:videoId` to get direct audio URL
3. **Frontend** plays audio directly via `<audio src="URL" />`

**NO backend streaming. NO piping. NO long-running connections.**

---

## 🚀 Quick Start

```bash
# Install dependencies (only express and cors!)
npm install

# Start the server
npm start

# Or with auto-reload
npm run dev
```

---

## 🔧 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port | `3001` |
| `YT_KEY` | Yes | YouTube Data API Key | `AIza...` |
| `ALLOWED_ORIGINS` | No | CORS origins | `https://your-app.com` |

---

## 📦 API Endpoints

### Audio Extraction (ViTune Style)
- `GET /extract/:videoId` - **Returns direct audio URL for frontend playback**
  ```json
  {
    "url": "https://...",
    "format": "m4a",
    "bitrate": 128,
    "source": "invidious.fdn.fr"
  }
  ```

### Discovery
- `GET /search?q=query` - Search videos
- `GET /search/suggestions?q=query` - Autocomplete
- `GET /trending` - Trending music
- `GET /home` - Home feed
- `GET /explore` - Explore page

### Content
- `GET /video/:videoId` - Video details
- `GET /artist/:channelId` - Artist info
- `GET /autoplay/:videoId` - Smart autoplay queue
- `GET /related/:videoId` - Related videos

### User Data
- `GET /history` - Play history
- `POST /history` - Add to history
- `GET /favorites` - Liked songs
- `POST /favorites/toggle` - Like/unlike
- `GET /playlists` - User playlists

---

## ☁️ Deployment

### Railway / Render / Fly.io

Simply push to a Git repo and deploy - no special configuration needed!

**No Docker required.** Just Node.js 18+.

```bash
# Build command (optional)
npm install

# Start command
npm start
```

### Why This Works Better

| Before (Broken) | After (ViTune Style) |
|-----------------|----------------------|
| ❌ yt-dlp - blocked/throttled | ✅ Invidious/Piped API |
| ❌ FFmpeg streaming | ✅ Direct URL extraction |
| ❌ Long-running connections | ✅ Quick JSON responses |
| ❌ CPU-intensive | ✅ Lightweight |
| ❌ 502 errors | ✅ Stable |

---

## 🏗️ Architecture

```
Frontend                    Backend                     External
   │                           │                           │
   │  GET /search?q=...        │                           │
   │──────────────────────────▶│  YouTube Data API         │
   │                           │──────────────────────────▶│
   │  [songs list]             │  [search results]         │
   │◀──────────────────────────│◀──────────────────────────│
   │                           │                           │
   │  GET /extract/:videoId    │                           │
   │──────────────────────────▶│  Invidious/Piped API      │
   │                           │──────────────────────────▶│
   │  {url, format, bitrate}   │  [audio URL]              │
   │◀──────────────────────────│◀──────────────────────────│
   │                           │                           │
   │  <audio src={url} />      │                           │
   │  (Frontend plays directly)│                           │
```

---

## ✨ Features

- **Zero Dependencies** - Only Express and CORS
- **No Streaming** - Backend never touches audio bytes
- **Fast Responses** - JSON only, no piping
- **Multiple Fallbacks** - 8+ Invidious + 4+ Piped instances
- **4-Hour Caching** - Audio URLs cached to reduce API calls
- **Works on Free Hosting** - Railway, Render, Fly.io, etc.

---

## 🔒 Security

- Never commit `.env` files
- Set `ALLOWED_ORIGINS` in production
- Use HTTPS in production

---

## 📝 What Was Removed

- ❌ `yt-dlp` / `ytdl-core` / `youtubei.js`
- ❌ `FFmpeg` / audio processing
- ❌ `fs` / file system operations
- ❌ `exec` / `spawn` / child processes
- ❌ `/stream/:videoId` route
- ❌ `/audio/:videoId` (old streaming route)
- ❌ `music_api.py` / `get_audio.py`
- ❌ `res.pipe()` / `res.write()`

---

## 🎵 Frontend Integration

```javascript
// 1. Search for songs
const { results } = await fetch('/search?q=arijit singh').then(r => r.json());

// 2. Get audio URL
const { url } = await fetch(`/extract/${results[0].id}`).then(r => r.json());

// 3. Play directly
const audio = new Audio(url);
audio.play();
```

That's it! No complex streaming logic needed.
